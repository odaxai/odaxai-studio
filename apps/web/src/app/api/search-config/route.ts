// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Search API Keys Management
 * Store Google API Key and CX securely in local config
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.odax', 'search-config.json');

interface SearchConfig {
  googleApiKey?: string;
  googleCx?: string;
  enabled: boolean;
  lastUpdated?: number;
}

function loadConfig(): SearchConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return data;
    }
  } catch (e) {
    console.error('Error loading search config');
  }
  return { enabled: false };
}

function saveConfig(config: SearchConfig): void {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error saving search config');
  }
}

// GET - Check if search is configured (does NOT return the actual key)
export async function GET() {
  const config = loadConfig();

  const isConfigured = !!(config.googleApiKey && config.googleCx);

  return NextResponse.json({
    configured: isConfigured,
    enabled: config.enabled && isConfigured,
    message: isConfigured
      ? 'Web Search is configured and ready'
      : 'Web Search requires Google API Key + CX. Configure in Settings.',
  });
}

// POST - Save API key and CX
export async function POST(req: NextRequest) {
  try {
    const { googleApiKey, googleCx, enabled } = await req.json();

    const config = loadConfig();

    if (googleApiKey !== undefined) {
      // Basic validation - don't log the key
      if (googleApiKey && googleApiKey.length < 10) {
        return NextResponse.json(
          { error: 'Invalid API key format' },
          { status: 400 }
        );
      }
      config.googleApiKey = googleApiKey || undefined;
    }

    if (googleCx !== undefined) {
      config.googleCx = googleCx || undefined;
    }

    if (enabled !== undefined) {
      config.enabled = enabled;
    }

    config.lastUpdated = Date.now();
    saveConfig(config);

    const isConfigured = !!(config.googleApiKey && config.googleCx);

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      enabled: config.enabled && isConfigured,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}

// DELETE - Clear keys
export async function DELETE() {
  saveConfig({ enabled: false });
  return NextResponse.json({ success: true, message: 'Search keys cleared' });
}
