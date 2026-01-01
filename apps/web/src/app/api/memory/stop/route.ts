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
