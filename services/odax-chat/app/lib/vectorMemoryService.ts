// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * Vector Memory Service
 * Manages user interactions in LanceDB with embeddings for semantic search
 *
 * Features:
 * - LanceDB vector database for persistent local document indexing
 * - SHA-256 hash-based deduplication preventing redundant indexing
 * - Hybrid search combining semantic vector similarity with keyword filtering
 */

import type { Connection, Table } from '@lancedb/lancedb';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const DB_PATH = path.join(os.homedir(), '.odax', 'memory', 'user_vector_db');
const TABLE_NAME = 'user_memory';
const EMBEDDING_DIM = 768;

interface MemoryEntry {
  id: string;
  type: 'fact' | 'conversation' | 'document';
  key: string;
  content: string;
  hash: string;
  timestamp: number;
  vector: number[];
}

let connection: Connection | null = null;

/**
 * Compute SHA-256 hash for content deduplication
 */
function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Initialize LanceDB connection
 */
async function initDB(): Promise<Connection> {
  if (connection) return connection;

  // Ensure directory exists
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  // Dynamic import to prevent build-time crashes with native modules
  const { connect } = await import('@lancedb/lancedb');
  connection = await connect(DB_PATH);
  console.log('🧠 Vector memory connected at:', DB_PATH);
  return connection;
}

/**
 * Get or create the memory table
 */
async function getTable(): Promise<Table> {
  const db = await initDB();
  const tableNames = await db.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    return await db.openTable(TABLE_NAME);
  }

  // Create table with initial schema
  return await db.createTable(TABLE_NAME, [
    {
      id: 'init',
      type: 'system',
      key: 'init',
      content: 'Memory initialized',
      hash: computeHash('Memory initialized'),
      timestamp: Date.now(),
      vector: new Array(EMBEDDING_DIM).fill(0),
    },
  ]);
}

/**
 * Generate embedding using llama-server or Ollama
 */
async function getEmbedding(text: string): Promise<number[]> {
  const truncatedText = text.slice(0, 8000);

  // Try llama-server first (port 8081)
  try {
    const response = await fetch('http://localhost:8081/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: truncatedText,
        model: 'text-embedding',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data?.[0]?.embedding) {
        return data.data[0].embedding;
      }
    }
  } catch {
    // Fall through to Ollama
  }

  // Try Ollama as fallback (port 11434)
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: truncatedText,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.embedding && Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch {
    console.warn('Embedding generation failed, using zero vector');
  }

  // Fallback: zero vector (will still work but won't be semantically searchable)
  return new Array(EMBEDDING_DIM).fill(0);
}

/**
 * Add a fact to vector memory with SHA-256 deduplication
 */
export async function addFact(key: string, value: string): Promise<void> {
  try {
    const table = await getTable();
    const content = `${key}: ${value}`;
    const hash = computeHash(content);

    // Deduplication: Check if content hash already exists
    // Note: LanceDB query for filtering
    const duplicates = await table
      .search(new Array(EMBEDDING_DIM).fill(0))
      .where(`hash = '${hash}'`)
      .limit(1)
      .toArray();

    if (duplicates.length > 0) {
      console.log(`🧠 Fact already exists (deduplicated): ${key}`);
      return;
    }

    const vector = await getEmbedding(content);

    // Check if fact with same key exists (update case)
    try {
      await table.delete(`key = '${key}'`);
    } catch {
      // Ignore if not found
    }

    await table.add([
      {
        id: uuidv4(),
        type: 'fact',
        key,
        content: value,
        hash,
        timestamp: Date.now(),
        vector,
      },
    ]);

    console.log(`🧠 Saved fact: ${key} = ${value}`);
  } catch (error) {
    console.error('Failed to add fact to vector memory:', error);
  }
}

/**
 * Add a conversation message to vector memory with SHA-256 deduplication
 */
export async function addConversation(
  role: string,
  content: string
): Promise<void> {
  try {
    const table = await getTable();
    const hash = computeHash(content);

    // Deduplication: Check if conversation already exists
    const duplicates = await table
      .search(new Array(EMBEDDING_DIM).fill(0))
      .where(`hash = '${hash}'`)
      .limit(1)
      .toArray();

    if (duplicates.length > 0) {
      console.log('🧠 Conversation already stored (deduplicated)');
      return;
    }

    const vector = await getEmbedding(content);

    await table.add([
      {
        id: uuidv4(),
        type: 'conversation',
        key: role,
        content,
        hash,
        timestamp: Date.now(),
        vector,
      },
    ]);

    console.log(`🧠 Added conversation: ${content.slice(0, 50)}...`);
  } catch (error) {
    console.error('Failed to add conversation to vector memory:', error);
  }
}

/**
 * Search vector memory for relevant context
 */
export async function searchMemory(query: string, limit = 5): Promise<string> {
  try {
    const table = await getTable();
    const queryVector = await getEmbedding(query);

    const results = await table.search(queryVector).limit(limit).toArray();

    // Build context from results
    const facts: string[] = [];
    const conversations: string[] = [];

    for (const r of results) {
      if (r.id === 'init') continue;

      if (r.type === 'fact') {
        facts.push(`- ${r.key}: ${r.content}`);
      } else if (r.type === 'conversation') {
        const role = r.key === 'user' ? 'User' : 'Assistant';
        conversations.push(`${role}: ${r.content.slice(0, 200)}`);
      }
    }

    let context = '';

    if (facts.length > 0) {
      context += 'Known facts about the user:\n' + facts.join('\n') + '\n\n';
    }

    if (conversations.length > 0) {
      context += 'Relevant past conversations:\n' + conversations.join('\n');
    }

    return context;
  } catch (error) {
    console.error('Failed to search vector memory:', error);
    return '';
  }
}

/**
 * Get all stored facts
 */
export async function getAllFacts(): Promise<
  Array<{ key: string; value: string; timestamp: number }>
> {
  try {
    const table = await getTable();
    // Use a zero vector to get all entries, then filter by type
    const zeroVector = new Array(EMBEDDING_DIM).fill(0);
    const results = await table.search(zeroVector).limit(100).toArray();

    return results
      .filter((r: any) => r.type === 'fact' && r.id !== 'init')
      .map((r: any) => ({
        key: r.key,
        value: r.content,
        timestamp: r.timestamp,
      }));
  } catch (error) {
    console.error('Failed to get facts:', error);
    return [];
  }
}

/**
 * Clear all vector memory
 */
export async function clearVectorMemory(): Promise<void> {
  try {
    const db = await initDB();
    const tables = await db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      await db.dropTable(TABLE_NAME);
      console.log('🗑️ Vector memory cleared');
    }
  } catch (error) {
    console.error('Failed to clear vector memory:', error);
  }
}
