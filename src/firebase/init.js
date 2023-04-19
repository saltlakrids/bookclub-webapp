// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLvhC-fLxzqBZP6V8p0gCCXdNWK-lAok4",
  authDomain: "book-club-f1df5.firebaseapp.com",
  projectId: "book-club-f1df5",
  storageBucket: "book-club-f1df5.appspot.com",
  messagingSenderId: "1057855146453",
  appId: "1:1057855146453:web:0738e2084c7ae5a643d55c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// init firestore service
const db = getFirestore(app)

export {
  db,
  app
}