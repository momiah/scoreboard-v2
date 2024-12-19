// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtoCKYUPTsLSD-nDanaC8IW31mmD6oFaw",
  authDomain: "scoreboard-app-29148.firebaseapp.com",
  projectId: "scoreboard-app-29148",
  storageBucket: "scoreboard-app-29148.appspot.com",
  messagingSenderId: "215867687150",
  appId: "1:215867687150:web:3d1e74d64eeb261f2133ff",
  measurementId: "G-07ESZ7RQKZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
 const db = getFirestore(app);

export { auth, db };
