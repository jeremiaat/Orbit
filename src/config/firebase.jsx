// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-Ys3_g1GigSKFy2F_AiwvcRQD_jPcfps",
  authDomain: "orbit-flow.firebaseapp.com",
  projectId: "orbit-flow",
  storageBucket: "orbit-flow.firebasestorage.app",
  messagingSenderId: "786955140058",
  appId: "1:786955140058:web:b75658eeb1d2f4a4ad9ee3",
  measurementId: "G-Z6L21H1VLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app);
