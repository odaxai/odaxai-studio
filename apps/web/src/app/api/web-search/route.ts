/**
 * Web Search API - Google Custom Search ONLY
 *
 * IMPORTANT: This API uses ONLY the official Google Programmable Search API.
 * No web scraping is performed. Users must provide their own API key and CX.
 *
 * API: https://www.googleapis.com/customsearch/v1
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.odax', 'search-config.json');

interface SearchResult {
  id: number;
  title: string;
  url: string;
  snippet: string; // Short snippet only, no full content
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
 * Google Custom Search API
 * Uses official API - no scraping
 */
async function searchGoogle(
  query: string,
  apiKey: string,
  cx: string,
  count: number = 6
): Promise<SearchResult[]> {
  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(count, 10)));

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Don't log full error which might contain key info
      console.error('Google Search API error:', response.status);

      if (response.status === 403) {
        throw new Error('API key invalid or quota exceeded');
      }
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map(
      (r: { title?: string; link?: string; snippet?: string }, i: number) => ({
        id: i + 1,
        title: r.title || '',
        url: r.link || '',
        snippet: (r.snippet || '').slice(0, 300), // Limit snippet length
      })
    );
  } catch (error) {
    console.error('Google search error');
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, numResults = 6 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Load config
    const config = loadConfig();

    // Check if configured
    if (!config.googleApiKey || !config.googleCx) {
      return NextResponse.json(
        {
          error: 'not_configured',
          message:
            'Web Search requires Google API Key + Search Engine ID (CX). Configure in Settings → Search.',
          sources: [],
          context: '',
        },
        { status: 400 }
      );
    }

    if (!config.enabled) {
      return NextResponse.json(
        {
          error: 'disabled',
          message: 'Web Search is disabled. Enable it in Settings.',
          sources: [],
          context: '',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Web search: "${query.slice(0, 50)}..."`);

    // Use Google Custom Search API
    const sources = await searchGoogle(
      query,
      config.googleApiKey,
      config.googleCx,
      numResults
    );

    // Build context from snippets ONLY (no full page content)
    // This avoids copyright issues - only using search result snippets
    const context = sources
      .map((s) => `[${s.id}] ${s.title}\n${s.snippet}`)
      .join('\n\n');

    console.log(`✅ Returning ${sources.length} results (snippet-only mode)`);

    return NextResponse.json({
      sources,
      context,
      query,
      mode: 'google-api', // Indicate we're using official API
    });
  } catch (error) {
    console.error('Web search error');
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        sources: [],
        context: '',
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET - Check if search is available
export async function GET() {
  const config = loadConfig();
  const isConfigured = !!(config.googleApiKey && config.googleCx);

  return NextResponse.json({
    available: isConfigured && config.enabled,
    configured: isConfigured,
    message: isConfigured
      ? config.enabled
        ? 'Web Search ready'
        : 'Web Search disabled'
      : 'Configure Google API Key + CX in Settings to enable Web Search',
  });
}
