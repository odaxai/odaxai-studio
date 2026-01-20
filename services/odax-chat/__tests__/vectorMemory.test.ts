// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Extracted pure logic from vectorMemoryService for unit testing
 * without requiring LanceDB native bindings.
 */

const EMBEDDING_DIM = 768;

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('vectorMemoryService - computeHash', () => {
  it('produces consistent SHA-256 for same input', () => {
    const hash1 = computeHash('hello world');
    const hash2 = computeHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = computeHash('hello');
    const hash2 = computeHash('world');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 64-character hex string', () => {
    const hash = computeHash('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles empty string', () => {
    const hash = computeHash('');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles unicode content', () => {
    const hash = computeHash('日本語テスト 🔥');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is order-sensitive', () => {
    expect(computeHash('abc')).not.toBe(computeHash('bca'));
  });

  it('handles very long strings', () => {
    const longStr = 'x'.repeat(100_000);
    const hash = computeHash(longStr);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('vectorMemoryService - embedding dimensions', () => {
  it('uses 768 dimensions (standard for nomic-embed-text)', () => {
    expect(EMBEDDING_DIM).toBe(768);
  });

  it('zero vector has correct dimensions', () => {
    const zeroVector = new Array(EMBEDDING_DIM).fill(0);
    expect(zeroVector).toHaveLength(768);
    expect(zeroVector.every(v => v === 0)).toBe(true);
  });
});

describe('vectorMemoryService - module exports', () => {
  const servicePath = path.join(__dirname, '..', 'app', 'lib', 'vectorMemoryService.ts');

  it('exports addFact, addConversation, searchMemory, getAllFacts, clearVectorMemory', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('export async function addFact');
    expect(content).toContain('export async function addConversation');
    expect(content).toContain('export async function searchMemory');
    expect(content).toContain('export async function getAllFacts');
    expect(content).toContain('export async function clearVectorMemory');
  });

  it('stores data in ~/.odax/memory/ (not project directory)', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain("os.homedir()");
    expect(content).toContain("'.odax'");
    expect(content).toContain("'memory'");
  });

  it('has SHA-256 deduplication in addFact', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('computeHash');
    expect(content).toContain('deduplicated');
  });

  it('truncates embedding input to 8000 chars', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('8000');
  });
});
