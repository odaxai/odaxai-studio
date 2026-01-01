import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserSessionPersistence,
  Auth,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Firebase configuration for OdaxAI Cloud
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:123456',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-123456',
};

// Initialize Firebase (singleton pattern)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with Session Persistence to avoid IndexedDB crashes
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: browserSessionPersistence,
  });
} catch (e) {
  // If already initialized, use getAuth
  auth = getAuth(app);
}

// Initialize Firestore with experimentalForceLongPolling to improve reliability

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { auth, db };
export default app;
