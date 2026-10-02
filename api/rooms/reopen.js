import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { planReopen } from "../_lib/roomPlans.js";
import { prepareRoom, roomRefs } from "../_lib/rooms.js";

const MERGE = { merge: true };

// 방장 전용: 확정 취소 → 다시 투표 가능
export default createHandler(async ({ uid, body }) => {
  const { roomId } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { roomRef, secretRef } = roomRefs(roomId);

  await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const patch = planReopen({ room, uid });

    tx.set(roomRef, toFirestorePatch(patch), MERGE);
    tx.set(secretRef, { expireAt: patch.expireAt }, MERGE);
  });

  return {};
});
