// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';

const homeDir = os.homedir();
const modelsDir = path.join(homeDir, '.odax', 'models');
const dbPath = path.join(homeDir, '.odax', 'models.json');



// Save models database
function saveDB(data: { models: any[] }) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save models.json:', e);
  }
}

// Scan folder and update database
function scanModels(): any[] {
  const models: any[] = [];
  
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    saveDB({ models: [] });
    return [];
  }

  // Scan for GGUF files
  function scanDir(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.endsWith('.gguf')) {
          const parentDir = path.basename(path.dirname(fullPath));
          const sizeGB = (stat.size / (1024 * 1024 * 1024)).toFixed(2);
          
          // Determine category from name
          let category = 'chat';
          const nameLower = item.toLowerCase();
          if (nameLower.includes('coder') || nameLower.includes('code')) {
            category = 'coding';
          } else if (nameLower.includes('mistral')) {
            category = 'rag';
          }
          
          models.push({
            id: fullPath,
            name: item.replace('.gguf', '').replace(/-/g, ' ').replace(/_/g, ' '),
            filename: item,
            path: fullPath,
            folder: parentDir,
            size: `${sizeGB} GB`,
            sizeBytes: stat.size,
            category,
            installed: true,
            installedAt: stat.mtime.toISOString()
          });
        }
      }
    } catch (e) {
      console.error('Scan error:', e);
    }
  }
  
  scanDir(modelsDir);
  
  // Save to database
  saveDB({ models });
  
  return models;
}

// GET - List all models (scan and return)
export async function GET() {
  try {
    const models = scanModels();
    return NextResponse.json({ 
      models,
      count: models.length,
      path: modelsDir
    });
  } catch (error) {
    console.error('Failed to list models:', error);
    return NextResponse.json({ models: [], error: 'Failed to scan models' }, { status: 500 });
  }
}

// DELETE - Remove a model and its folder
export async function DELETE(req: Request) {
  try {
    const { path: modelPath } = await req.json();
    
    if (!modelPath || !modelPath.endsWith('.gguf')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Security check: ensure it's inside .odax/models
    if (!modelPath.startsWith(modelsDir)) {
       return NextResponse.json({ error: 'Unauthorized path' }, { status: 403 });
    }

    if (fs.existsSync(modelPath)) {
      // Delete the model file
      fs.unlinkSync(modelPath);
      console.log(`🗑️ Deleted model: ${modelPath}`);
      
      // Also delete the parent folder if it's a repo folder and empty or only has one file
      const parentDir = path.dirname(modelPath);
      if (parentDir !== modelsDir && parentDir.startsWith(modelsDir)) {
        const remainingFiles = fs.existsSync(parentDir) ? fs.readdirSync(parentDir) : [];
        if (remainingFiles.length === 0) {
          fs.rmSync(parentDir, { recursive: true, force: true });
          console.log(`🗑️ Deleted empty folder: ${parentDir}`);
        }
      }
      
      // Rescan and update database
      scanModels();
      
      return NextResponse.json({ success: true, deleted: modelPath });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
