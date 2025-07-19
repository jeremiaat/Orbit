// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIbAPP7rXx25_tJcpM2pIo0lal7aBqS1c",
  authDomain: "social-manager-c279d.firebaseapp.com",
  projectId: "social-manager-c279d",
  storageBucket: "social-manager-c279d.firebasestorage.app",
  messagingSenderId: "739422039728",
  appId: "1:739422039728:web:96208f7c4eec28e9c55575",
  measurementId: "G-CZQWKPG84B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
