// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Memory Index API
 * Endpoints for managing memory indexing
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { folders } = await req.json();
    console.log('📥 POST /api/memory/index - Folders requested:', folders);

    if (!folders || !Array.isArray(folders) || folders.length === 0) {
      console.error('❌ No folders provided');
      return NextResponse.json(
        { error: 'At least one folder path is required' },
        { status: 400 }
      );
    }

    console.log('📦 Importing memory service...');
    const { setIndexedFolders, enableMemory, startIndexing } =
      await import('@/memory/memoryService');

    // Enable memory and set folders
    console.log('⚙️ Enabling memory and saving folders...');
    await enableMemory(true);
    await setIndexedFolders(folders);
    console.log('✅ Folders saved:', folders);

    // Start indexing (async - will run in background)
    console.log('🚀 Starting background indexing...');
    startIndexing()
      .then(() => console.log('✅ Indexing completed successfully'))
      .catch((err) => {
        console.error('❌ Indexing failed:', err);
        console.error('Error stack:', err.stack);
      });

    return NextResponse.json({
      success: true,
      message: 'Indexing started',
      folders,
    });
  } catch (error) {
    console.error('❌ Index POST error:', error);
    return NextResponse.json(
      { error: 'Failed to start indexing', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getStatus, getConfig, getMemoryStats } =
      await import('@/memory/memoryService');

    const status = getStatus();
    const config = await getConfig();
    const stats = await getMemoryStats();

    return NextResponse.json({
      status,
      config,
      stats,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { clearMemory, enableMemory } =
      await import('@/memory/memoryService');

    await clearMemory();
    await enableMemory(false);

    return NextResponse.json({
      success: true,
      message: 'Memory cleared',
    });
  } catch (error) {
    console.error('Clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear memory', details: String(error) },
      { status: 500 }
    );
  }
}
