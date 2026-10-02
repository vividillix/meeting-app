import { FieldValue } from "firebase-admin/firestore";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { planFinalize } from "../_lib/roomPlans.js";
import { prepareRoom, roomRefs } from "../_lib/rooms.js";

const MERGE = { merge: true };

// 방장 전용: 날짜 확정 → 투표 종료
export default createHandler(async ({ uid, body }) => {
  const { roomId, date } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { roomRef, secretRef } = roomRefs(roomId);

  const finalDate = await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const patch = planFinalize({ room, uid, date });

    const data = toFirestorePatch(patch);
    data.round.closedAt = FieldValue.serverTimestamp();
    tx.set(roomRef, data, MERGE);
    // reason: 비밀번호 문서도 방과 같은 시각에 자동 삭제되게 함
    tx.set(secretRef, { expireAt: patch.expireAt }, MERGE);
    return patch.round.finalDate;
  });

  return { finalDate };
});
