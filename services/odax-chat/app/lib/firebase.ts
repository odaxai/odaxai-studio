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
  apiKey: 'AIzaSyAGmRBSheqwK5MGsY-u_ZE4FDDOCresNZI',
  authDomain: 'odaxai-cloud.firebaseapp.com',
  projectId: 'odaxai-cloud',
  storageBucket: 'odaxai-cloud.firebasestorage.app',
  messagingSenderId: '233322477778',
  appId: '1:233322477778:web:56687bec85a7b8eeb7150b',
  measurementId: 'G-T4QCK6MHVC',
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
