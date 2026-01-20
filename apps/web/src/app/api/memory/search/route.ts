// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Memory Search API
 * Endpoint for local document search
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 10, types, folders } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Import memory service dynamically (server-side only)
    const { hybridSearch, isMemoryAvailable } =
      await import('@/memory/memoryService');

    // Check if memory is available
    const available = await isMemoryAvailable();
    if (!available) {
      return NextResponse.json({
        results: [],
        message: 'Memory is not enabled or empty. Enable indexing in Settings.',
      });
    }

    // Perform search
    const results = await hybridSearch(query, { limit, types, folders });

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Memory Search API',
    endpoints: {
      POST: 'Search local memory',
    },
  });
}
