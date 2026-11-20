import baseFirebaseConfig from '../../firebase-applet-config.json';

const PRODUCTION_FIREBASE_PROJECT_ID = 'gen-lang-client-0351129330';
const PRODUCTION_FIRESTORE_DB_ID = 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc';

const env = (import.meta as any)?.env || {};
const appEnv = String(env.VITE_APP_ENV || '').trim().toLowerCase();
const isStaging = appEnv === 'staging';

const firebaseConfig = {
  ...baseFirebaseConfig,
  projectId: isStaging ? String(env.VITE_FIREBASE_PROJECT_ID || '').trim() : (env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId),
  appId: isStaging ? String(env.VITE_FIREBASE_APP_ID || '').trim() : (env.VITE_FIREBASE_APP_ID || baseFirebaseConfig.appId),
  apiKey: isStaging ? String(env.VITE_FIREBASE_API_KEY || '').trim() : (env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey),
  authDomain: isStaging ? String(env.VITE_FIREBASE_AUTH_DOMAIN || '').trim() : (env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain),
  storageBucket: isStaging ? String(env.VITE_FIREBASE_STORAGE_BUCKET || '').trim() : (env.VITE_FIREBASE_STORAGE_BUCKET || baseFirebaseConfig.storageBucket),
  messagingSenderId: isStaging ? String(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim() : (env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseFirebaseConfig.messagingSenderId),
  firestoreDatabaseId: isStaging ? String(env.VITE_FIRESTORE_DATABASE_ID || '').trim() : (env.VITE_FIRESTORE_DATABASE_ID || baseFirebaseConfig.firestoreDatabaseId),
};

if (isStaging) {
  if (
    !firebaseConfig.projectId ||
    firebaseConfig.projectId.startsWith('REPLACE_WITH_') ||
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey.startsWith('REPLACE_WITH_') ||
    !firebaseConfig.firestoreDatabaseId ||
    firebaseConfig.firestoreDatabaseId === PRODUCTION_FIRESTORE_DB_ID ||
    firebaseConfig.firestoreDatabaseId.startsWith('REPLACE_WITH_') ||
    (firebaseConfig.projectId === PRODUCTION_FIREBASE_PROJECT_ID &&
      firebaseConfig.firestoreDatabaseId === PRODUCTION_FIRESTORE_DB_ID)
  ) {
    throw new Error(
      'Staging isolation guard: VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, and VITE_FIRESTORE_DATABASE_ID must reference an isolated non-production Firebase staging environment.'
    );
  }
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


