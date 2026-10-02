import { doc, getDoc, onSnapshot, updateDoc, FieldPath } from "firebase/firestore";
import { ensureUser } from "../lib/auth";
import { db } from "../lib/firebase";
import { toRoundShape } from "../shared/roomRules";

// 브라우저는 방을 읽고 "내 투표"만 직접 저장함.
// 방 생성·입장·강퇴·나가기는 비밀번호와 권한 확인이 필요해서 서버(api/)가 처리.

const COLLECTION = "rooms";

function roomRef(roomId) {
  return doc(db, COLLECTION, roomId);
}

export async function fetchRoom(roomId) {
  // reason: 보안 규칙이 로그인한 사용자만 읽도록 허용하므로 먼저 익명 로그인
  await ensureUser();
  const snap = await getDoc(roomRef(roomId));

  return {
    exists: snap.exists(),
    // reason: 데이터 이전 전의 예전 구조 방도 회차 구조로 바꿔서 화면에 넘김
    data: snap.exists() ? toRoundShape(snap.data()) : null,
  };
}

export function subscribeRoom(roomId, onData, onMissing, onError) {
  let unsubscribe = () => {};
  let cancelled = false;

  ensureUser()
    .then(() => {
      if (cancelled) return;

      unsubscribe = onSnapshot(
        roomRef(roomId),
        (snap) => {
          if (!snap.exists()) {
            onMissing?.();
            return;
          }
          onData(toRoundShape(snap.data()));
        },
        (error) => {
          console.error("[firebase] subscribeRoom error", { roomId, error });
          onError?.(error);
        }
      );
    })
    .catch((error) => {
      console.error("[firebase] sign-in error", error);
      onError?.(error);
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

// reason: 닉네임에 "."이 있어도 하위 필드로 해석되지 않게 FieldPath 사용
export async function setVoteDates(roomId, nickname, dates) {
  await updateDoc(roomRef(roomId), new FieldPath("round", "votes", nickname, "dates"), dates);
}
