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
};

export const ROOM_ERROR_MESSAGES = {
  [ROOM_ERRORS.VALIDATION]: "입력값을 확인해 주세요",
  [ROOM_ERRORS.ROOM_NOT_FOUND]: "존재하지 않는 방입니다",
  [ROOM_ERRORS.USER_NOT_FOUND]: "존재하지 않는 사용자",
  [ROOM_ERRORS.WRONG_PASSWORD]: "비밀번호 틀림",
  [ROOM_ERRORS.DUPLICATE_NAME]: "이미 존재하는 닉네임",
  [ROOM_ERRORS.ROOM_FULL]: "인원 가득",
  [ROOM_ERRORS.NOT_HOST]: "방장만 가능합니다",
  [ROOM_ERRORS.NOT_MEMBER]: "로그인 필요",
  [ROOM_ERRORS.ROOM_ID_CONFLICT]: "잠시 후 다시 시도해 주세요",
};

// reason: 서비스가 던진 에러는 구체적인 메시지를 보여주고,
// Firestore·네트워크 에러(영문 메시지)는 화면별 기본 문구로 대체
export function getRoomErrorMessage(error, fallback) {
  const code = error?.code;
  if (code && ROOM_ERROR_MESSAGES[code]) {
    return error.message || ROOM_ERROR_MESSAGES[code];
  }
  return fallback;
}
