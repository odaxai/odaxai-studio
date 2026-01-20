// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';


interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port: number;
  url: string;
  description: string;
}



// Check if a service is running by checking the port
async function checkService(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(1000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get all services status
export async function GET() {
  const services: ServiceStatus[] = [
    {
      name: 'llama-server',
      status: 'stopped',
      port: 8081,
      url: 'http://localhost:8081',
      description: 'Local AI inference engine'
    },
    {
      name: 'code-server',
      status: 'stopped',
      port: 8080,
      url: 'http://localhost:8080',
      description: 'VS Code in browser'
    },
    {
      name: 'NextChat',
      status: 'stopped',
      port: 3002,
      url: 'http://localhost:3002',
      description: 'Chat interface'
    },
    {
      name: 'Perplexica',
      status: 'stopped',
      port: 3001,
      url: 'http://localhost:3001',
      description: 'Search interface'
    }
  ];

  // Check each service
  for (const service of services) {
    try {
      service.status = await checkService(service.port) ? 'running' : 'stopped';
    } catch (error) {
      service.status = 'error';
    }
  }

  return NextResponse.json({ services });
}

// Control services (start/stop)
export async function POST(request: Request) {
  try {
    const { action, service } = await request.json();

    if (!action || !service) {
      return NextResponse.json(
        { error: 'Missing action or service parameter' },
        { status: 400 }
      );
    }

    const serviceConfigs: Record<string, { startScript: string; cwd: string; port: number }> = {
      'llama-server': {
        startScript: '../../../server/start-llama-server.sh',
        cwd: '../../../server',
        port: 8081
      },
      'code-server': {
        startScript: '../../../scripts/run-code-server.sh',
        cwd: '../../../',
        port: 8080
      },
      'NextChat': {
        startScript: '../../../scripts/run-nextchat.sh',
        cwd: '../../../',
        port: 3002
      },
      'Perplexica': {
        startScript: '../../../scripts/run-perplexica.sh',
        cwd: '../../../',
        port: 3001
      }
    };

    const config = serviceConfigs[service];
    if (!config) {
      return NextResponse.json(
        { error: 'Unknown service' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      const scriptPath = path.join(process.cwd(), config.startScript);
      const child = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.join(process.cwd(), config.cwd)
      });

      child.unref();

      return NextResponse.json({
        status: 'started',
        service,
        pid: child.pid,
        message: `${service} is starting...`
      });
    } else if (action === 'stop') {


      try {
        // Find PID using the port
        const lsof = spawn('lsof', ['-ti', `:${config.port}`], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let pid = '';
        lsof.stdout.on('data', (data: Buffer) => {
          pid += data.toString().trim();
        });

        lsof.on('close', (code: number) => {
          if (code === 0 && pid) {
            // Kill the process
            const pids = pid.split('\n').filter((p: string) => p);
            pids.forEach((processPid: string) => {
              try {
                process.kill(parseInt(processPid), 'SIGTERM');
              } catch (e) {
                // Try SIGKILL if SIGTERM fails
                try {
                  process.kill(parseInt(processPid), 'SIGKILL');
                } catch (killError) {
                  console.error(`Failed to kill process ${processPid}:`, killError);
                }
              }
            });
          }
        });

        return NextResponse.json({
          status: 'stopped',
          service,
          message: `${service} stop command sent`
        });
      } catch (error: any) {
        return NextResponse.json({
          status: 'error',
          service,
          message: `Failed to stop ${service}: ${error.message}`
        }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to control service', details: error.message },
      { status: 500 }
    );
  }
}
