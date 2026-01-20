// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ODAX_CHAT_ROOT = path.resolve(__dirname, '..');

/**
 * Recursively collect all text files in a directory, skipping node_modules, .next, .git, etc.
 */
function walkFiles(dir: string, extensions: string[], maxDepth = 8, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const skipDirs = ['node_modules', '.next', '.git', 'build', 'dist', '.turbo', '__pycache__', 'venv', '.odax'];
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, extensions, maxDepth, depth + 1));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Security: No hardcoded secrets in source code', () => {
  const sourceFiles = walkFiles(
    path.join(ODAX_CHAT_ROOT, 'app'),
    ['.ts', '.tsx', '.js', '.jsx']
  );

  // Patterns that indicate real secrets (not placeholder/env references)
  const secretPatterns = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret Key', regex: /[0-9a-zA-Z/+]{40}(?=\s|"|'|$)/ },
    { name: 'Generic API key (long hex)', regex: /['"]([0-9a-f]{32,64})['"]/i },
    { name: 'Private key block', regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
    { name: 'Firebase service account JSON', regex: /"type"\s*:\s*"service_account"/ },
    { name: 'JWT token', regex: /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/ },
    { name: 'Slack webhook', regex: /hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+/ },
    { name: 'Stripe secret key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
    { name: 'OpenAI API key', regex: /sk-[a-zA-Z0-9]{20,}/ },
    { name: 'GitHub PAT', regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'Google OAuth client secret', regex: /GOCSPX-[a-zA-Z0-9_-]{28}/ },
  ];

  it('source files exist for scanning', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const pattern of secretPatterns) {
    it(`no ${pattern.name} leaked in any source file`, () => {
      const violations: string[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (pattern.regex.test(content)) {
          const relPath = path.relative(PROJECT_ROOT, file);
          violations.push(relPath);
        }
      }

      expect(violations, `Found ${pattern.name} in: ${violations.join(', ')}`).toHaveLength(0);
    });
  }
});

describe('Security: No hardcoded Firebase credentials', () => {
  const firebaseAdminPath = path.join(ODAX_CHAT_ROOT, 'app', 'lib', 'firebase-admin.ts');
  const firebaseClientPath = path.join(ODAX_CHAT_ROOT, 'app', 'lib', 'firebase.ts');

  it('firebase-admin.ts reads ALL credentials from env vars only', () => {
    const content = fs.readFileSync(firebaseAdminPath, 'utf-8');

    expect(content).toContain('process.env.FIREBASE_PROJECT_ID');
    expect(content).toContain('process.env.FIREBASE_CLIENT_EMAIL');
    expect(content).toContain('process.env.FIREBASE_PRIVATE_KEY');

    // Must NOT contain actual project IDs
    expect(content).not.toMatch(/odaxai-cloud/);
    expect(content).not.toMatch(/odaxai\.iam\.gserviceaccount\.com/);
  });

  it('firebase.ts reads ALL config from env vars with safe fallbacks', () => {
    const content = fs.readFileSync(firebaseClientPath, 'utf-8');

    expect(content).toContain('process.env.NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(content).toContain('process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    expect(content).toContain('process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID');

    // Fallback values must be generic placeholders, not real project keys
    expect(content).not.toMatch(/AIza[a-zA-Z0-9_-]{35}/);  // Real Firebase API key
    expect(content).not.toMatch(/odaxai-cloud/);
  });

  it('.env.example exists with blank values', () => {
    const envExamplePath = path.join(ODAX_CHAT_ROOT, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.includes('=') && !l.startsWith('#'));

    for (const line of lines) {
      const value = line.split('=').slice(1).join('=').trim();
      expect(value, `${line.split('=')[0]} should be blank in .env.example`).toBe('');
    }
  });
});

describe('Security: No personal identity leaks', () => {
  const allSourceFiles = [
    ...walkFiles(path.join(ODAX_CHAT_ROOT, 'app'), ['.ts', '.tsx', '.js', '.jsx']),
    ...walkFiles(path.join(PROJECT_ROOT, 'apps', 'macos'), ['.swift', '.yml', '.yaml', '.plist']),
    ...walkFiles(path.join(PROJECT_ROOT, 'scripts'), ['.sh']),
  ];

  const personalPatterns = [
    { name: 'Personal name "Nicolo Savioli"', regex: /nicolo\s*savioli/i },
    { name: 'Username "NickDL87"', regex: /NickDL87/i },
    { name: 'Personal email', regex: /nicolosavioli@/i },
    { name: 'Hardcoded user home path', regex: /\/Users\/nicolosavioli/i },
  ];

  for (const pattern of personalPatterns) {
    it(`no ${pattern.name} in source files`, () => {
      const violations: string[] = [];

      for (const file of allSourceFiles) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          if (pattern.regex.test(content)) {
            violations.push(path.relative(PROJECT_ROOT, file));
          }
        } catch {
          // skip unreadable files
        }
      }

      expect(violations, `Found "${pattern.name}" in: ${violations.join(', ')}`).toHaveLength(0);
    });
  }
});

