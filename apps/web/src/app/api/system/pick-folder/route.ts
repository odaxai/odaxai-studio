// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // AppleScript command to prompt for folder selection
    // "choose folder" returns an alias, "POSIX path of" converts it to a standard path
    const command = `osascript -e 'try' -e 'POSIX path of (choose folder with prompt "Select a folder to index")' -e 'end try'`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Folder picker stderr:', stderr);
      // AppleScript might output to stderr even on success or cancellation,
      // but if stdout is empty/newline, it likely means cancelled or failed
    }

    const path = stdout.trim();

    if (!path) {
      return NextResponse.json(
        { message: 'Selection cancelled' },
        { status: 400 }
      );
    }

    return NextResponse.json({ path });
  } catch (error) {
    console.error('Folder picker error:', error);
    return NextResponse.json(
      { error: 'Failed to open folder picker' },
      { status: 500 }
    );
  }
}
