/**
 * Image Parser
 * Placeholder for image metadata and embedding extraction
 *
 * Note: Full implementation requires vision embedding model
 * For now, extracts basic metadata
 */

import { DocumentMetadata } from '../../schema/types';

export interface ImageInfo {
  width?: number;
  height?: number;
  format?: string;
  alt?: string;
}

/**
 * Parse image file for indexing
 *
 * TODO: Implement vision embeddings with local model
 */
export async function parseImage(
  filePath: string,
  buffer: Buffer
): Promise<{ metadata: Partial<DocumentMetadata>; info: ImageInfo }> {
  // Basic metadata extraction
  const format = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();

  // Would use sharp or similar for dimensions
  // import sharp from 'sharp';
  // const metadata = await sharp(buffer).metadata();

  return {
    metadata: {
      extension: format,
    },
    info: {
      format,
    },
  };
}

/**
 * Check if file is an image
 */
export function isImage(filePath: string): boolean {
  const ext = filePath.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((e) =>
    ext.endsWith(e)
  );
}

/**
 * Get image embedding (placeholder)
 *
 * TODO: Implement with local vision model
 */
export async function getImageEmbedding(buffer: Buffer): Promise<number[]> {
  console.warn('Image embedding not yet implemented - returning zero vector');
  return new Array(384).fill(0);
}
