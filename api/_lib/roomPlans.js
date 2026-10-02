// 서버에서 방 문서를 어떻게 바꿀지 계산하는 순수 함수들 (Firestore 호출 없음 → 테스트하기 쉬움).
// 반환하는 patch는 set(..., { merge: true })용 중첩 객체이고, DELETE 자리는 필드 삭제를 뜻함.
// reason: merge set은 객체 키를 그대로 필드명으로 써서 닉네임에 "."이 있어도 안전함
// 모든 함수는 회차 구조의 방을 받음 (예전 구조는 api/_lib/rooms.js의 loadRoom이 먼저 바꿔줌)
import { randomInt } from "node:crypto";
import {
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_FAILURES,
  ROOM_RETENTION_MONTHS,
} from "../../src/constants/limits.js";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import {
  assertCanJoinAsNew,
  getMemberName,
  hasMember,
  isClosed,
  memberNames,
  trimVotesToDates,
  validateDateRange,
  validateRoomSettings,
  validateRoundTitle,
} from "../../src/shared/roomRules.js";
import { addMonths, endOfDayKst, generateDates } from "../../src/utils/date.js";

export const DELETE = Symbol("DELETE");

// 헷갈리는 글자(0/o, 1/l/i)를 뺀 소문자+숫자 10자리 ≈ 31^10 ≈ 8×10^14가지
const ROOM_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const ROOM_ID_LENGTH = 10;

export function generateRoomId() {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i += 1) {
    id += ROOM_ID_ALPHABET[randomInt(ROOM_ID_ALPHABET.length)];
  }
  return id;
}

/**
 * 방이 자동 삭제될 시각: 기준일(확정일 또는 마지막 후보 날짜) + 3개월이 끝나는 순간.
 * reason: Firestore TTL이 이 시각이 지난 문서를 지워줌 (보통 24시간 안)
 */
export function expireAtFor(dateStr) {
  return endOfDayKst(addMonths(dateStr, ROOM_RETENTION_MONTHS));
}

export function buildNewRoom({ title, start, end, maxPeople, name, uid, now = new Date() }) {
  return {
    title,
    maxPeople,
    hostId: name,
    memberUids: { [uid]: name },
    members: { [name]: { joinedAt: now } },
    round: {
      no: 1,
      title: null,
      dates: generateDates(start, end),
      votes: { [name]: { dates: [] } },
      status: "open",
    },
    history: [],
    expireAt: expireAtFor(end),
  };
}

export function newSecretEntry(hash) {
  return { hash, failCount: 0, lockedUntil: 0 };
}

// reason: 중복 여부는 참가자 명단(members) 기준. 강퇴·나가기 때 비밀번호도 같이 지우므로
// 명단에 없는 이름의 비밀번호 정보는 새 가입 시 덮어써도 됨
export function planJoinNew({ room, name, uid, now = new Date() }) {
  assertCanJoinAsNew(room, name);

  // 회차 중간에 들어와도 그 회차부터 바로 투표할 수 있게 투표 칸을 만들어 둠
  const patch = {
    members: { [name]: { joinedAt: now } },
    round: { votes: { [name]: { dates: [] } } },
    memberUids: { [uid]: name },
  };

  // 방장 없이 만들어진 예전 방은 첫 입장자가 방장이 됨
  if (!room.hostId) {
    patch.hostId = name;
  }

  return patch;
}

// 기존 멤버 로그인 시 잠금 여부 확인
export function isLocked(entry, now) {
  return (entry?.lockedUntil || 0) > now;
}

// 비밀번호를 틀렸을 때 저장할 값
export function failureState(entry, now) {
  const failCount = (entry?.failCount || 0) + 1;

  if (failCount >= LOGIN_MAX_FAILURES) {
    return { failCount: 0, lockedUntil: now + LOGIN_LOCK_MINUTES * 60 * 1000, locked: true };
  }

  return { failCount, lockedUntil: 0, locked: false };
}

export function planLogin({ room, name, uid }) {
  if (!hasMember(room, name)) {
    throwRoomError(ROOM_ERRORS.USER_NOT_FOUND);
  }

  const patch = { memberUids: { [uid]: name } };
  // reason: 투표 칸이 없는 참가자(예전 데이터)도 이번 회차에 투표할 수 있게 채워 둠
  if (!room.round?.votes?.[name]) {
    patch.round = { votes: { [name]: { dates: [] } } };
  }
  return patch;
}

// 참가자 한 명을 방에서 빼는 patch (명단 + 이번 회차 투표 + 그 이름으로 로그인한 모든 기기)
export function planRemoveMember(room, name) {
  const memberUids = {};

  Object.entries(room.memberUids || {}).forEach(([uid, memberName]) => {
    if (memberName === name) memberUids[uid] = DELETE;
  });

  const patch = {
    members: { [name]: DELETE },
    round: { votes: { [name]: DELETE } },
  };
  if (Object.keys(memberUids).length > 0) patch.memberUids = memberUids;

  return patch;
}

