// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message } = await req.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to local llama.cpp server
    const llamaServerUrl = 'http://127.0.0.1:8081/completion';

    // Start fetching from llama.cpp
    const response = await fetch(llamaServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        prompt: `<|im_start|>system
You are OdaxAI, an expert coding assistant. help the user with their code.
<|im_end|>
<|im_start|>user
${message}<|im_end|>
<|im_start|>assistant
`,
        n_predict: -1,
        temperature: 0.7,
        stream: true,
        stop: ['<|im_end|>'],
        cache_prompt: true,
      }),
    });

    if (!response.ok) {
      console.error(
        'Llama server error:',
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: `Engine error: ${response.statusText}` },
        { status: 503 }
      );
    }

    // Create a TransformStream to pass the data through
    const stream = response.body;

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
