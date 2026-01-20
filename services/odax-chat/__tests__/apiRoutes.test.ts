// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ODAX_CHAT_ROOT = path.resolve(__dirname, '..');

describe('API Route: /api/models', () => {
  const routePath = path.join(ODAX_CHAT_ROOT, 'app', 'api', 'models', 'route.ts');

  it('scans ~/.odax/models for .gguf files', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain("homedir()");
    expect(content).toContain("'.odax'");
    expect(content).toContain("'models'");
    expect(content).toContain('.gguf');
  });

  it('returns models array (not raw file list)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('models');
    expect(content).toContain('NextResponse.json');
  });

  it('handles missing directory gracefully', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('catch');
    expect(content).toContain('Models directory not found');
  });

  it('includes model size in response', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('sizeGB');
    expect(content).toContain('sizeBytes');
  });

  it('does not expose absolute paths outside model directory', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).not.toMatch(/\/Users\/[a-zA-Z]+\//);
  });
});

describe('API Route: /api/user/stats', () => {
  const routePath = path.join(ODAX_CHAT_ROOT, 'app', 'api', 'user', 'stats', 'route.ts');

  it('validates required fields (userId and stats)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('!userId');
    expect(content).toContain('!stats');
    expect(content).toContain('status: 400');
  });

  it('uses FieldValue.increment (not overwrite)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('FieldValue.increment');
  });

  it('sanitizes model names (dots to dashes)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain(".replace(/\\./g, '-')");
  });

  it('handles write errors with 500 status', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('status: 500');
  });

  it('uses force-dynamic to prevent static generation', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain("export const dynamic = 'force-dynamic'");
  });
});

describe('API Route: /api/user/profile/[uid]', () => {
  const routePath = path.join(ODAX_CHAT_ROOT, 'app', 'api', 'user', 'profile', '[uid]', 'route.ts');

  it('validates UID parameter', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('!uid');
    expect(content).toContain("'UID required'");
    expect(content).toContain('status: 400');
  });

  it('has fallback for missing users (auto-creates local profile)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('Local User');
    expect(content).toContain('local@odaxai.com');
  });

  it('has emergency fallback on crash', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('EMERGENCY FALLBACK');
    expect(content).toContain('_isFallback');
  });
});

describe('API Route: /					api	/user-memory', () => {
  const routePath = path.join(ODAX_CHAT_ROOT, 'app', 'api', 'user-memory', 'route.ts');

  it('exports GET, POST, DELETE handlers', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
  });

  it('validates content in, POST', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain("'Content required'");
    expect(content).toContain('status: 400');
  });

  it('limits stored conversations to 100', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('100');
    expect(content).toContain('.slice(-100)');
  });

  it('limits stored documents to 10', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('.slice(-10)');
  });

  it('stores memory in ~/.odax (not project dir)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain("os.homedir()");
    expect(content).toContain("'.odax'");
  });

  it('clears both vector and JSON memory on DELETE', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('clearVectorMemory');
    expect(content).toContain("facts: [], conversations: [], documents: []");
  });
});

describe('API Route: /api/debug/db', () => {
  const routePath = path.join(ODAX_CHAT_ROOT, 'app', 'api', 'debug', 'db', 'route.ts');

  it('returns 200 even on error (offline fallback)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('offline_fallback_active');
    expect(content).toContain('status: 200');
  });

  it('does not expose sensitive error details', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).not.toContain('stack');
    expect(content).toContain('original_error');
  });
});
