import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { isValidRoomId, validateCredentials } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler, toFirestorePatch } from "../_lib/handler.js";
import { hashPassword, verifyPassword } from "../_lib/password.js";
import {
  failureState,
  isLocked,
  newSecretEntry,
  planJoinNew,
  planLogin,
} from "../_lib/roomPlans.js";
import { prepareRoom, roomRefs, secretMembersOf } from "../_lib/rooms.js";

const MERGE = { merge: true };

async function joinAsNew({ roomId, name, password, uid }) {
  const { roomRef, secretRef } = roomRefs(roomId);
  const hash = await hashPassword(password);

  // reason: 읽기와 쓰기를 트랜잭션으로 묶어 동시 입장 시 닉네임 중복·인원 초과를 막음
  await adminDb.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const patch = planJoinNew({ room, name, uid });

    tx.set(roomRef, toFirestorePatch(patch), MERGE);
    tx.set(secretRef, { members: { [name]: newSecretEntry(hash) } }, MERGE);
  });
}

async function loginExisting({ roomId, name, password, uid }) {
  const { roomRef, secretRef } = roomRefs(roomId);

  const outcome = await adminDb.runTransaction(async (tx) => {
    const [roomSnap, secretSnap] = await tx.getAll(roomRef, secretRef);
    const room = prepareRoom(tx, roomRef, roomSnap);

    const patch = planLogin({ room, name, uid });

    const members = secretMembersOf(secretSnap);
    const entry = Object.prototype.hasOwnProperty.call(members, name) ? members[name] : null;
    if (!entry) throwRoomError(ROOM_ERRORS.USER_NOT_FOUND);

    const now = Date.now();
    if (isLocked(entry, now)) throwRoomError(ROOM_ERRORS.TOO_MANY_ATTEMPTS);

    if (!(await verifyPassword(password, entry.hash))) {
      const { failCount, lockedUntil, locked } = failureState(entry, now);
      tx.set(secretRef, { members: { [name]: { failCount, lockedUntil } } }, MERGE);
      // reason: 트랜잭션 안에서 에러를 던지면 실패 횟수 기록도 취소되므로 결과만 반환
      return { ok: false, locked };
    }

    tx.set(secretRef, { members: { [name]: { failCount: 0, lockedUntil: 0 } } }, MERGE);
    tx.set(roomRef, toFirestorePatch(patch), MERGE);
    return { ok: true };
  });

  if (!outcome.ok) {
    throwRoomError(
      outcome.locked ? ROOM_ERRORS.TOO_MANY_ATTEMPTS : ROOM_ERRORS.WRONG_PASSWORD
    );
  }
}

export default createHandler(async ({ uid, body }) => {
  const { roomId, mode } = body;
  if (!isValidRoomId(roomId)) throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);

  const { cleanName, cleanPw } = validateCredentials(body.name, body.password);
  const args = { roomId, name: cleanName, password: cleanPw, uid };

  if (mode === "existing") {
    await loginExisting(args);
  } else {
    await joinAsNew(args);
  }

  return { name: cleanName };
});
