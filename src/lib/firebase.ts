// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAn0kjbMnNAUEHGUiupw6mBOCSpIgv-hw8",
  authDomain: "team-assistant-52ac9.firebaseapp.com",
  projectId: "team-assistant-52ac9",
  storageBucket: "team-assistant-52ac9.appspot.com",
  messagingSenderId: "32577246287",
  appId: "1:32577246287:web:02163edb2d611992eac63a"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
