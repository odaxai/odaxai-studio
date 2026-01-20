// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import * as admin from 'firebase-admin';

let initialized = false;

function getAdminApp(): admin.app.App {
  if (initialized && admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY env vars');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  initialized = true;
  return admin.apps[0]!;
}

export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getAdminDb() as any)[prop];
  },
});
