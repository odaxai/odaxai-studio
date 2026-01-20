// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * PDF Parser
 * Placeholder for PDF text extraction
 *
 * Note: Full implementation requires pdf-parse or similar library
 * For now, this provides the interface for future implementation
 */

import { ParsedContent, parseText } from './textParser';

/**
 * Parse PDF file content
 *
 * TODO: Implement with pdf-parse library
 * npm install pdf-parse
 */
export async function parsePdf(
  buffer: Buffer,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<ParsedContent> {
  // Placeholder - would use pdf-parse in production
  // import pdf from 'pdf-parse';
  // const data = await pdf(buffer);
  // return parseText(data.text, chunkSize, chunkOverlap);

  console.warn('PDF parsing not yet implemented - placeholder');
  return { content: '', chunks: [] };
}

/**
 * Check if file is a PDF
 */
export function isPdf(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.pdf');
}
