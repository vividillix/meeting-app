// 브라우저(빠른 안내용)와 서버 api/(최종 판단)가 함께 쓰는 방 규칙.
// reason: 서버(Node)에서도 import하므로 상대 경로에 .js 확장자를 꼭 붙일 것
import {
  MAX_DATE_RANGE_DAYS,
  MAX_PEOPLE,
  NICKNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "../constants/limits.js";
import { ROOM_ERRORS, throwRoomError } from "../constants/roomErrors.js";
import { countDays, isValidDateStr } from "../utils/date.js";

const hasOwn = (obj, key) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

export function isValidRoomId(roomId) {
  return typeof roomId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(roomId);
}

export function hasMember(room, name) {
  return hasOwn(room?.votes, name);
}

export function memberCount(room) {
  return Object.keys(room?.votes || {}).length;
}

// 이 브라우저(uid)가 방에서 쓰는 닉네임. 참가자가 아니면 null
export function getMemberName(room, uid) {
  if (!uid || !hasOwn(room?.memberUids, uid)) return null;
  const name = room.memberUids[uid];
  return hasMember(room, name) ? name : null;
}

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
