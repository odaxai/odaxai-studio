// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Memory Document Types for LanceDB
 * Core schema for the Global Memory layer
 */

export type DocumentType = 'text' | 'code' | 'pdf' | 'image';

export interface DocumentMetadata {
  title?: string;
  createdAt: number;
  modifiedAt: number;
  size: number;
  folder: string;
  extension?: string;
  language?: string; // For code files
}

export interface MemoryDocument {
  id: string;
  path: string;
  type: DocumentType;
  hash: string; // For deduplication
  vector: number[];
  content?: string; // Optional text snippet for recall
  metadata: DocumentMetadata;
}

export interface MemorySearchResult {
  document: MemoryDocument;
  score: number;
  snippet?: string;
}

export interface MemoryConfig {
  enabled: boolean;
  indexedFolders: string[];
  excludePatterns: string[];
  maxFileSize: number; // bytes
  storeSnippets: boolean;
  chunkSize: number;
  chunkOverlap: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: false,
  indexedFolders: [],
  excludePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/*.map',
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  storeSnippets: true,
  chunkSize: 1000,
  chunkOverlap: 200,
};

export interface IndexingStatus {
  isIndexing: boolean;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: string[];
  lastIndexedAt?: number;
}

export interface MemoryStats {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  totalSize: number;
  indexedFolders: string[];
}
