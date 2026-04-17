// src/firebase.js
// Firebase initialization - only initializes if credentials exist

import { initializeApp, getApps, getApp } from "firebase/app";
import { logger } from "./lib/logger";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Check if Firebase is configured
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isConfigured = !!apiKey;

// Check if we're in a native Capacitor environment
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

// Only initialize if we have credentials
let app = null;
let auth = null;
let db = null;
let storage = null;
let functions = null;

if (isConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Initialize Firebase app (only once)
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Use appropriate auth persistence based on platform
  try {
    if (isNative) {
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence]
      });
    } else {
      auth = getAuth(app);
    }
  } catch (e) {
    auth = getAuth(app);
  }

  // Initialize Firestore
  try {
    if (isNative) {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      db = getFirestore(app);
    }
  } catch (e) {
    db = getFirestore(app);
  }

  storage = getStorage(app);
  functions = getFunctions(app);

  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      logger.log("Firebase emulators connected");
    } catch (e) {
      logger.warn("Failed to connect Firebase emulators:", e);
    }
  }
} else {
  logger.log("Firebase not configured - running in demo mode");
}

export { app, auth, db, storage, functions };
export const IS_NATIVE = isNative;
export const firebaseConfigured = isConfigured;
