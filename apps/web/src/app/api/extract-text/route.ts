// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');

// Handle POST request to extract text from files (PDF/Text)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    const fileType = file.type;

    if (fileType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        text = data.text;
      } catch (parseError) {
        console.error('PDF Parse Error:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse PDF' },
          { status: 500 }
        );
      }
    } else if (
      fileType.startsWith('text/') ||
      file.name.match(/\.(txt|md|js|ts|py|json|csv)$/)
    ) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF or Text files.' },
        { status: 400 }
      );
    }

    // Basic cleaning of text
    text = text.replace(/\s+/g, ' ').trim();

    return NextResponse.json({
      success: true,
      text,
      meta: {
        name: file.name,
        type: fileType,
        size: file.size,
        chars: text.length,
      },
    });
  } catch (error) {
    console.error('Extract API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
