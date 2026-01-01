/**
 * Vector Memory Service
 * Manages user interactions (chat history) in LanceDB with embeddings
 */

import { connect, Connection, Table } from '@lancedb/lancedb';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const DB_PATH = path.join(os.homedir(), '.odax', 'memory', 'user_lancedb');
const TABLE_NAME = 'user_interactions';

interface UserInteraction {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  vector: number[];
}

let connection: Connection | null = null;

async function initDB(): Promise<Connection> {
  if (connection) return connection;

  // Ensure directory exists
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  connection = await connect(DB_PATH);
  return connection;
}

async function getTable(): Promise<Table> {
  const db = await initDB();
  const tableNames = await db.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    return await db.openTable(TABLE_NAME);
  }

  // Create table with schema
  // Vector dimension 768 for nomic-embed-text
  return await db.createTable(TABLE_NAME, [
    {
      id: 'init',
      role: 'system',
      content: 'Memory initialized',
      timestamp: Date.now(),
      vector: new Array(768).fill(0),
    },
  ]);
}

/**
 * Generate embedding using Ollama
 */
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text.slice(0, 8000),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.embedding && Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch (err) {
    console.error('Embedding generation failed:', err);
  }

  // Fallback zero vector
  return new Array(768).fill(0);
}

/**
 * Add a user interaction to vector memory
 */
export async function addToVectorMemory(
  role: string,
  content: string
): Promise<void> {
  try {
    const table = await getTable();
    const vector = await getEmbedding(content);

    await table.add([
      {
        id: uuidv4(),
        role,
        content,
        timestamp: Date.now(),
        vector,
      },
    ]);

    console.log(`🧠 Added to vector memory: ${content.slice(0, 50)}...`);
  } catch (error) {
    console.error('Failed to add to vector memory:', error);
  }
}

/**
 * Search vector memory for relevant context
 */
export async function searchVectorMemory(
  query: string,
  limit = 5
): Promise<string> {
  try {
    const table = await getTable();
    const queryVector = await getEmbedding(query);

    const results = await table.search(queryVector).limit(limit).toArray();

    // Filter and format results
    // We filter out the initialization entry
    const relevantDocs = results
      .filter((r: any) => r.id !== 'init')
      .map(
        (r: any) =>
          `${r.role === 'user' ? 'User' : 'Assistant'}: ${r.content} (${new Date(r.timestamp).toLocaleDateString()})`
      );

    return relevantDocs.join('\n\n');
  } catch (error) {
    console.error('Failed to search vector memory:', error);
    return '';
  }
}

/**
 * Clear vector memory
 */
export async function clearVectorMemory(): Promise<void> {
  try {
    const db = await initDB();
    const tables = await db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      await db.dropTable(TABLE_NAME);
    }
  } catch (error) {
    console.error('Failed to clear vector memory:', error);
  }
}