describe('Security: .gitignore covers sensitive patterns', () => {
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');

  it('.gitignore file exists', () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  const requiredPatterns = [
    '.env',
    '*.pem',
    '*.key',
    '.DS_Store',
    'node_modules/',
    '.next/',
    'build/',
    '*.dmg',
    '*.db',
    '.odax/',
    'backup/',
  ];

  it('covers all critical patterns', () => {
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    for (const pattern of requiredPatterns) {
      expect(content, `.gitignore must include: ${pattern}`).toContain(pattern);
    }
  });

  it('does not allow .env files (except .example)', () => {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.env');
    expect(content).toContain('!.env.example');
  });
});

describe('Security: No real .env files tracked in git', () => {
  it('no .env, .env.local, .env.production tracked', () => {
    const sensitiveEnvFiles = [
      path.join(ODAX_CHAT_ROOT, '.env'),
      path.join(ODAX_CHAT_ROOT, '.env.local'),
      path.join(ODAX_CHAT_ROOT, '.env.production'),
      path.join(ODAX_CHAT_ROOT, '.env.development'),
      path.join(PROJECT_ROOT, '.env'),
      path.join(PROJECT_ROOT, '.env.local'),
    ];

    for (const envFile of sensitiveEnvFiles) {
      // File might exist locally but should NOT be in git.
      // We check that if it exists, it's in .gitignore.
      // The real check is done by verifying .gitignore patterns above.
      // Here we double-check no real credentials are accidentally in the repo.
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf-8');
        // If it exists, it should not contain real Firebase keys
        expect(content).not.toMatch(/AIza[a-zA-Z0-9_-]{35}/);
        expect(content).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
      }
    }
  });
});

describe('Security: Swift code does not leak credentials', () => {
  const swiftDir = path.join(PROJECT_ROOT, 'apps', 'macos', 'project', 'OdaxStudio', 'OdaxStudio');

  it('WebView.swift reads Firebase domain from env, not hardcoded', () => {
    const content = fs.readFileSync(path.join(swiftDir, 'WebView.swift'), 'utf-8');

    expect(content).toContain('ProcessInfo.processInfo.environment');
    expect(content).not.toMatch(/odaxai-cloud\.firebaseapp\.com/);
    expect(content).not.toMatch(/\.firebaseapp\.com"/);
  });

  it('ProcessManager.swift has no hardcoded user paths', () => {
    const content = fs.readFileSync(path.join(swiftDir, 'ProcessManager.swift'), 'utf-8');

    expect(content).not.toMatch(/\/Users\/[a-zA-Z]+\/Desktop/);
    expect(content).not.toMatch(/\/Users\/nicolosavioli/);
  });

  it('no Swift file contains hardcoded API keys', () => {
    const swiftFiles = fs.readdirSync(swiftDir).filter(f => f.endsWith('.swift'));

    for (const file of swiftFiles) {
      const content = fs.readFileSync(path.join(swiftDir, file), 'utf-8');
      expect(content).not.toMatch(/AIza[a-zA-Z0-9_-]{35}/);
      expect(content).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
      expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    }
  });
});
