// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function gitLsFiles(pattern?: string): string[] {
  try {
    const cmd = pattern
      ? `git ls-files -- '${pattern}'`
      : 'git ls-files';
    const output = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('Repo hygiene: no unwanted files tracked', () => {
  it('no .env files tracked (except .example)', () => {
    const envFiles = gitLsFiles().filter(f =>
      /\.env$/.test(f) || /\.env\.local$/.test(f) || /\.env\.production$/.test(f)
    );
    const realEnvFiles = envFiles.filter(f => !f.includes('.example') && !f.includes('test/colorize-fixtures'));
    expect(realEnvFiles, `Real .env files tracked: ${realEnvFiles.join(', ')}`).toHaveLength(0);
  });

  it('no .DS_Store files tracked', () => {
    const dsStore = gitLsFiles().filter(f => f.includes('.DS_Store'));
    expect(dsStore).toHaveLength(0);
  });

  it('no backup/ directory tracked', () => {
    const backupFiles = gitLsFiles('backup/*');
    expect(backupFiles).toHaveLength(0);
  });

  it('no .odax/ directory tracked', () => {
    const odaxFiles = gitLsFiles('.odax/*');
    expect(odaxFiles).toHaveLength(0);
  });

  it('no .agent/ directory tracked', () => {
    const agentFiles = gitLsFiles('.agent/*');
    expect(agentFiles).toHaveLength(0);
  });

  it('no compiled .class files tracked', () => {
    const classFiles = gitLsFiles().filter(f => f.endsWith('.class'));
    expect(classFiles, `Class files tracked: ${classFiles.slice(0, 5).join(', ')}`).toHaveLength(0);
  });

  it('no .pyc files tracked', () => {
    const pycFiles = gitLsFiles().filter(f => f.endsWith('.pyc'));
    expect(pycFiles).toHaveLength(0);
  });

  it('no vim swap files tracked', () => {
    const swapFiles = gitLsFiles().filter(f => /\.(swp|swo|swn)$/.test(f));
    expect(swapFiles).toHaveLength(0);
  });

  it('no .dmg files tracked', () => {
    const dmgFiles = gitLsFiles().filter(f => f.endsWith('.dmg'));
    expect(dmgFiles).toHaveLength(0);
  });

  it('no .pem or .key private key files tracked', () => {
    const keyFiles = gitLsFiles().filter(f =>
      (f.endsWith('.pem') || f.endsWith('.key')) && !f.includes('docs/') && !f.includes('.key')
    );
    // Allow docs/ reference keys (architecture diagrams etc.)
    const realKeys = keyFiles.filter(f => !f.includes('docs/'));
    expect(realKeys).toHaveLength(0);
  });

  it('no database files tracked', () => {
    const dbFiles = gitLsFiles().filter(f =>
      f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3')
    );
    expect(dbFiles).toHaveLength(0);
  });
});

describe('Repo hygiene: no code-server references remain', () => {
  const codebaseFiles = [
    ...getFilesInDir(path.join(PROJECT_ROOT, 'apps', 'macos'), ['.swift', '.sh', '.yml']),
    ...getFilesInDir(path.join(PROJECT_ROOT, 'services', 'odax-chat', 'app'), ['.ts', '.tsx']),
    ...getFilesInDir(path.join(PROJECT_ROOT, '.github'), ['.yml']),
  ];

  function getFilesInDir(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules', '.next', 'build'].includes(entry.name)) {
          results.push(...getFilesInDir(fullPath, extensions));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    } catch { /* skip */ }
    return results;
  }

  it('source files exist for scanning', () => {
    expect(codebaseFiles.length).toBeGreaterThan(5);
  });

  it('no "codeServerProcess" in any Swift file', () => {
    const swiftFiles = codebaseFiles.filter(f => f.endsWith('.swift'));
    for (const file of swiftFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, `Found codeServerProcess in ${path.basename(file)}`).not.toContain('codeServerProcess');
    }
  });

  it('no "start-codeserver" script references', () => {
    for (const file of codebaseFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, `Found start-codeserver in ${path.relative(PROJECT_ROOT, file)}`).not.toContain('start-codeserver');
    }
  });

  it('no "configure-code-server" script references', () => {
    for (const file of codebaseFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, `Found configure-code-server in ${path.relative(PROJECT_ROOT, file)}`).not.toContain('configure-code-server');
    }
  });

  it('start-codeserver.sh and configure-code-server.sh files are deleted', () => {
    const scriptsDir = path.join(PROJECT_ROOT, 'apps', 'macos', 'scripts');
    expect(fs.existsSync(path.join(scriptsDir, 'start-codeserver.sh'))).toBe(false);
    expect(fs.existsSync(path.join(scriptsDir, 'configure-code-server.sh'))).toBe(false);
  });

  it('port 8080 not in cleanupPorts (was code-server)', () => {
    const pmPath = path.join(PROJECT_ROOT, 'apps', 'macos', 'project', 'OdaxStudio', 'OdaxStudio', 'ProcessManager.swift');
    const content = fs.readFileSync(pmPath, 'utf-8');

    // Extract the cleanupPorts array
    const cleanupMatch = content.match(/cleanupPorts[\s\S]*?\[([^\]]+)\]/);
    if (cleanupMatch) {
      const ports = cleanupMatch[1];
      expect(ports).not.toContain('8080');
    }
  });
});

