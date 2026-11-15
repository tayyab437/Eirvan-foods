import baseFirebaseConfig from '../../firebase-applet-config.json';

const PRODUCTION_FIRESTORE_DB_ID = 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc';

const env = (import.meta as any)?.env || {};
const appEnv = String(env.VITE_APP_ENV || '').trim().toLowerCase();

const firebaseConfig = {
  ...baseFirebaseConfig,
  projectId: env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || baseFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || baseFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseFirebaseConfig.messagingSenderId,
  firestoreDatabaseId: env.VITE_FIRESTORE_DATABASE_ID || baseFirebaseConfig.firestoreDatabaseId,
};

if (
  appEnv === 'staging' &&
  (!firebaseConfig.firestoreDatabaseId ||
    firebaseConfig.firestoreDatabaseId === PRODUCTION_FIRESTORE_DB_ID ||
    firebaseConfig.firestoreDatabaseId.startsWith('REPLACE_WITH_'))
) {
  throw new Error(
    'Staging isolation guard: VITE_FIRESTORE_DATABASE_ID must point to an isolated non-production Firestore database.'
  );
}

// Shared app instance (initialized lazily)
let appInstance: any = null;

export const getFirebaseApp = async () => {
  if (!appInstance) {
    const { initializeApp } = await import('firebase/app');
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
};

// Lazy Firestore instance getter
let firestoreInstance: any = null;
export const getFirestoreDb = async () => {
  if (!firestoreInstance) {
    const app = await getFirebaseApp();
    const { initializeFirestore } = await import('firebase/firestore');
    firestoreInstance = initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  }
  return firestoreInstance;
};

// Lazy Auth instance getter
let authInstance: any = null;
export const getFirebaseAuth = async () => {
  if (!authInstance) {
    const app = await getFirebaseApp();
    const { getAuth } = await import('firebase/auth');
    authInstance = getAuth(app);
  }
  return authInstance;
};

/**
 * Safe proxies that allow the app to reference 'db' and 'auth' 
 * without triggering a synchronous load of the heavy Firebase SDKs.
 */
export const db = new Proxy({} as any, {
  get(_, prop) {
    if (!firestoreInstance) {
      throw new Error(`Accessing Firestore 'db.${String(prop)}' before initialization. Use 'getFirestoreDb()' first.`);
    }
    return firestoreInstance[prop];
  },
});

export const auth = new Proxy({} as any, {
  get(_, prop) {
    // Current user can be null, but the auth object itself must be initialized
    if (!authInstance && prop === 'currentUser') return null;
    if (!authInstance) {
      // In errors.ts we access auth.currentUser. We need to handle this gracefully.
      return null;
    }
    return authInstance[prop];
  },
});


