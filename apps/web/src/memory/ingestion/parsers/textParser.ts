/**
 * Text Parser
 * Extracts content from plain text files
 */

export interface ParsedContent {
  content: string;
  chunks: string[];
}

/**
 * Parse a text file into chunks
 */
export function parseText(
  content: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): ParsedContent {
  const chunks: string[] = [];

  if (content.length <= chunkSize) {
    return { content, chunks: [content] };
  }

  let start = 0;
  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));
    start += chunkSize - chunkOverlap;
  }

  return { content, chunks };
}

/**
 * Clean text content (remove excessive whitespace, etc.)
 */
export function cleanText(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}
