import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID and force long-polling to eliminate WebChannel timeout errors
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Lazy Auth instance getter to prevent render-blocking auth/iframe.js network chains on initial page load
let authInstance: ReturnType<typeof getAuth> | null = null;
export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
};

// Safe lazy proxy for auth object that does not instantiate getAuth(app) until accessed
export const auth = {
  get currentUser() {
    return authInstance ? authInstance.currentUser : null;
  },
};

