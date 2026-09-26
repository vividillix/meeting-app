import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { DELETE, planKick } from "../_lib/roomPlans.js";
import { roomRefs } from "../_lib/rooms.js";

const MERGE = { merge: true };

export default createHandler(async ({ uid, body }) => {
  const { roomId, target } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
  if (typeof target !== "string" || !target) throwRoomError(ROOM_ERRORS.VALIDATION);

  const { roomRef, secretRef } = roomRefs(roomId);

  await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

    // 방장인지는 요청한 기기(uid)가 방장 닉네임으로 로그인돼 있는지로 판단
    const patch = planKick({ room: roomSnap.data(), uid, target });

    tx.set(roomRef, toFirestorePatch(patch), MERGE);
    tx.set(secretRef, toFirestorePatch({ members: { [target]: DELETE } }), MERGE);
  });

  return {};
});
