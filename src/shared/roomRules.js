// 브라우저(빠른 안내용)와 서버 api/(최종 판단)가 함께 쓰는 방 규칙.
// reason: 서버(Node)에서도 import하므로 상대 경로에 .js 확장자를 꼭 붙일 것
//
// 방 문서 구조 (회차형)
//   title, maxPeople, hostId, memberUids, expireAt
//   members: { 닉네임: { joinedAt } }                        참가자 명단
//   round:   { no, title, dates, votes, status, finalDate }   진행 중 회차
//   history: [ { no, title, finalDate } ]                     지난 회차 확정일
import {
  MAX_DATE_RANGE_DAYS,
  MAX_PEOPLE,
  NICKNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  ROUND_TITLE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "../constants/limits.js";
import { ROOM_ERRORS, throwRoomError } from "../constants/roomErrors.js";
import { countDays, isValidDateStr } from "../utils/date.js";

const hasOwn = (obj, key) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

export function isValidRoomId(roomId) {
  return typeof roomId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(roomId);
}

/* ---------- 예전 구조 → 회차 구조 ---------- */

// 회차 구조로 바뀌기 전의 방인지 (votes·dates가 방 바로 아래에 있음)
export function isLegacyRoom(room) {
  return !!room && !room.round;
}

/**
 * 예전 구조의 방을 회차 구조로 바꾼 모습 (비밀번호는 포함하지 않음).
 * reason: 배포 직후 데이터 이전 전까지도 화면·서버가 같은 구조로 다룰 수 있게 함
 */
export function toRoundShape(room) {
  if (!isLegacyRoom(room)) return room;

  const votes = {};
  const members = {};
  Object.entries(room.votes || {}).forEach(([name, vote]) => {
    votes[name] = { dates: Array.isArray(vote?.dates) ? vote.dates : [] };
    members[name] = { joinedAt: room.createdAt ?? null };
  });

  const round = {
    no: 1,
    title: null,
    dates: room.dates || [],
    votes,
    status: room.status === "closed" ? "closed" : "open",
  };
  if (room.status === "closed" && room.finalDate) round.finalDate = room.finalDate;

  // 예전 필드(votes·dates·status·finalDate·closedAt)는 빼고 새 구조로
  // eslint-disable-next-line no-unused-vars
  const { votes: _v, dates: _d, status: _s, finalDate: _f, closedAt: _c, ...rest } = room;
  return { ...rest, members, round, history: [], memberUids: room.memberUids || {} };
}

/* ---------- 읽기 도우미 ---------- */

export function memberNames(room) {
  return Object.keys(room?.members || {});
}

export function hasMember(room, name) {
  return hasOwn(room?.members, name);
}

export function memberCount(room) {
  return memberNames(room).length;
}

export function roundDates(room) {
  return room?.round?.dates || [];
}

export function roundVotes(room) {
  return room?.round?.votes || {};
}

// 날짜가 확정돼서 이번 회차 투표가 끝났는지
export function isClosed(room) {
  return room?.round?.status === "closed";
}

export function finalDateOf(room) {
  return isClosed(room) ? room.round.finalDate ?? null : null;
}

// 회차 제목: 입력 안 했으면 "N회차"
export function roundLabel(round) {
  const custom = typeof round?.title === "string" ? round.title.trim() : "";
  return custom || `${round?.no ?? 1}회차`;
}

// 이 브라우저(uid)가 방에서 쓰는 닉네임. 참가자가 아니면 null
export function getMemberName(room, uid) {
  if (!uid || !hasOwn(room?.memberUids, uid)) return null;
  const name = room.memberUids[uid];
  return hasMember(room, name) ? name : null;
}

/* ---------- 입력 검사 ---------- */

export function validateCredentials(name, password) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanPw = typeof password === "string" ? password.trim() : "";

  if (!cleanName || !cleanPw) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "닉네임과 비밀번호를 입력해 주세요");
  }

  if (cleanName.length > NICKNAME_MAX_LENGTH) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요`
    );
  }

  if (cleanPw.length > PASSWORD_MAX_LENGTH) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요`
    );
  }

  // reason: Firestore는 "__이름__" 형태의 필드명을 예약어로 막아둠
  if (/^__.*__$/.test(cleanName)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "사용할 수 없는 닉네임이에요");
  }

  return { cleanName, cleanPw };
}

export function validateDateRange(start, end) {
  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "시작일과 종료일을 선택해 주세요");
  }

  const days = countDays(start, end);

  if (days < 1) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "종료일이 시작일보다 빨라요");
  }

  if (days > MAX_DATE_RANGE_DAYS) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `날짜 범위는 최대 ${MAX_DATE_RANGE_DAYS}일까지 선택할 수 있어요`
    );
  }
}

// 회차 제목: 비우면 null(= "N회차"로 표시)
export function validateRoundTitle(title) {
  const clean = typeof title === "string" ? title.trim() : "";
  if (clean.length > ROUND_TITLE_MAX_LENGTH) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `회차 제목은 ${ROUND_TITLE_MAX_LENGTH}자 이하로 입력해 주세요`
    );
  }
  return clean || null;
}

// 방 입력값을 검사하고 정리된 제목을 반환
export function validateRoomInput({ title, start, end, maxPeople }) {
  const cleanTitle = typeof title === "string" ? title.trim() : "";

  if (!cleanTitle) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "제목을 입력해 주세요");
  }

  if (cleanTitle.length > TITLE_MAX_LENGTH) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `제목은 ${TITLE_MAX_LENGTH}자 이하로 입력해 주세요`
    );
  }

  if (!Number.isInteger(maxPeople) || maxPeople < 1 || maxPeople > MAX_PEOPLE) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `최대 인원은 1명부터 ${MAX_PEOPLE}명까지 정할 수 있어요`
    );
  }

  validateDateRange(start, end);

  return cleanTitle;
}

export function assertCanJoinAsNew(room, name) {
  if (hasMember(room, name)) {
    throwRoomError(ROOM_ERRORS.DUPLICATE_NAME);
  }

  if (memberCount(room) >= room.maxPeople) {
    throwRoomError(ROOM_ERRORS.ROOM_FULL);
  }
}

/**
 * 새 기간에 없는 날짜를 각 참가자 투표에서 뺌.
 * 반환: { trimmed: { 닉네임: 남은날짜[] } (바뀐 사람만), removedCount, affected: [닉네임] }
 */
export function trimVotesToDates(votes = {}, dates = []) {
  const allowed = new Set(dates);
  const trimmed = {};
  const affected = [];
  let removedCount = 0;

  Object.entries(votes).forEach(([name, vote]) => {
    const before = Array.isArray(vote?.dates) ? vote.dates : [];
    const after = before.filter((date) => allowed.has(date));
    if (after.length !== before.length) {
      trimmed[name] = after;
      affected.push(name);
      removedCount += before.length - after.length;
    }
  });

  return { trimmed, removedCount, affected };
}

/**
 * 방 설정 입력 검사 (방 제목·회차 제목·기간·최대 인원).
 * 반환: { cleanTitle, cleanRoundTitle }
 */
export function validateRoomSettings(room, input) {
  const cleanTitle = validateRoomInput(input);
  const cleanRoundTitle = validateRoundTitle(input.roundTitle);
  const count = memberCount(room);

  if (input.maxPeople < count) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `최대 인원은 지금 참가자 수(${count}명)보다 적게 줄일 수 없어요`
    );
  }

  return { cleanTitle, cleanRoundTitle };
}
