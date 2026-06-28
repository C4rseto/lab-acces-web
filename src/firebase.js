import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD5M8oPVouF3PYyqE15WW5unDjeo3wLgxI",
  authDomain: "labacces-1b14d.firebaseapp.com",
  projectId: "labacces-1b14d",
  storageBucket: "labacces-1b14d.firebasestorage.app",
  messagingSenderId: "270093974855",
  appId: "1:270093974855:web:6c554a5f34a60d40f96062",
  measurementId: "G-TGQ1D85CH5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// ¡ESTAS SON LAS LÍNEAS QUE FALTABAN!
export const auth = getAuth(app);
export const db = getDatabase(app);