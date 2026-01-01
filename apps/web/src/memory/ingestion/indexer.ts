/**
 * Indexer
 * Core indexing logic for Memory Service
 * Processes files, generates embeddings, and stores in LanceDB
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryDocument,
  MemoryConfig,
  IndexingStatus,
  DocumentType,
} from '../schema/types';
import { insertDocuments, documentExistsByHash } from '../lancedbClient';
import { ScannedFile, scanDirectories } from './fileScanner';
import { parseText, cleanText } from './parsers/textParser';
import { parseCode, detectLanguage } from './parsers/codeParser';
import { parsePdf, isPdf } from './parsers/pdfParser';
import { parseImage, isImage, getImageEmbedding } from './parsers/imageParser';

// Status tracking
let currentStatus: IndexingStatus = {
  isIndexing: false,
  totalFiles: 0,
  processedFiles: 0,
  errors: [],
};

/**
 * Get current indexing status
 */
export function getIndexingStatus(): IndexingStatus {
  return { ...currentStatus };
}

/**
 * Compute file hash for deduplication
 */
async function computeFileHash(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get text embedding from local LLM
 *
 * TODO: Use local embedding model (llama.cpp with embedding endpoint)
 */
async function getTextEmbedding(text: string): Promise<number[]> {
  try {
    // Call local embedding endpoint
    const response = await fetch('http://localhost:8081/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text.slice(0, 8000), // Limit input size
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data?.[0]?.embedding) {
        return data.data[0].embedding;
      }
    }
  } catch (error) {
    console.warn('Embedding API not available, using zero vector');
  }

  // Fallback: zero vector (will still allow keyword search)
  return new Array(384).fill(0);
}

/**
 * Process a single file for indexing
 */
async function processFile(
  file: ScannedFile,
  config: MemoryConfig
): Promise<MemoryDocument[]> {
  const documents: MemoryDocument[] = [];

  try {
    // Check for duplicates
    const hash = await computeFileHash(file.path);
    if (await documentExistsByHash(hash)) {
      console.log(`⏭️ Skipping duplicate: ${file.path}`);
      return [];
    }

    const content = await fs.promises.readFile(file.path);
    let chunks: string[] = [];
    let textContent = '';

    // Parse based on type
    switch (file.type) {
      case 'code':
        const language = detectLanguage(file.path);
        const codeResult = parseCode(
          content.toString('utf-8'),
          language,
          config.chunkSize,
          config.chunkOverlap
        );
        textContent = codeResult.content;
        chunks = codeResult.chunks;
        break;

      case 'pdf':
        const pdfResult = await parsePdf(
          content,
          config.chunkSize,
          config.chunkOverlap
        );
        textContent = pdfResult.content;
        chunks = pdfResult.chunks;
        break;

      case 'image':
        // For images, we store metadata and image embedding
        const imageInfo = await parseImage(file.path, content);
        const imageEmbedding = await getImageEmbedding(content);

        documents.push({
          id: uuidv4(),
          path: file.path,
          type: 'image',
          hash,
          vector: imageEmbedding,
          content: file.path, // Store path as content for images
          metadata: {
            ...imageInfo.metadata,
            createdAt: file.createdAt,
            modifiedAt: file.modifiedAt,
            size: file.size,
            folder: file.path.substring(0, file.path.lastIndexOf('/')),
          },
        });
        return documents;

      case 'text':
      default:
        const textResult = parseText(
          cleanText(content.toString('utf-8')),
          config.chunkSize,
          config.chunkOverlap
        );
        textContent = textResult.content;
        chunks = textResult.chunks;
        break;
    }

    // Create documents for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getTextEmbedding(chunk);

      documents.push({
        id: uuidv4(),
        path: file.path,
        type: file.type,
        hash: i === 0 ? hash : `${hash}-chunk-${i}`,
        vector: embedding,
        content: config.storeSnippets ? chunk.slice(0, 500) : undefined,
        metadata: {
          title: file.path.split('/').pop(),
          createdAt: file.createdAt,
          modifiedAt: file.modifiedAt,
          size: file.size,
          folder: file.path.substring(0, file.path.lastIndexOf('/')),
          extension: file.path.slice(file.path.lastIndexOf('.')),
          language:
            file.type === 'code' ? detectLanguage(file.path) : undefined,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to process file: ${file.path}`, error);
    currentStatus.errors.push(`${file.path}: ${error}`);
  }

  return documents;
}

/**
 * Index all files in configured directories
 */
export async function indexFiles(config: MemoryConfig): Promise<void> {
  if (!config.enabled) {
    console.log('Memory indexing is disabled');
    return;
  }

  if (currentStatus.isIndexing) {
    console.log('Indexing already in progress');
    return;
  }

  // Reset status
  currentStatus = {
    isIndexing: true,
    totalFiles: 0,
    processedFiles: 0,
    errors: [],
  };

  try {
    console.log('🔍 Scanning directories...');
    const files = await scanDirectories(config.indexedFolders, config);
    currentStatus.totalFiles = files.length;
    console.log(`📁 Found ${files.length} files to index`);

    // Process files in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const allDocs: MemoryDocument[] = [];

      for (const file of batch) {
        currentStatus.currentFile = file.path;
        const docs = await processFile(file, config);
        allDocs.push(...docs);
        currentStatus.processedFiles++;
      }

      if (allDocs.length > 0) {
        await insertDocuments(allDocs);
      }

      console.log(
        `📊 Progress: ${currentStatus.processedFiles}/${currentStatus.totalFiles}`
      );
    }

    currentStatus.lastIndexedAt = Date.now();
    console.log('✅ Indexing complete!');
  } catch (error) {
    console.error('Indexing failed:', error);
    currentStatus.errors.push(`Indexing failed: ${error}`);
  } finally {
    currentStatus.isIndexing = false;
    currentStatus.currentFile = undefined;
  }
}
