import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_ku73QmzC86CSuFWtc1dR4F4YUsX3naM",
  authDomain: "attendscan-soft-35066.firebaseapp.com",
  projectId: "attendscan-soft-35066",
  storageBucket: "attendscan-soft-35066.firebasestorage.app",
  messagingSenderId: "963184719625",
  appId: "1:963184719625:web:92e583b1c051f1072ac5d8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);