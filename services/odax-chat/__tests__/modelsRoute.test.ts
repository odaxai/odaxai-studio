// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

describe('GET /api/models', () => {
  const modelsDir = path.join(os.tmpdir(), 'odax-test-models-' + Date.now());

  beforeEach(() => {
    fs.mkdirSync(modelsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(modelsDir, { recursive: true, force: true });
  });

  it('returns empty array when no gguf files exist', () => {
    const files = fs.readdirSync(modelsDir);
    const models = files
      .filter((f) => f.endsWith('.gguf'))
      .map((f) => ({ name: f.replace(/\.gguf$/, '') }));
    expect(models).toHaveLength(0);
  });

  it('detects .gguf files in the models directory', () => {
    fs.writeFileSync(path.join(modelsDir, 'test-model-q4.gguf'), 'fake data');
    fs.writeFileSync(path.join(modelsDir, 'not-a-model.txt'), 'irrelevant');

    const files = fs.readdirSync(modelsDir);
    const models = files
      .filter((f) => f.endsWith('.gguf'))
      .map((f) => {
        const stats = fs.statSync(path.join(modelsDir, f));
        return {
          name: f.replace(/\.gguf$/i, '').replace(/_/g, '-'),
          filename: f,
          sizeBytes: stats.size,
        };
      });

    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('test-model-q4');
    expect(models[0].filename).toBe('test-model-q4.gguf');
  });

  it('formats model name correctly (underscores to dashes)', () => {
    fs.writeFileSync(path.join(modelsDir, 'qwen2.5-3b-instruct-q4_k_m.gguf'), '');

    const files = fs.readdirSync(modelsDir);
    const name = files[0].replace(/\.gguf$/i, '').replace(/_/g, '-');
    expect(name).toBe('qwen2.5-3b-instruct-q4-k-m');
  });
});
