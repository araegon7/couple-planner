import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOHiagzyWjsko1huP3OMGvaZ4JLvvX46Y",
  authDomain: "couple-planner-12dde.firebaseapp.com",
  projectId: "couple-planner-12dde",
  storageBucket: "couple-planner-12dde.firebasestorage.app",
  messagingSenderId: "375269336576",
  appId: "1:375269336576:web:5eeab697d6682c11e7dae5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);