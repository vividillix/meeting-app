export const ROOM_ERRORS = {
  VALIDATION: "VALIDATION",
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  DUPLICATE_NAME: "DUPLICATE_NAME",
  ROOM_FULL: "ROOM_FULL",
  NOT_HOST: "NOT_HOST",
  NOT_MEMBER: "NOT_MEMBER",
  ROOM_ID_CONFLICT: "ROOM_ID_CONFLICT",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ROOM_CLOSED: "ROOM_CLOSED",
  ROOM_NOT_CLOSED: "ROOM_NOT_CLOSED",
};

export const ROOM_ERROR_MESSAGES = {
  [ROOM_ERRORS.VALIDATION]: "입력값을 확인해 주세요",
  [ROOM_ERRORS.ROOM_NOT_FOUND]: "존재하지 않는 방이에요",
  [ROOM_ERRORS.USER_NOT_FOUND]: "이 방에 없는 닉네임이에요",
  [ROOM_ERRORS.WRONG_PASSWORD]: "비밀번호가 맞지 않아요",
  [ROOM_ERRORS.DUPLICATE_NAME]: "이미 있는 닉네임이에요",
  [ROOM_ERRORS.ROOM_FULL]: "방 인원이 가득 찼어요",
  [ROOM_ERRORS.NOT_HOST]: "방장만 할 수 있어요",
  [ROOM_ERRORS.NOT_MEMBER]: "먼저 입장해 주세요",
  [ROOM_ERRORS.ROOM_ID_CONFLICT]: "잠시 후 다시 시도해 주세요",
  [ROOM_ERRORS.TOO_MANY_ATTEMPTS]:
    "비밀번호를 여러 번 틀렸어요. 잠시 후 다시 시도해 주세요",
  [ROOM_ERRORS.UNAUTHENTICATED]: "접속 정보가 만료됐어요. 새로고침해 주세요",
  [ROOM_ERRORS.ROOM_CLOSED]: "이미 날짜가 확정된 약속이에요",
  [ROOM_ERRORS.ROOM_NOT_CLOSED]: "아직 확정되지 않은 약속이에요",
};

export function throwRoomError(code, message = ROOM_ERROR_MESSAGES[code]) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

// reason: 서비스가 던진 에러는 구체적인 메시지를 보여주고,
// Firestore·네트워크 에러(영문 메시지)는 화면별 기본 문구로 대체
export function getRoomErrorMessage(error, fallback) {
  const code = error?.code;
  if (code && ROOM_ERROR_MESSAGES[code]) {
    return error.message || ROOM_ERROR_MESSAGES[code];
  }
  return fallback;
}