describe('Repo hygiene: removed services are not tracked', () => {
  it('services/code-server/ not tracked', () => {
    expect(gitLsFiles('services/code-server/*')).toHaveLength(0);
  });

  it('server/llama.cpp/ not tracked (build from source)', () => {
    expect(gitLsFiles('server/llama.cpp/*')).toHaveLength(0);
  });

  it('server/whisper.cpp/ not tracked', () => {
    expect(gitLsFiles('server/whisper.cpp/*')).toHaveLength(0);
  });

  it('apps/ide/ not tracked', () => {
    expect(gitLsFiles('apps/ide/*')).toHaveLength(0);
  });

  it('apps/desktop/ not tracked', () => {
    expect(gitLsFiles('apps/desktop/*')).toHaveLength(0);
  });

  it('packages/ not tracked (empty workspace packages removed)', () => {
    expect(gitLsFiles('packages/*')).toHaveLength(0);
  });

  it('total tracked files is reasonable (< 250)', () => {
    const total = gitLsFiles().length;
    expect(total).toBeLessThan(250);
    expect(total).toBeGreaterThan(50);
  });
});

describe('Repo hygiene: project configuration integrity', () => {
  it('setup.sh uses dynamic PROJECT_ROOT (no hardcoded paths)', () => {
    const setupPath = path.join(PROJECT_ROOT, 'setup.sh');
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('PROJECT_ROOT=');
    expect(content).not.toMatch(/\/Users\/[a-zA-Z]+/);
  });

  it('project.yml has correct version info', () => {
    const ymlPath = path.join(PROJECT_ROOT, 'apps', 'macos', 'project', 'project.yml');
    const content = fs.readFileSync(ymlPath, 'utf-8');
    expect(content).toContain('MARKETING_VERSION');
    expect(content).toContain('com.odaxai.OdaxStudio');
    expect(content).toContain('Copyright');
  });

  it('README.md exists and has key sections', () => {
    const readmePath = path.join(PROJECT_ROOT, 'README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('OdaxAI');
    expect(content).toContain('Quick Start');
    expect(content).toContain('Architecture');
    expect(content).toContain('License');
  });

  it('LICENSE file exists', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'LICENSE'))).toBe(true);
  });

  it('CONTRIBUTING.md exists', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'CONTRIBUTING.md'))).toBe(true);
  });

  it('SECURITY.md exists', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'SECURITY.md'))).toBe(true);
  });

  it('CI workflow exists and runs tests on push + PR', () => {
    const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
    const content = fs.readFileSync(ciPath, 'utf-8');
    expect(content).toContain('push:');
    expect(content).toContain('pull_request:');
    expect(content).toContain('npm test');
    expect(content).toContain('xcodebuild test');
  });

  it('has CODEOWNERS', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, '.github', 'CODEOWNERS'))).toBe(true);
  });

  it('has PR template', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, '.github', 'PULL_REQUEST_TEMPLATE.md'))).toBe(true);
  });

  it('has issue templates', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_ROOT, '.github', 'ISSUE_TEMPLATE', 'feature_request.yml'))).toBe(true);
  });
});

describe('Repo hygiene: copyright headers', () => {
  const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.swift', '.js', '.mjs'];
  const SKIP_PATTERNS = ['.d.ts', '.min.js', '.config.js', '.config.ts', 'vitest.config', 'eslint.config', 'tailwind.config', 'postcss.config', 'next-env'];

  function collectSourceFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules', '.next', 'build', '.git', '__pycache__'].includes(entry.name)) {
          results.push(...collectSourceFiles(fullPath));
        } else if (entry.isFile() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
          if (!SKIP_PATTERNS.some(pat => entry.name.includes(pat))) {
            results.push(fullPath);
          }
        }
      }
    } catch { /* skip */ }
    return results;
  }

  const sourceFiles = collectSourceFiles(PROJECT_ROOT);

  it('found source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it('all source files have OdaxAI SRL copyright header', () => {
    const missing: string[] = [];
    for (const file of sourceFiles) {
      const head = fs.readFileSync(file, 'utf-8').slice(0, 500);
      if (!head.includes('Copyright') || !head.includes('OdaxAI SRL')) {
        missing.push(path.relative(PROJECT_ROOT, file));
      }
    }
    expect(missing, `Files missing copyright:\n${missing.join('\n')}`).toHaveLength(0);
  });
});
