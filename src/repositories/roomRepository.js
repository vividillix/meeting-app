import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  runTransaction,
  FieldPath,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION = "rooms";

function roomRef(roomId) {
  return doc(db, COLLECTION, roomId);
}

// reason: 닉네임을 "votes.닉네임" 문자열 경로로 쓰면 닉네임 속 "."이
// 하위 필드 구분자로 해석됨 — FieldPath로 경로 조각을 그대로 전달
function toUpdateArgs(updates) {
  return updates.flatMap(([path, value]) => [new FieldPath(...path), value]);
}

// 같은 ID의 방이 이미 있으면 덮어쓰지 않고 false 반환
export async function createRoomIfAbsent(roomId, data) {
  const ref = roomRef(roomId);

  try {
    const created = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      tx.set(ref, data);
      return true;
    });
    console.log("[firebase] createRoomIfAbsent ok", { roomId, created });
    return created;
  } catch (error) {
    console.log("[firebase] createRoomIfAbsent error", { roomId, error });
    throw error;
  }
}

export async function fetchRoom(roomId) {
  try {
    const snap = await getDoc(roomRef(roomId));
    const result = {
      exists: snap.exists(),
      data: snap.exists() ? snap.data() : null,
    };
    console.log("[firebase] fetchRoom ok", { roomId, ...result });
    return result;
  } catch (error) {
    console.log("[firebase] fetchRoom error", { roomId, error });
    throw error;
  }
}

/**
 * 방 문서를 읽고 쓰는 과정을 하나의 트랜잭션으로 묶음.
 * decide({ exists, data })는 { updates: [[경로배열, 값], ...], result }를 반환하거나
 * 에러를 던짐. 충돌 시 Firestore가 decide를 다시 호출하므로 부수효과 없이 작성할 것.
 */
export async function runRoomTransaction(roomId, decide) {
  const ref = roomRef(roomId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const exists = snap.exists();
      const { updates = [], result } =
        decide({ exists, data: exists ? snap.data() : null }) ?? {};

      if (updates.length > 0) {
        const [firstField, firstValue, ...rest] = toUpdateArgs(updates);
        tx.update(ref, firstField, firstValue, ...rest);
      }

      return result;
    });
    console.log("[firebase] runRoomTransaction ok", { roomId });
    return result;
  } catch (error) {
    console.log("[firebase] runRoomTransaction error", { roomId, error });
    throw error;
  }
}

export function subscribeRoom(roomId, onData, onMissing, onError) {
  return onSnapshot(
    roomRef(roomId),
    (snap) => {
      if (!snap.exists()) {
        console.log("[firebase] subscribeRoom ok", { roomId, exists: false });
        onMissing?.();
        return;
      }

      const data = snap.data();
      console.log("[firebase] subscribeRoom ok", { roomId, exists: true, data });
      onData(data);
    },
    (error) => {
      console.log("[firebase] subscribeRoom error", { roomId, error });
      onError?.(error);
    }
  );
}

export async function setVoteDates(roomId, nickname, dates) {
  try {
    await updateDoc(roomRef(roomId), new FieldPath("votes", nickname, "dates"), dates);
    console.log("[firebase] setVoteDates ok", { roomId, nickname, dates });
  } catch (error) {
    console.log("[firebase] setVoteDates error", { roomId, nickname, error });
    throw error;
  }
}

export async function deleteRoom(roomId) {
  try {
    await deleteDoc(roomRef(roomId));
    console.log("[firebase] deleteRoom ok", { roomId });
  } catch (error) {
    console.log("[firebase] deleteRoom error", { roomId, error });
    throw error;
  }
}

export async function removeVoteField(roomId, nickname) {
  try {
    await updateDoc(roomRef(roomId), new FieldPath("votes", nickname), deleteField());
    console.log("[firebase] removeVoteField ok", { roomId, nickname });
  } catch (error) {
    console.log("[firebase] removeVoteField error", { roomId, nickname, error });
    throw error;
  }
}
