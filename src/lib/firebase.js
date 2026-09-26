import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// reason: 웹 앱의 Firebase 설정값은 공개돼도 되는 값 — 실제 보호는 보안 규칙(firestore.rules)과 서버(api/)가 담당
const firebaseConfig = {
  apiKey: "AIzaSyByRlaQRNuBq0il0OT3cd5l-0aMZv3bjGw",
  authDomain: "meeting-app-d749e.firebaseapp.com",
  projectId: "meeting-app-d749e",
  storageBucket: "meeting-app-d749e.firebasestorage.app",
  messagingSenderId: "448416067556",
  appId: "1:448416067556:web:527b5626a74d7e37b021f1",
  measurementId: "G-DT9V0H3F5F",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
