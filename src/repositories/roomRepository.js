import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION = "rooms";

export async function createRoom(roomId, data) {
  try {
    await setDoc(doc(db, COLLECTION, roomId), data);
    console.log("[firebase] createRoom ok", { roomId, data });
  } catch (error) {
    console.log("[firebase] createRoom error", { roomId, error });
    throw error;
  }
}

export async function fetchRoom(roomId) {
  try {
    const snap = await getDoc(doc(db, COLLECTION, roomId));
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

export function subscribeRoom(roomId, onData, onMissing) {
  return onSnapshot(
    doc(db, COLLECTION, roomId),
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
    }
  );
}

export async function updateRoom(roomId, fields) {
  try {
    await updateDoc(doc(db, COLLECTION, roomId), fields);
    console.log("[firebase] updateRoom ok", { roomId, fields });
  } catch (error) {
    console.log("[firebase] updateRoom error", { roomId, fields, error });
    throw error;
  }
}

export async function deleteRoom(roomId) {
  try {
    await deleteDoc(doc(db, COLLECTION, roomId));
    console.log("[firebase] deleteRoom ok", { roomId });
  } catch (error) {
    console.log("[firebase] deleteRoom error", { roomId, error });
    throw error;
  }
}

export async function removeVoteField(roomId, nickname) {
  const fields = { [`votes.${nickname}`]: deleteField() };

  try {
    await updateDoc(doc(db, COLLECTION, roomId), fields);
    console.log("[firebase] removeVoteField ok", { roomId, nickname });
  } catch (error) {
    console.log("[firebase] removeVoteField error", { roomId, nickname, error });
    throw error;
  }
}
