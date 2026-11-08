import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Lazy Auth instance getter to prevent render-blocking auth/iframe.js network chains on initial page load
let authInstance: ReturnType<typeof getAuth> | null = null;
export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
};
export const auth = getFirebaseAuth();
