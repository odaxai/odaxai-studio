import { NextRequest, NextResponse } from 'next/server';
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
    const { code, filename } = await req.json();

    if (!code || !filename) {
      return NextResponse.json(
        { error: 'Code and filename required' },
        { status: 400 }
      );
    }

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create a project folder for the current date
    const date = new Date();
    const projectFolder = `project_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const projectPath = path.join(PROJECTS_DIR, projectFolder);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Write the file
    const filePath = path.join(projectPath, safeFilename);
    fs.writeFileSync(filePath, code, 'utf-8');

    console.log(`✅ Saved code to: ${filePath}`);

    return NextResponse.json({
      success: true,
      path: filePath,
      projectFolder,
      filename: safeFilename,
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save file',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// GET - list saved projects
export async function GET() {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      return NextResponse.json({ projects: [] });
    }

    const folders = fs
      .readdirSync(PROJECTS_DIR)
      .filter((f) => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory())
      .map((folder) => {
        const folderPath = path.join(PROJECTS_DIR, folder);
        const files = fs.readdirSync(folderPath);
        return {
          name: folder,
          files,
          path: folderPath,
        };
      });

    return NextResponse.json({ projects: folders });
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json({ projects: [], error: String(error) });
  }
}
