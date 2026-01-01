import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * GET /api/models
 * Scans ~/.odax/models directory for available .gguf model files
 */
export async function GET() {
  try {
    const modelsDir = join(homedir(), '.odax', 'models');

    let files: string[] = [];
    try {
      files = readdirSync(modelsDir);
    } catch {
      // Directory doesn't exist
      return NextResponse.json({
        models: [],
        error: 'Models directory not found',
      });
    }

    const models = files
      .filter((file) => file.endsWith('.gguf'))
      .map((file) => {
        const filePath = join(modelsDir, file);
        const stats = statSync(filePath);
        const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);

        // Extract model name from filename
        // e.g., "qwen2.5-3b-instruct-q4_k_m.gguf" -> "qwen2.5-3b-instruct-q4-k-m"
        const name = file.replace(/\.gguf$/i, '').replace(/_/g, '-');

        return {
          id: filePath, // Full path as ID for llama.cpp
          name: name,
          filename: file,
          size: `${sizeGB} GB`,
          sizeBytes: stats.size,
          path: filePath,
        };
      });

    console.log(`📦 Found ${models.length} models in ${modelsDir}`);

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error scanning models:', error);
    return NextResponse.json(
      { models: [], error: String(error) },
      { status: 500 }
    );
  }
}
