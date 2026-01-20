// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../app/lib/usageTracker';

describe('estimateTokens', () => {
  it('estimates tokens from character count (1 token ~ 4 chars)', () => {
    expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 => ceil = 3
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 0 for null/undefined-like input', () => {
    expect(estimateTokens(null as any)).toBe(0);
    expect(estimateTokens(undefined as any)).toBe(0);
  });

  it('handles single character', () => {
    expect(estimateTokens('a')).toBe(1);
  });

  it('handles exactly 4 characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('handles long text', () => {
    const longText = 'a'.repeat(1000);
    expect(estimateTokens(longText)).toBe(250);
  });

  it('handles unicode text', () => {
    const result = estimateTokens('こんにちは世界');
    expect(result).toBeGreaterThan(0);
  });
});
