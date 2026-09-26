import { FieldValue } from "firebase-admin/firestore";
import { ROOM_ERRORS, throwRoomError } from "../../src/constants/roomErrors.js";
import { validateCredentials, validateRoomInput } from "../../src/shared/roomRules.js";
import { adminDb } from "../_lib/firebaseAdmin.js";
import { createHandler } from "../_lib/handler.js";
import { hashPassword } from "../_lib/password.js";
import { buildNewRoom, generateRoomId, newSecretEntry } from "../_lib/roomPlans.js";
import { roomRefs } from "../_lib/rooms.js";

const MAX_ATTEMPTS = 5;
const ALREADY_EXISTS = 6; // gRPC status code

export default createHandler(async ({ uid, body }) => {
  const { start, end, maxPeople } = body;
  const title = validateRoomInput({ title: body.title, start, end, maxPeople });
  const { cleanName, cleanPw } = validateCredentials(body.name, body.password);
  const hash = await hashPassword(cleanPw);

  const room = {
    ...buildNewRoom({ title, start, end, maxPeople, name: cleanName, uid }),
    createdAt: FieldValue.serverTimestamp(),
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const roomId = generateRoomId();
    const { roomRef, secretRef } = roomRefs(roomId);
    const batch = adminDb.batch();

    // create()는 문서가 이미 있으면 실패 → 기존 방을 덮어쓰지 않음
    batch.create(roomRef, room);
    batch.create(secretRef, { members: { [cleanName]: newSecretEntry(hash) } });

    try {
      await batch.commit();
      return { roomId };
    } catch (error) {
      if (error?.code === ALREADY_EXISTS) continue;
      throw error;
    }
  }

  return throwRoomError(ROOM_ERRORS.ROOM_ID_CONFLICT);
});
