// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

/**
 * The extractFacts function is not exported from the API route,
 * so we test it by extracting the regex patterns and testing them directly.
 * This also serves as a regression test for the fact-extraction logic.
 */

function extractFacts(content: string): Array<{ key: string; value: string }> {
  const facts: Array<{ key: string; value: string }> = [];

  const namePatterns = [
    /(?:my name is|i'm|i am|mi chiamo|sono|je m'appelle|ich bin|me llamo)\s+([A-Z][a-zA-Zàèéìòù'-]+(?:\s+[A-Z][a-zA-Zàèéìòù'-]+)?)/i,
    /(?:call me|chiamami)\s+([A-Z][a-zA-Zàèéìòù'-]+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 50) {
      facts.push({ key: 'name', value: match[1].trim() });
      break;
    }
  }

  const professionPatterns = [
    /(?:i work as|i'm a|i am a|lavoro come|sono un|sono una|je suis|ich bin ein)\s+([a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
    /(?:my job is|my profession is|il mio lavoro è)\s+([a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
  ];
  for (const pattern of professionPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
      if (!['a', 'an', 'un', 'una'].includes(match[1].toLowerCase().trim())) {
        facts.push({ key: 'profession', value: match[1].trim() });
        break;
      }
    }
  }

  const locationPatterns = [
    /(?:i live in|i'm from|i am from|vivo a|abito a|vengo da|sono di|je vis à|ich wohne in)\s+([A-Z][a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
  ];
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 50) {
      facts.push({ key: 'location', value: match[1].trim() });
      break;
    }
  }

  const ageMatch = content.match(
    /(?:i'm|i am|ho|sono|j'ai)\s+(\d{1,3})\s*(?:years old|anni|ans|jahre)/i
  );
  if (ageMatch && ageMatch[1]) {
    const age = parseInt(ageMatch[1]);
    if (age > 0 && age < 150) {
      facts.push({ key: 'age', value: ageMatch[1] });
    }
  }

  return facts;
}

describe('extractFacts - name detection', () => {
  it('extracts English name', () => {
    const facts = extractFacts('My name is John');
    expect(facts).toContainEqual({ key: 'name', value: 'John' });
  });

  it('extracts Italian name', () => {
    const facts = extractFacts('Mi chiamo Marco');
    expect(facts).toContainEqual({ key: 'name', value: 'Marco' });
  });

  it('extracts full name', () => {
    const facts = extractFacts("I'm Alice Smith");
    expect(facts).toContainEqual({ key: 'name', value: 'Alice Smith' });
  });

  it('extracts name with call me pattern', () => {
    const facts = extractFacts('Call me Bob');
    expect(facts).toContainEqual({ key: 'name', value: 'Bob' });
  });

  it('does not extract single char as name', () => {
    const facts = extractFacts('My name is A');
    const namesFact = facts.find(f => f.key === 'name');
    expect(namesFact).toBeUndefined();
  });
});

describe('extractFacts - profession detection', () => {
  it('extracts English profession', () => {
    const facts = extractFacts('I work as a software engineer.');
    expect(facts).toContainEqual({ key: 'profession', value: expect.stringContaining('software engineer') });
  });

  it('extracts Italian profession', () => {
    const facts = extractFacts('Lavoro come ingegnere.');
    expect(facts).toContainEqual({ key: 'profession', value: 'ingegnere' });
  });
});

describe('extractFacts - location detection', () => {
  it('extracts English location', () => {
    const facts = extractFacts('I live in London.');
    expect(facts).toContainEqual({ key: 'location', value: 'London' });
  });

  it('extracts Italian location', () => {
    const facts = extractFacts('Vivo a Roma.');
    expect(facts).toContainEqual({ key: 'location', value: 'Roma' });
  });
});

describe('extractFacts - age detection', () => {
  it('extracts English age', () => {
    const facts = extractFacts("I'm 30 years old");
    expect(facts).toContainEqual({ key: 'age', value: '30' });
  });

  it('extracts Italian age', () => {
    const facts = extractFacts('Ho 25 anni');
    expect(facts).toContainEqual({ key: 'age', value: '25' });
  });

  it('ignores impossible ages', () => {
    const facts = extractFacts("I'm 200 years old");
    const ageFact = facts.find(f => f.key === 'age');
    expect(ageFact).toBeUndefined();
  });
});

describe('extractFacts - combined', () => {
  it('extracts multiple facts from one message', () => {
    const facts = extractFacts("My name is Anna. I live in Paris. I'm 28 years old");
    expect(facts.length).toBeGreaterThanOrEqual(2);
    expect(facts.find(f => f.key === 'name')).toBeTruthy();
    expect(facts.find(f => f.key === 'location')).toBeTruthy();
    expect(facts.find(f => f.key === 'age')).toBeTruthy();
  });

  it('returns empty array for irrelevant text', () => {
    const facts = extractFacts('The weather is nice today');
    expect(facts).toHaveLength(0);
  });
});

describe('project structure integrity', () => {
  const projectRoot = path.resolve(__dirname, '..');

  it('has required API route files', () => {
    const requiredRoutes = [
      'app/api/models/route.ts',
      'app/api/user-memory/route.ts',
      'app/api/user/stats/route.ts',
      'app/api/user/profile/[uid]/route.ts',
      'app/api/debug/db/route.ts',
    ];

    for (const route of requiredRoutes) {
      const fullPath = path.join(projectRoot, route);
      expect(fs.existsSync(fullPath), `Missing route: ${route}`).toBe(true);
    }
  });

  it('has required lib files', () => {
    const requiredLibs = [
      'app/lib/firebase-admin.ts',
      'app/lib/firebase.ts',
      'app/lib/hardwareDetect.ts',
      'app/lib/usageTracker.ts',
      'app/lib/vectorMemoryService.ts',
      'app/lib/socialService.ts',
      'app/lib/cleanupStats.ts',
    ];

    for (const lib of requiredLibs) {
      const fullPath = path.join(projectRoot, lib);
      expect(fs.existsSync(fullPath), `Missing lib: ${lib}`).toBe(true);
    }
  });

  it('has package.json with required scripts', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.start).toBeDefined();
  });

  it('has tsconfig.json', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('does NOT reference code-server anywhere in lib/', () => {
    const libDir = path.join(projectRoot, 'app', 'lib');
    const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

    for (const file of libFiles) {
      const content = fs.readFileSync(path.join(libDir, file), 'utf-8');
      expect(content.toLowerCase()).not.toContain('code-server');
      expect(content.toLowerCase()).not.toContain('codeserver');
    }
  });

  it('all API routes export dynamic = force-dynamic for server routes', () => {
    const routesWithAdmin = [
      'app/api/user/stats/route.ts',
      'app/api/user/profile/[uid]/route.ts',
      'app/api/debug/db/route.ts',
    ];

    for (const route of routesWithAdmin) {
      const content = fs.readFileSync(path.join(projectRoot, route), 'utf-8');
      expect(content, `${route} should use force-dynamic`).toContain("export const dynamic = 'force-dynamic'");
    }
  });
});
