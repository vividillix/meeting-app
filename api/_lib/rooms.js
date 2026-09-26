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
