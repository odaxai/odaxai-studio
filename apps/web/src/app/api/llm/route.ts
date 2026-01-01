import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Proxy for LLM completion to avoid CORS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Use Ollama API
    const ollamaUrl = 'http://127.0.0.1:11434/api/generate';

    console.log(
      '[LLM Proxy] Calling Ollama with prompt length:',
      body.prompt?.length
    );

    // Transform request for Ollama
    const ollamaBody = {
      model: body.model || 'qwen2.5-3b-i', // Default if not specified
      prompt: body.prompt,
      stream: true,
      options: {
        temperature: body.temperature || 0.3,
        num_predict: body.n_predict || 2048,
      },
    };

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaBody),
    });

    if (!response.ok) {
      console.error('[LLM Proxy] Error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `LLM error: ${response.statusText}` },
        { status: 503 }
      );
    }

    // Stream the response back
    const stream = response.body;

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[LLM Proxy] Exception:', error);
    return NextResponse.json(
      { error: 'LLM server not reachable' },
      { status: 500 }
    );
  }
}
