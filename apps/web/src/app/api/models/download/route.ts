import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const homeDir = os.homedir();
const modelsDir = path.join(homeDir, '.odax', 'models');
const downloadsDir = path.join(homeDir, '.odax', 'downloads');

// Ensure directories exist
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

// Download state file
function getProgressFile(filename: string) {
  return path.join(downloadsDir, `${filename}.progress.json`);
}

function saveProgress(filename: string, data: any) {
  fs.writeFileSync(getProgressFile(filename), JSON.stringify(data, null, 2));
}

function loadProgress(filename: string): any {
  const file = getProgressFile(filename);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch { }
  }
  return null;
}

// GET - Check download progress
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  
  if (!filename) {
    // List all active downloads
    const downloads: any[] = [];
    try {
      const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.progress.json'));
      for (const f of files) {
        const data = JSON.parse(fs.readFileSync(path.join(downloadsDir, f), 'utf-8'));
        downloads.push(data);
      }
    } catch { }
    return NextResponse.json({ downloads });
  }
  
  const progress = loadProgress(filename);
  if (progress) {
    return NextResponse.json(progress);
  }
  return NextResponse.json({ status: 'not_found' }, { status: 404 });
}

// POST - Start download
export async function POST(req: Request) {
  try {
    const { repo, filename } = await req.json();
    
    if (!repo || !filename) {
      return NextResponse.json({ error: 'Missing repo or filename' }, { status: 400 });
    }

    // Create folder for this model  
    const modelFolder = repo.replace('/', '_');
    const targetDir = path.join(modelsDir, modelFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    
    // Check if already exists
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 1000000) { // At least 1MB = real file
        return NextResponse.json({ 
          status: 'complete',
          path: targetPath,
          size: stats.size
        });
      }
    }

    // Initialize progress
    const startTime = Date.now();
    saveProgress(filename, {
      filename,
      repo,
      status: 'downloading',
      progress: 0,
      speed: '0 MB/s',
      eta: 'calculating...',
      downloaded: 0,
      total: 0,
      startTime,
      targetPath
    });

    // Start download in background using curl with progress
    const hfUrl = `https://huggingface.co/${repo}/resolve/main/${filename}`;
    
    // Use curl and parse progress from stderr
    const curl = spawn('curl', [
      '-L',
      '-o', targetPath,
      '--progress-bar',
      hfUrl
    ], { 
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Unref to allow parent to exit
    curl.unref();
    
    // Track progress by file size
    const trackProgress = setInterval(() => {
      try {
        if (!fs.existsSync(targetPath)) return;
        
        const stats = fs.statSync(targetPath);
        const currentSize = stats.size;
        const elapsed = (Date.now() - startTime) / 1000;
        const speedBps = currentSize / elapsed;
        const speedMBps = (speedBps / (1024 * 1024)).toFixed(2);
        
        // Estimate total from server (HuggingFace files are predictable)
        const estimatedTotal = 5000000000; // 5GB max estimate
        const progress = Math.min(99, Math.round((currentSize / estimatedTotal) * 100));
        
        const remainingBytes = estimatedTotal - currentSize;
        const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;
        const etaMinutes = Math.ceil(etaSeconds / 60);
        
        saveProgress(filename, {
          filename,
          repo,
          status: 'downloading',
          progress,
          speed: `${speedMBps} MB/s`,
          eta: etaMinutes > 60 ? `${Math.ceil(etaMinutes/60)}h` : `${etaMinutes}m`,
          downloaded: currentSize,
          downloadedMB: (currentSize / (1024 * 1024)).toFixed(1),
          total: estimatedTotal,
          startTime,
          targetPath
        });
      } catch (e) {
        // Ignore errors
      }
    }, 1000);

    curl.on('close', (code) => {
      clearInterval(trackProgress);
      
      if (code === 0 && fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        if (stats.size > 1000000) {
          saveProgress(filename, {
            filename,
            repo,
            status: 'complete',
            progress: 100,
            speed: '0 MB/s',
            eta: 'done',
            downloaded: stats.size,
            downloadedMB: (stats.size / (1024 * 1024)).toFixed(1),
            total: stats.size,
            targetPath
          });
        } else {
          // Failed - file too small
          fs.unlinkSync(targetPath);
          saveProgress(filename, {
            filename,
            repo,
            status: 'error',
            error: 'File not found on HuggingFace'
          });
        }
      } else {
        saveProgress(filename, {
          filename,
          repo,
          status: 'error',
          error: 'Download failed'
        });
      }
    });

    return NextResponse.json({ 
      status: 'started',
      filename,
      targetPath
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Cancel download and remove files
export async function DELETE(req: Request) {
  try {
    const { filename, repo } = await req.json();
    
    if (filename) {
      // Remove progress file
      const progressFile = getProgressFile(filename);
      if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
      }
      
      // Kill curl process
      try {
        spawn('pkill', ['-f', filename]);
      } catch {}
      
      // Remove the model folder if repo is provided
      if (repo) {
        const modelFolder = repo.replace('/', '_');
        const targetDir = path.join(modelsDir, modelFolder);
        
        if (fs.existsSync(targetDir)) {
          // Remove entire folder
          fs.rmSync(targetDir, { recursive: true, force: true });
          console.log(`🗑️ Removed folder: ${targetDir}`);
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cancel error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
