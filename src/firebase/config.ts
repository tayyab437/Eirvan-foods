import firebaseConfig from '../../firebase-applet-config.json';

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


