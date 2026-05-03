// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // 👈 이거 빠진 상태
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByRlaQRNuBq0il0OT3cd5l-0aMZv3bjGw",
  authDomain: "meeting-app-d749e.firebaseapp.com",
  projectId: "meeting-app-d749e",
  storageBucket: "meeting-app-d749e.firebasestorage.app",
  messagingSenderId: "448416067556",
  appId: "1:448416067556:web:527b5626a74d7e37b021f1",
  measurementId: "G-DT9V0H3F5F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);