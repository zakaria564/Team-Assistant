// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAn0kjbMnNAUEHGUiupw6mBOCSpIgv-hw8",
  authDomain: "team-assistant-52ac9.firebaseapp.com",
  projectId: "team-assistant-52ac9",
  storageBucket: "team-assistant-52ac9.firebasestorage.app",
  messagingSenderId: "32577246287",
  appId: "1:32577246287:web:e4938d793f8ab2c7eac63a"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
