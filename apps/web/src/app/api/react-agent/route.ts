// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * ReAct Agent API - Deep Research with Streaming
 *
 * IMPORTANT: Uses ONLY Google Custom Search API (no scraping).
 * Uses SNIPPET-ONLY mode - does not fetch full page content.
 * This avoids copyright issues and ToS violations.
 */

import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const LLAMA_SERVER = 'http://localhost:8081';
const CONFIG_FILE = path.join(os.homedir(), '.odax', 'search-config.json');

interface Source {
  id: number;
  title: string;
  url: string;
  content: string; // Snippet only, not full page
  status: 'searching' | 'done';
}

interface SearchConfig {
  googleApiKey?: string;
  googleCx?: string;
  enabled: boolean;
}

function loadConfig(): SearchConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {
    // Config not found
  }
  return { enabled: false };
}

/**
 * Search using Google Custom Search API ONLY
 * No scraping - uses official API
 */
async function searchGoogle(
  query: string,
  apiKey: string,
  cx: string,
  numResults = 8
): Promise<Source[]> {
  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(numResults, 10)));

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Google API error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.items || []).map(
      (r: { title?: string; link?: string; snippet?: string }, i: number) => ({
        id: i + 1,
        title: r.title || '',
        url: r.link || '',
        // Use SNIPPET ONLY - no full page content (avoids copyright issues)
        content: (r.snippet || '').slice(0, 400),
        status: 'done' as const,
      })
    );
  } catch (error) {
    console.error('Google search error');
    return [];
  }
}

/**
 * Generate response using local LLM (llama.cpp)
 */
async function generateWithLLM(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${LLAMA_SERVER}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return '';

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM error');
    return '';
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');

  if (!query) {
    return new Response('Query required', { status: 400 });
  }

  // Check configuration
  const config = loadConfig();
  if (!config.googleApiKey || !config.googleCx || !config.enabled) {
    return new Response(
      JSON.stringify({
        error: 'not_configured',
        message:
          'Deep Research requires Google API Key + CX. Configure in Settings.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(
    `🧠 Starting deep research (snippet-only mode): "${query.slice(0, 50)}..."`
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Phase 1: Search with Google API
        sendEvent('status', {
          phase: 'searching',
          message: 'Searching with Google...',
          progress: 10,
          step: 1,
        });

        const sources = await searchGoogle(
          query,
          config.googleApiKey!,
          config.googleCx!,
          8
        );

        if (sources.length === 0) {
          sendEvent('error', {
            message: 'No search results found. Check your API key and quota.',
          });
          controller.close();
          return;
        }

        // Send all sources (already have snippets from Google)
        for (const source of sources) {
          sendEvent('source', source);
        }

        sendEvent('status', {
          phase: 'analyzing',
          message: `Found ${sources.length} sources, synthesizing...`,
          progress: 50,
          step: 2,
        });

        // Phase 2: Synthesize (snippet-only, no page fetching)
        // Build context from search snippets ONLY
        const context = sources
          .map(
            (s) =>
              `[${s.id}] ${s.title}\nSource: ${s.url}\nSnippet: ${s.content}`
          )
          .join('\n\n');

        const prompt = `You are a research assistant. Based on the following Google search result snippets, provide a comprehensive answer to the query.

IMPORTANT: 
- Only use information from the provided snippets
- Cite sources using [1], [2], etc. format
- Include source links for verification
- Do not make up information not in the snippets

QUERY: ${query}

SEARCH RESULTS (snippets only):
${context}

Provide a well-organized answer with:
1. Key findings
2. Source citations
3. Summary

ANSWER:`;

        sendEvent('status', {
          phase: 'synthesizing',
          message: 'Generating comprehensive answer...',
          progress: 80,
          step: 3,
        });

        const answer = await generateWithLLM(prompt);

        sendEvent('status', {
          phase: 'complete',
          message: 'Research complete',
          progress: 100,
          step: 4,
        });

        sendEvent('complete', {
          answer: answer || 'Unable to generate response. Please try again.',
          sources,
          iterations: 1,
          mode: 'snippet-only', // Indicate we're not fetching full pages
        });
      } catch (error) {
        console.error('Research error');
        sendEvent('error', { message: 'Research failed. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
