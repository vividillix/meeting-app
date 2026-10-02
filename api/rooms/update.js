import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { planUpdateRoom } from "../_lib/roomPlans.js";
import { prepareRoom, roomRefs } from "../_lib/rooms.js";

// 방장 전용: 방 제목·회차 제목·기간·최대 인원 수정 (진행 중 회차 기준)
export default createHandler(async ({ uid, body }) => {
  const { roomId, title, roundTitle, start, end, maxPeople } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { roomRef, secretRef } = roomRefs(roomId);

  const removedCount = await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const { patch, removedCount: removed } = planUpdateRoom({
      room,
      uid,
      title,
      roundTitle,
      start,
      end,
      maxPeople,
    });

    tx.set(roomRef, toFirestorePatch(patch), { merge: true });
    tx.set(secretRef, { expireAt: patch.expireAt }, { merge: true });
    return removed;
  });

  return { removedCount };
});
