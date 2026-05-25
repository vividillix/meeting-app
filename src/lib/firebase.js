import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

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
