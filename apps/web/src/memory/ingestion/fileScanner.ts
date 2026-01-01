/**
 * File Scanner
 * Walks directories to find files for indexing
 */

import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { DocumentType, MemoryConfig } from '../schema/types';
import { detectLanguage } from './parsers/codeParser';
import { isImage } from './parsers/imageParser';
import { isPdf } from './parsers/pdfParser';

export interface ScannedFile {
  path: string;
  type: DocumentType;
  size: number;
  modifiedAt: number;
  createdAt: number;
}

const CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.swift',
  '.kt',
  '.rb',
  '.php',
  '.css',
  '.scss',
  '.html',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.sql',
  '.sh',
  '.bash',
];

const TEXT_EXTENSIONS = ['.txt', '.log', '.env', '.ini', '.cfg', '.conf'];

/**
 * Determine document type from file path
 */
export function getDocumentType(filePath: string): DocumentType {
  const ext = path.extname(filePath).toLowerCase();

  if (isImage(filePath)) return 'image';
  if (isPdf(filePath)) return 'pdf';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';

  // Default to text for unknown extensions
  return 'text';
}

/**
 * Check if file should be excluded based on patterns
 */
export function shouldExclude(
  filePath: string,
  excludePatterns: string[]
): boolean {
  return excludePatterns.some((pattern) => minimatch(filePath, pattern));
}

/**
 * Scan a directory recursively for files
 */
export async function scanDirectory(
  dirPath: string,
  config: MemoryConfig
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];

  async function walk(currentPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (shouldExclude(fullPath, config.excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.promises.stat(fullPath);

            if (stats.size > config.maxFileSize) {
              continue;
            }

            files.push({
              path: fullPath,
              type: getDocumentType(fullPath),
              size: stats.size,
              modifiedAt: stats.mtimeMs,
              createdAt: stats.birthtimeMs,
            });
          } catch (error) {
            console.warn(`Failed to stat file: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read directory: ${currentPath}`, error);
    }
  }

  await walk(dirPath);
  return files;
}

/**
 * Scan multiple directories
 */
export async function scanDirectories(
  directories: string[],
  config: MemoryConfig
): Promise<ScannedFile[]> {
  const allFiles: ScannedFile[] = [];

  for (const dir of directories) {
    const files = await scanDirectory(dir, config);
    allFiles.push(...files);
  }

  return allFiles;
}
