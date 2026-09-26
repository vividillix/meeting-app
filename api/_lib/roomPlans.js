// 서버에서 방 문서를 어떻게 바꿀지 계산하는 순수 함수들 (Firestore 호출 없음 → 테스트하기 쉬움).
// 반환하는 patch는 set(..., { merge: true })용 중첩 객체이고, DELETE 자리는 필드 삭제를 뜻함.
// reason: merge set은 객체 키를 그대로 필드명으로 써서 닉네임에 "."이 있어도 안전함
import { randomInt } from "node:crypto";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES } from "../../src/constants/limits.js";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import {
  assertCanJoinAsNew,
  getMemberName,
  hasMember,
} from "../../src/shared/roomRules.js";
import { generateDates } from "../../src/utils/date.js";

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

export function buildNewRoom({ title, start, end, maxPeople, name, uid }) {
  return {
    title,
    dates: generateDates(start, end),
    maxPeople,
    hostId: name,
    votes: { [name]: { dates: [] } },
    memberUids: { [uid]: name },
  };
}

export function newSecretEntry(hash) {
  return { hash, failCount: 0, lockedUntil: 0 };
}

// reason: 중복 여부는 방 문서(votes) 기준. 강퇴·나가기 때 비밀번호도 같이 지우므로
// 방에 없는 이름의 비밀번호 정보는 새 가입 시 덮어써도 됨
export function planJoinNew({ room, name, uid }) {
  assertCanJoinAsNew(room, name);

  const patch = {
    votes: { [name]: { dates: [] } },
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

  return { memberUids: { [uid]: name } };
}

// 참가자 한 명을 방에서 빼는 patch (투표 기록 + 그 이름으로 로그인한 모든 기기)
export function planRemoveMember(room, name) {
  const memberUids = {};

  Object.entries(room.memberUids || {}).forEach(([uid, memberName]) => {
    if (memberName === name) memberUids[uid] = DELETE;
  });

  const patch = { votes: { [name]: DELETE } };
  if (Object.keys(memberUids).length > 0) patch.memberUids = memberUids;

  return patch;
}

export function resolveCaller(room, uid) {
  const name = getMemberName(room, uid);
  if (!name) throwRoomError(ROOM_ERRORS.NOT_MEMBER);
  return name;
}

export function planKick({ room, uid, target }) {
  const caller = resolveCaller(room, uid);

  if (caller !== room.hostId) {
    throwRoomError(ROOM_ERRORS.NOT_HOST);
  }

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
