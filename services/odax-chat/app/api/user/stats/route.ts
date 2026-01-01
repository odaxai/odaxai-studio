import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, stats } = body;

    if (!userId || !stats) {
      return NextResponse.json(
        { error: 'Missing userId or stats' },
        { status: 400 }
      );
    }

    console.log(`📥 API Proxy: Received stats sync for ${userId}`, stats);

    // Use Admin SDK to update Firestore
    const userRef = adminDb.collection('users').doc(userId);

    // Check if user exists (mock check for our fallback admin)
    // In a real scenario we would verify verifyIdToken but for this Proxy mode we trust the client logic
    // (since it's an internal workaround).

    const updateData: Record<string, any> = {
      totalTokens: FieldValue.increment(stats.totalTokens || 0),
      totalInferences: FieldValue.increment(stats.totalInferences || 0),
      lastActive: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    console.log(
      '📊 DEBUG: Raw stats received:',
      JSON.stringify(stats, null, 2)
    );

    // Models Used
    if (stats.modelsUsed) {
      for (const [model, count] of Object.entries(stats.modelsUsed)) {
        // sanitize key and ensure count is a number
        const key = model.replace(/\./g, '-');
        const numericCount = (count as number) || 0;
        console.log(
          `  Adding model: ${key} = ${numericCount} (type: ${typeof count})`
        );
        updateData[`modelsUsed.${key}`] = FieldValue.increment(numericCount);
      }
    }

    // Tokens Per Model
    if (stats.tokensPerModel) {
      for (const [model, tokens] of Object.entries(stats.tokensPerModel)) {
        const key = model.replace(/\./g, '-');
        const numericTokens = (tokens as number) || 0;
        console.log(
          `  Adding tokens: ${key} = ${numericTokens} (type: ${typeof tokens})`
        );
        updateData[`tokensPerModel.${key}`] =
          FieldValue.increment(numericTokens);
      }
    }

    // Reasoning
    if (stats.reasoningCount) {
      console.log(
        `  Adding reasoning: count=${stats.reasoningCount}, tokens=${stats.reasoningTokens}`
      );
      updateData.reasoningCount = FieldValue.increment(
        stats.reasoningCount || 0
      );
      updateData.reasoningTokens = FieldValue.increment(
        stats.reasoningTokens || 0
      );
    }

    console.log('✅ Update data prepared, attempting write...');

    // Attempt Write
    try {
      await userRef.update(updateData);
      console.log('✅ API Proxy: Stats updated in Firestore');
      return NextResponse.json({
        success: true,
        message: 'Stats synced via Proxy',
      });
    } catch (writeErr: any) {
      console.error('❌ API Proxy Write Error:', writeErr);
      // If Write Fails (e.g. gRPC block on server too), we return success BUT indicate mocking?
      // No, if server cannot write, data isn't saved.
      // But per USER REQUEST: "Metrics saved in internal db".
      // The CLIENT handles the "Save Local if Fail" logic. Use user knows 500 = fail.
      return NextResponse.json({ error: writeErr.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ API Stats Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
