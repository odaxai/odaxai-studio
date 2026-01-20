// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Memory API
 * Query and retrieval interface for the Memory Service
 */

import {
  searchByVector,
  searchByKeyword,
  getDocumentCount,
  clearAllDocuments,
} from '../lancedbClient';
import { MemorySearchResult, DocumentType, MemoryStats } from '../schema/types';

export interface SearchOptions {
  limit?: number;
  types?: DocumentType[];
  folders?: string[];
  minScore?: number;
}

/**
 * Get text embedding for query
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:8081/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data?.[0]?.embedding) {
        return data.data[0].embedding;
      }
    }
  } catch (error) {
    console.warn('Embedding API not available');
  }

  return new Array(384).fill(0);
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {}
): Promise<MemorySearchResult[]> {
  const { limit = 10, types, folders, minScore = 0 } = options;

  const embedding = await getQueryEmbedding(query);
  let results = await searchByVector(embedding, limit * 2); // Fetch more for filtering

  // Apply filters
  if (types?.length) {
    results = results.filter((r) => types.includes(r.document.type));
  }

  if (folders?.length) {
    results = results.filter((r) =>
      folders.some((f) => r.document.metadata.folder.startsWith(f))
    );
  }

  if (minScore > 0) {
    results = results.filter((r) => r.score >= minScore);
  }

  return results.slice(0, limit);
}

/**
 * Keyword-based search
 */
export async function keywordSearch(
  query: string,
  options: SearchOptions = {}
): Promise<MemorySearchResult[]> {
  const { limit = 10, types, folders } = options;

  let results = await searchByKeyword(query, limit * 2);

  // Apply filters
  if (types?.length) {
    results = results.filter((r) => types.includes(r.document.type));
  }

  if (folders?.length) {
    results = results.filter((r) =>
      folders.some((f) => r.document.metadata.folder.startsWith(f))
    );
  }

  return results.slice(0, limit);
}

/**
 * Hybrid search combining semantic and keyword
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<MemorySearchResult[]> {
  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, options),
    keywordSearch(query, options),
  ]);

  // Merge and deduplicate results
  const seen = new Set<string>();
  const merged: MemorySearchResult[] = [];

  for (const result of [...semantic, ...keyword]) {
    if (!seen.has(result.document.id)) {
      seen.add(result.document.id);
      merged.push(result);
    }
  }

  // Sort by score
  merged.sort((a, b) => b.score - a.score);

  return merged.slice(0, options.limit || 10);
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  const count = await getDocumentCount();

  return {
    totalDocuments: count,
    documentsByType: {
      text: 0, // TODO: implement type counting
      code: 0,
      pdf: 0,
      image: 0,
    },
    totalSize: 0, // TODO: implement size tracking
    indexedFolders: [],
  };
}

/**
 * Clear all memory
 */
export async function clearMemory(): Promise<void> {
  await clearAllDocuments();
  console.log('🗑️ Memory cleared');
}

/**
 * Get RAG context for chat/LLM
 */
export async function getRAGContext(
  query: string,
  maxTokens: number = 4000
): Promise<string> {
  const results = await semanticSearch(query, { limit: 5 });

  let context = '';
  let estimatedTokens = 0;

  for (const result of results) {
    const snippet = result.document.content || '';
    const entry = `\n---\nSource: ${result.document.path}\n${snippet}\n`;

    // Rough token estimation (4 chars per token)
    const entryTokens = Math.ceil(entry.length / 4);

    if (estimatedTokens + entryTokens > maxTokens) {
      break;
    }

    context += entry;
    estimatedTokens += entryTokens;
  }

  return context;
}
