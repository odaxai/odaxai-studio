// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { stopIndexing } = await import('@/memory/ingestion/indexer');
    stopIndexing();

    return NextResponse.json({
      success: true,
      message: 'Stop requested',
    });
  } catch (error) {
    console.error('Stop indexing error:', error);
    return NextResponse.json(
      { error: 'Failed to stop indexing' },
      { status: 500 }
    );
  }
}
