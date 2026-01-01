import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: 'odaxai-cloud',
        clientEmail:
          'firebase-adminsdk-fbsvc@odaxai-cloud.iam.gserviceaccount.com',
        // Replace literal \n with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined,
      }),
    });
    console.log('🔥 Firebase Admin Initialized');
  } catch (error: any) {
    console.error('❌ Firebase Admin Init Error:', error);
    // Don't swallow error, let it bubble so we see it in 500 response
    throw error;
  }
}

export const adminDb = admin.firestore();
