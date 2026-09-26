// 예전 방식으로 저장된 방을 새 구조로 옮기는 1회용 스크립트.
// - votes.<닉네임>.password(평문) → roomSecrets/<방ID> 에 해시로 이동 후 방 문서에서 삭제
// - memberUids 필드가 없으면 빈 값으로 추가 (기존 참가자는 "기존 멤버"로 다시 로그인하면 연결됨)
//
// 실행: npm run migrate:legacy -- --dry-run   (바뀔 내용만 출력)
//       npm run migrate:legacy                (실제 반영)
// 필요: .env.local 에 GOOGLE_APPLICATION_CREDENTIALS 또는 FIREBASE_SERVICE_ACCOUNT
import { adminDb } from "../api/_lib/firebaseAdmin.js";
import { hashPassword } from "../api/_lib/password.js";

const dryRun = process.argv.includes("--dry-run");

function needsMigration(room) {
  const votes = room.votes || {};
  return (
    !room.memberUids ||
    Object.values(votes).some((vote) => vote && "password" in vote)
  );
}

async function migrateRoom(doc) {
  const room = doc.data();
  const votes = room.votes || {};
  const newVotes = {};
  const secretMembers = {};

  for (const [name, vote] of Object.entries(votes)) {
    newVotes[name] = { dates: Array.isArray(vote?.dates) ? vote.dates : [] };

    if (typeof vote?.password === "string") {
      secretMembers[name] = {
        hash: await hashPassword(vote.password.trim()),
        failCount: 0,
        lockedUntil: 0,
      };
    }
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${doc.id}: 참가자 ${Object.keys(newVotes).length}명, ` +
      `비밀번호 ${Object.keys(secretMembers).length}개 이동`
  );

  if (dryRun) return;

  const batch = adminDb.batch();
  // reason: update()에 "votes" 키 하나로 넘기면 votes 전체를 교체 — 닉네임 속 "."도 안전
  batch.update(doc.ref, { votes: newVotes, memberUids: room.memberUids || {} });
  batch.set(
    adminDb.collection("roomSecrets").doc(doc.id),
    { members: secretMembers },
    { merge: true }
  );
  await batch.commit();
}

const snapshot = await adminDb.collection("rooms").get();
const targets = snapshot.docs.filter((doc) => needsMigration(doc.data()));

console.log(`전체 방 ${snapshot.size}개 중 옮길 방 ${targets.length}개`);

for (const doc of targets) {
  await migrateRoom(doc);
}

console.log(dryRun ? "dry-run 완료 (실제 변경 없음)" : "완료");
