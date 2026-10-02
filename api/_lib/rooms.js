import { FieldValue } from "firebase-admin/firestore";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isLegacyRoom, toRoundShape } from "../../src/shared/roomRules.js";
import { adminDb } from "./firebaseAdmin.js";

// 방 문서는 모두가 읽지만, 비밀번호 해시는 보안 규칙으로 막힌 별도 컬렉션에 둠
export function roomRefs(roomId) {
  return {
    roomRef: adminDb.collection("rooms").doc(roomId),
    secretRef: adminDb.collection("roomSecrets").doc(roomId),
  };
}

export function secretMembersOf(secretSnap) {
  return (secretSnap.exists && secretSnap.data().members) || {};
}

/**
 * 트랜잭션에서 읽은 방을 회차 구조로 돌려줌.
 * 예전 구조면 그 자리에서 회차 구조로 옮기는 쓰기를 예약함 → 반드시 모든 읽기가 끝난 뒤 호출할 것
 * reason: 배포 후 데이터 이전 스크립트를 돌리기 전에도 서버 기능이 동작하게 함
 */
export function prepareRoom(tx, roomRef, roomSnap) {
  if (!roomSnap.exists) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const data = roomSnap.data();
  if (!isLegacyRoom(data)) return data;

  // 비밀번호가 방 문서에 그대로 있는 아주 예전 방은 이전 스크립트로만 옮김
  const hasPlainPasswords = Object.values(data.votes || {}).some((v) => v && "password" in v);
  if (hasPlainPasswords) {
    throwRoomError(ROOM_ERRORS.ROOM_ID_CONFLICT, "방 데이터를 옮기는 중이에요. 잠시 후 다시 시도해 주세요");
  }

  const room = toRoundShape(data);
  const remove = FieldValue.delete();
  tx.update(roomRef, {
    members: room.members,
    round: room.round,
    history: room.history,
    memberUids: room.memberUids,
    votes: remove,
    dates: remove,
    status: remove,
    finalDate: remove,
    closedAt: remove,
  });
  return room;
}
