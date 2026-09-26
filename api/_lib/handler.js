import { FieldValue } from "firebase-admin/firestore";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { adminAuth } from "./firebaseAdmin.js";
import { DELETE } from "./roomPlans.js";

const STATUS_BY_CODE = {
  [ROOM_ERRORS.VALIDATION]: 400,
  [ROOM_ERRORS.UNAUTHENTICATED]: 401,
  [ROOM_ERRORS.WRONG_PASSWORD]: 401,
  [ROOM_ERRORS.NOT_HOST]: 403,
  [ROOM_ERRORS.NOT_MEMBER]: 403,
  [ROOM_ERRORS.ROOM_NOT_FOUND]: 404,
  [ROOM_ERRORS.USER_NOT_FOUND]: 404,
  [ROOM_ERRORS.DUPLICATE_NAME]: 409,
  [ROOM_ERRORS.ROOM_FULL]: 409,
  [ROOM_ERRORS.TOO_MANY_ATTEMPTS]: 429,
  [ROOM_ERRORS.ROOM_ID_CONFLICT]: 503,
};

async function verifyUser(req) {
  const header = req.headers?.authorization || "";
  const match = header.match(/^Bearer (.+)$/);

  if (!match) throwRoomError(ROOM_ERRORS.UNAUTHENTICATED);

  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    return decoded.uid;
  } catch {
    return throwRoomError(ROOM_ERRORS.UNAUTHENTICATED);
  }
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      throwRoomError(ROOM_ERRORS.VALIDATION);
    }
  }
  return {};
}

// roomPlans의 DELETE 표시를 Firestore 필드 삭제로 바꿈
export function toFirestorePatch(value) {
  if (value === DELETE) return FieldValue.delete();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, toFirestorePatch(inner)])
    );
  }
  return value;
}

/**
 * Vercel 서버 함수 공통 처리: POST만 허용, 로그인 토큰 확인, 에러를 JSON으로 변환.
 * action({ uid, body })의 반환값이 응답 본문이 됨.
 */
export function createHandler(action) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST만 가능해요" });
    }

    try {
      const uid = await verifyUser(req);
      const body = parseBody(req);
      const result = await action({ uid, body });
      return res.status(200).json(result ?? {});
    } catch (error) {
      const status = STATUS_BY_CODE[error?.code];
      if (status) {
        return res.status(status).json({ code: error.code, message: error.message });
      }

      console.error("[api] unexpected error", error);
      return res.status(500).json({ code: "INTERNAL", message: "서버 오류가 발생했어요" });
    }
  };
}
