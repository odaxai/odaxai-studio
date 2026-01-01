/**
 * Code Parser
 * Extracts content from source code files with language awareness
 */

import { ParsedContent, cleanText } from './textParser';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
};

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return LANGUAGE_EXTENSIONS[ext] || 'text';
}

/**
 * Parse code file into semantic chunks (by function/class boundaries when possible)
 */
export function parseCode(
  content: string,
  language: string,
  chunkSize: number = 1500,
  chunkOverlap: number = 300
): ParsedContent {
  const cleaned = cleanText(content);
  const chunks: string[] = [];

  // Try to split by function/class boundaries for better semantic chunking
  const boundaries = findCodeBoundaries(cleaned, language);

  if (boundaries.length > 1) {
    for (const boundary of boundaries) {
      if (boundary.length > chunkSize) {
        // Sub-chunk large sections
        let start = 0;
        while (start < boundary.length) {
          chunks.push(boundary.slice(start, start + chunkSize));
          start += chunkSize - chunkOverlap;
        }
      } else if (boundary.trim()) {
        chunks.push(boundary);
      }
    }
  } else {
    // Fall back to simple chunking
    let start = 0;
    while (start < cleaned.length) {
      chunks.push(cleaned.slice(start, start + chunkSize));
      start += chunkSize - chunkOverlap;
    }
  }

  return { content: cleaned, chunks };
}

/**
 * Find semantic boundaries in code (functions, classes, etc.)
 */
function findCodeBoundaries(content: string, language: string): string[] {
  const lines = content.split('\n');
  const boundaries: string[] = [];
  let currentBlock: string[] = [];

  const functionPatterns: Record<string, RegExp[]> = {
    typescript: [
      /^(export\s+)?(async\s+)?function\s+/,
      /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
      /^(export\s+)?class\s+/,
    ],
    javascript: [
      /^(export\s+)?(async\s+)?function\s+/,
      /^(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
      /^class\s+/,
    ],
    python: [/^(async\s+)?def\s+/, /^class\s+/],
    rust: [
      /^(pub\s+)?(async\s+)?fn\s+/,
      /^(pub\s+)?struct\s+/,
      /^(pub\s+)?impl\s+/,
    ],
    go: [/^func\s+/, /^type\s+\w+\s+struct/],
  };

  const patterns = functionPatterns[language] || [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isNewBoundary = patterns.some((p) => p.test(trimmed));

    if (isNewBoundary && currentBlock.length > 0) {
      boundaries.push(currentBlock.join('\n'));
      currentBlock = [];
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    boundaries.push(currentBlock.join('\n'));
  }

  return boundaries;
}
