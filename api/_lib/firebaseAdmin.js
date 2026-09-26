// 서버 전용 Firebase Admin SDK. 보안 규칙을 거치지 않으므로 여기서 모든 권한을 직접 확인해야 함.
// reason: api/ 안의 "_"로 시작하는 폴더는 Vercel이 API 주소로 노출하지 않음
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  // 배포 환경: Vercel 환경변수에 서비스 계정 JSON 전체를 넣음
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    return initializeApp({ credential: cert(JSON.parse(raw)) });
  }

  // 로컬: GOOGLE_APPLICATION_CREDENTIALS=서비스계정파일경로
  return initializeApp();
}

const app = initAdminApp();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
