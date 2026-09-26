import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { DELETE, planLeave } from "../_lib/roomPlans.js";
import { roomRefs } from "../_lib/rooms.js";

const MERGE = { merge: true };

// 방장이 나가면 방 삭제, 참가자가 나가면 본인만 빠짐
export default createHandler(async ({ uid, body }) => {
  const { roomId } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { roomRef, secretRef } = roomRefs(roomId);

  const deleted = await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

    const plan = planLeave({ room: roomSnap.data(), uid });

    if (plan.deleteRoom) {
      tx.delete(roomRef);
      tx.delete(secretRef);
      return true;
    }

    tx.set(roomRef, toFirestorePatch(plan.patch), MERGE);
    tx.set(secretRef, toFirestorePatch({ members: { [plan.name]: DELETE } }), MERGE);
    return false;
  });

  return { deleted };
});
