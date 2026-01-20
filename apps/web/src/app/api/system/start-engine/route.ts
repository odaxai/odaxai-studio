// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export async function POST() {
  try {
    const homeDir = os.homedir();
    // Path to llama-server (assuming it's in path or specific location)
    // For now, we assume it's in the PATH as set by run.sh or standard install
    const modelPath = path.join(homeDir, '.odax', 'models', 'odax-model-qwen2.5-coder-7b.gguf');
    
    // We launch it in background
    const serverProcess = spawn('llama-server', [
      '-m', modelPath,
      '--port', '8081',
      '--ctx-size', '2048',
      '--parallel', '2'
    ], {
      detached: true,
      stdio: 'ignore', // Don't block
      cwd: homeDir
    });

    serverProcess.unref();

    return NextResponse.json({ status: 'started', message: 'AI Engine restarting...' });
  } catch (error) {
    console.error('Failed to start engine:', error);
    return NextResponse.json({ error: 'Failed to start engine' }, { status: 500 });
  }
}
