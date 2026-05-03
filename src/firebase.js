import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// Firebase Configuration - User must fill these values
const firebaseConfig = {
  apiKey: "AIzaSyBaI_A5QJPZKhki0D_-2tBBKHCvoQSeMOs",
  authDomain: "personalpro-9a3bb.firebaseapp.com",
  projectId: "personalpro-9a3bb",
  storageBucket: "personalpro-9a3bb.firebasestorage.app",
  messagingSenderId: "978383149701",
  appId: "1:978383149701:web:25d0673a4b0760b598e7ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Optional: Uncomment to use Firebase Emulator Suite for development
// const USE_EMULATOR = import.meta.env.DEV;
// if (USE_EMULATOR) {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099');
//   } catch (e) {
//     // Emulator already running
//   }
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//   } catch (e) {
//     // Emulator already running
//   }
// }

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  // Firestore
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};
