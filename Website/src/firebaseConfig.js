// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBF2wGjMcwagnvjLw6x8pOsvLJqA6F3r0Q",
  authDomain: "finger-attendance--esp-32-default.firebaseapp.com",
  databaseURL: "https://finger-attendance--esp-32-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "finger-attendance--esp-32-default",
  storageBucket: "finger-attendance--esp-32-default.appspot.com",
  messagingSenderId: "1023456789", // Placeholder sender ID is fine for RTDB
  appId: "1:1023456789:web:1234567890abcdef" // Placeholder app ID is fine for RTDB
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
