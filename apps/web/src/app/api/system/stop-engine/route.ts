import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    // Force kill llama-server process
    exec('pkill -9 -f llama-server', (error) => {
      if (error) {
        console.warn('No llama-server process found or failed to kill');
      } else {
        console.log('Successfully killed llama-server (SIGKILL)');
      }
      resolve(NextResponse.json({ status: 'stopped', message: 'AI Engine stopped' }));
    });
  });
}
