// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('firebase-admin lazy initialization', () => {
  it('exports getAdminDb as a function', async () => {
    const mod = await import('../app/lib/firebase-admin');
    expect(typeof mod.getAdminDb).toBe('function');
  });

  it('exports adminDb as a proxy object', async () => {
    const mod = await import('../app/lib/firebase-admin');
    expect(mod.adminDb).toBeDefined();
    expect(typeof mod.adminDb).toBe('object');
  });

  it('throws when env vars are missing', async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const mod = await import('../app/lib/firebase-admin');
    expect(() => mod.getAdminDb()).toThrow('missing');
  });

  it('adminDb proxy defers initialization until property access', async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const mod = await import('../app/lib/firebase-admin');
    const proxy = mod.adminDb;
    expect(proxy).toBeDefined();
    expect(() => (proxy as any).collection).toThrow();
  });
});