export function resolveCaller(room, uid) {
  const name = getMemberName(room, uid);
  if (!name) throwRoomError(ROOM_ERRORS.NOT_MEMBER);
  return name;
}

function assertHost(room, uid) {
  const caller = resolveCaller(room, uid);
  if (caller !== room.hostId) throwRoomError(ROOM_ERRORS.NOT_HOST);
  return caller;
}

export function planKick({ room, uid, target }) {
  const caller = assertHost(room, uid);

  if (target === caller) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "자기 자신은 내보낼 수 없어요");
  }

  if (!hasMember(room, target)) {
    throwRoomError(ROOM_ERRORS.USER_NOT_FOUND);
  }

  return planRemoveMember(room, target);
}

export function planLeave({ room, uid }) {
  const caller = resolveCaller(room, uid);

  if (caller === room.hostId) {
    return { deleteRoom: true, name: caller };
  }

  return { deleteRoom: false, name: caller, patch: planRemoveMember(room, caller) };
}

/**
 * 방장이 방 제목·회차 제목·기간·최대 인원을 바꿈 (진행 중 회차 기준).
 * 새 기간 밖으로 빠진 날짜는 모든 참가자의 투표에서 지움.
 */
export function planUpdateRoom({ room, uid, title, roundTitle, start, end, maxPeople }) {
  assertHost(room, uid);

  if (isClosed(room)) {
    throwRoomError(ROOM_ERRORS.ROOM_CLOSED, "확정된 약속은 바꿀 수 없어요. 확정을 취소한 뒤 바꿔 주세요");
  }

  const { cleanTitle, cleanRoundTitle } = validateRoomSettings(room, {
    title,
    roundTitle,
    start,
    end,
    maxPeople,
  });
  const dates = generateDates(start, end);
  const { trimmed, removedCount } = trimVotesToDates(room.round?.votes, dates);

  // reason: merge set에서 배열은 통째로 교체됨 → dates와 각 투표 날짜 목록을 새 값으로 덮어씀
  const round = { title: cleanRoundTitle, dates };
  const changedVotes = Object.fromEntries(
    Object.entries(trimmed).map(([name, kept]) => [name, { dates: kept }])
  );
  if (Object.keys(changedVotes).length > 0) round.votes = changedVotes;

  return {
    patch: { title: cleanTitle, maxPeople, round, expireAt: expireAtFor(end) },
    removedCount,
  };
}

// 방장이 날짜 하나를 확정 → 이번 회차 투표 종료. 아직 투표 안 한 사람이 있어도 가능
export function planFinalize({ room, uid, date }) {
  assertHost(room, uid);

  if (isClosed(room)) throwRoomError(ROOM_ERRORS.ROOM_CLOSED);

  if (typeof date !== "string" || !(room.round?.dates || []).includes(date)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "투표 기간 안의 날짜를 골라 주세요");
  }

  return {
    round: { status: "closed", finalDate: date },
    expireAt: expireAtFor(date),
  };
}

// 확정 취소 → 다시 투표 가능 (진행 중 회차만, 즉 다음 회차를 열기 전까지)
export function planReopen({ room, uid }) {
  assertHost(room, uid);

  if (!isClosed(room)) throwRoomError(ROOM_ERRORS.ROOM_NOT_CLOSED);

  const dates = room.round.dates || [];
  const lastDate = dates[dates.length - 1] ?? room.round.finalDate;

  return {
    round: { status: "open", finalDate: DELETE, closedAt: DELETE },
    expireAt: expireAtFor(lastDate),
  };
}

/**
 * 다음 회차 열기: 지금 회차를 확정한 뒤에만 가능.
 * 지금 회차의 확정일은 history에 남기고, 참가자는 그대로 두고 투표는 비운 새 회차를 시작.
 * 반환값은 update()용 — round·history 필드를 통째로 교체함
 */
export function planOpenNextRound({ room, uid, start, end, title }) {
  assertHost(room, uid);

  if (!isClosed(room)) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_CLOSED, "지금 회차의 날짜를 먼저 확정해 주세요");
  }

  validateDateRange(start, end);
  const cleanTitle = validateRoundTitle(title);
  const current = room.round;

  const votes = Object.fromEntries(memberNames(room).map((name) => [name, { dates: [] }]));

  return {
    round: {
      no: (current.no ?? 1) + 1,
      title: cleanTitle,
      dates: generateDates(start, end),
      votes,
      status: "open",
    },
    history: [
      ...(room.history || []),
      { no: current.no ?? 1, title: current.title ?? null, finalDate: current.finalDate },
    ],
    expireAt: expireAtFor(end),
  };
}
