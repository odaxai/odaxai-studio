// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PROJECTS_DIR = path.join(os.homedir(), '.odax', 'projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Determine command and extension based on language
    let command: string;
    let args: string[];
    let ext: string;

    const lang = (language || '').toLowerCase();

    switch (lang) {
      case 'python':
      case 'py':
        command = 'python3';
        args = ['-c', code];
        ext = 'py';
        break;
      case 'javascript':
      case 'js':
        command = 'node';
        args = ['-e', code];
        ext = 'js';
        break;
      case 'typescript':
      case 'ts':
        // For TypeScript, we need to write to file and use ts-node or compile
        command = 'npx';
        args = ['tsx', '-e', code];
        ext = 'ts';
        break;
      case 'bash':
      case 'sh':
      case 'shell':
        command = 'bash';
        args = ['-c', code];
        ext = 'sh';
        break;
      default:
        return NextResponse.json(
          {
            error: `Language '${language}' is not supported for execution`,
            output: 'Supported languages: python, javascript, typescript, bash',
          },
          { status: 400 }
        );
    }

    // Execute the code with timeout
    const result = await new Promise<{ output: string; error?: string }>(
      (resolve) => {
        let stdout = '';
        let stderr = '';

        const proc = spawn(command, args, {
          timeout: 30000, // 30 second timeout
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
          },
        });

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (exitCode) => {
          if (exitCode === 0) {
            resolve({
              output: stdout || 'Code executed successfully (no output)',
            });
          } else {
            resolve({
              output: stdout,
              error: stderr || `Exit code: ${exitCode}`,
            });
          }
        });

        proc.on('error', (err) => {
          resolve({ output: '', error: `Failed to execute: ${err.message}` });
        });

        // Kill after timeout
        setTimeout(() => {
          proc.kill('SIGTERM');
          resolve({ output: stdout, error: 'Execution timed out (30s limit)' });
        }, 30000);
      }
    );

    return NextResponse.json({
      output: result.error
        ? `${result.output}\n\nError: ${result.error}`
        : result.output,
      success: !result.error,
    });
  } catch (error) {
    console.error('Execute error:', error);
    return NextResponse.json(
      {
        error: 'Execution failed',
        output: String(error),
      },
      { status: 500 }
    );
  }
}
