// 예전 구조의 방을 최신 구조(회차형)로 옮기는 스크립트. 여러 번 돌려도 안전함.
// - 아주 예전 방: votes.<닉네임>.password(평문) → roomSecrets/<방ID> 에 해시로 이동
// - votes·dates·status·finalDate → members + round(1회차) + history 로 변환
// - 자동 삭제 시각(expireAt)이 없으면 채움 (확정일 또는 마지막 날짜 + 3개월)
//
// 실행: npm run migrate:legacy -- --dry-run   (바뀔 내용만 출력)
//       npm run migrate:legacy                (실제 반영)
// 필요: .env.local 에 GOOGLE_APPLICATION_CREDENTIALS 또는 FIREBASE_SERVICE_ACCOUNT
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../api/_lib/firebaseAdmin.js";
import { hashPassword } from "../api/_lib/password.js";
import { expireAtFor } from "../api/_lib/roomPlans.js";
import { isLegacyRoom, toRoundShape } from "../src/shared/roomRules.js";

const dryRun = process.argv.includes("--dry-run");

function expireBase(room) {
  const round = room.round;
  if (round?.status === "closed" && round.finalDate) return round.finalDate;
  const dates = round?.dates || [];
  return dates[dates.length - 1] ?? null;
}

async function migrateRoom(doc) {
  const original = doc.data();
  const legacy = isLegacyRoom(original);
  const room = toRoundShape(original);

  // 평문 비밀번호 → 해시
  const secretMembers = {};
  for (const [name, vote] of Object.entries(original.votes || {})) {
    if (typeof vote?.password === "string") {
      secretMembers[name] = {
        hash: await hashPassword(vote.password.trim()),
        failCount: 0,
        lockedUntil: 0,
      };
    }
  }

  const base = expireBase(room);
  const needsExpire = !original.expireAt && base;
  if (!legacy && !needsExpire && Object.keys(secretMembers).length === 0) return false;

  console.log(
    `${dryRun ? "[dry-run] " : ""}${doc.id}: ` +
      [
        legacy && `회차 구조로 변환(참가자 ${Object.keys(room.members).length}명)`,
        Object.keys(secretMembers).length && `비밀번호 ${Object.keys(secretMembers).length}개 해시로 이동`,
        needsExpire && `자동 삭제 ${base} + 3개월`,
      ]
        .filter(Boolean)
        .join(", ")
  );

  if (dryRun) return true;

  const update = {};
  if (legacy) {
    const remove = FieldValue.delete();
    Object.assign(update, {
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
  }
  const expireAt = needsExpire ? expireAtFor(base) : null;
  if (expireAt) update.expireAt = expireAt;

  const batch = adminDb.batch();
  if (Object.keys(update).length > 0) batch.update(doc.ref, update);

  const secretUpdate = {};
  if (Object.keys(secretMembers).length > 0) secretUpdate.members = secretMembers;
  if (expireAt) secretUpdate.expireAt = expireAt;
  if (Object.keys(secretUpdate).length > 0) {
    batch.set(adminDb.collection("roomSecrets").doc(doc.id), secretUpdate, { merge: true });
  }

  await batch.commit();
  return true;
}

const snapshot = await adminDb.collection("rooms").get();
let changed = 0;

for (const doc of snapshot.docs) {
  if (await migrateRoom(doc)) changed += 1;
}

console.log(`전체 방 ${snapshot.size}개 중 ${changed}개 ${dryRun ? "변경 예정 (dry-run, 실제 변경 없음)" : "변경 완료"}`);
