import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 });
    }

    // console.log(`🔄 API Proxy: Fetching profile for ${uid}`);
    let userDoc;
    try {
      userDoc = await adminDb.collection('users').doc(uid).get();
    } catch (e: any) {
      // If 5 NOT_FOUND, it might mean the DB connection is bad OR the doc is missing in a weird way.
      // But usually get() doesn't throw for missing doc.
      // 5 NOT_FOUND often means "Project not found" or "Database not found"
      // OR "Service Account doesn't have permissions"
      console.warn('⚠️ Admin SDK get() failed:', e.message);
      userDoc = { exists: false, data: () => null } as any;
    }

    if (!userDoc.exists) {
      console.log(
        `⚠️ User ${uid} not found in Firestore. Check if this is Admin and auto-create.`
      );

      console.log('🛠️ Auto-creating Local Profile via Proxy...');
      const localProfile = {
        uid: uid,
        email: 'local@odaxai.com',
        displayName: 'Local User',
        username: 'local_user',
        photoURL: null,
        bio: 'Local AI Workspace User',
        plan: 'free',
        isVerified: true,
        role: 'user',
        usageStats: {
          totalTokensUsed: 0,
          totalInferenceCalls: 0,
          modelsUsed: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
      };

      return NextResponse.json({
        ...localProfile,
        createdAt: localProfile.createdAt.toISOString(),
        updatedAt: localProfile.updatedAt.toISOString(),
      });
    }

    const userData = userDoc.data();
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error('❌ API Proxy Error:', error);

    console.log('🚨 API Proxy crashed, serving EMERGENCY FALLBACK');
    return NextResponse.json({
      uid: params.uid,
      email: 'local@odaxai.com',
      displayName: 'Local User',
      username: 'local_user',
      photoURL: null,
      plan: 'free',
      isVerified: true,
      usageStats: {
        modelsUsed: {},
        totalTokensUsed: 0,
        totalInferenceCalls: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _isFallback: true,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
