import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler } from "../_lib/handler.js";
import { planOpenNextRound } from "../_lib/roomPlans.js";
import { prepareRoom, roomRefs } from "../_lib/rooms.js";

// 방장 전용: 확정된 회차를 기록으로 남기고 다음 회차 열기
export default createHandler(async ({ uid, body }) => {
  const { roomId, start, end, title } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { roomRef, secretRef } = roomRefs(roomId);

  const no = await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const next = planOpenNextRound({ room, uid, start, end, title });

    // reason: update()는 round·history 필드를 통째로 교체 → 지난 회차의 투표·확정 정보가 남지 않음
    tx.update(roomRef, next);
    tx.set(secretRef, { expireAt: next.expireAt }, { merge: true });
    return next.round.no;
  });

  return { no };
});
