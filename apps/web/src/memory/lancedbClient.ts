// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/**
 * LanceDB Client
 * Connection manager for vector database operations
 *
 * Note: This uses the LanceDB TypeScript SDK
 * @see https://lancedb.github.io/lancedb/
 */

import { connect, Connection, Table } from '@lancedb/lancedb';
import { MemoryDocument, MemorySearchResult } from './schema/types';

const DB_PATH = '.odax/memory/lancedb';
const TABLE_NAME = 'documents';

let connection: Connection | null = null;
let documentsTable: Table | null = null;

/**
 * Initialize LanceDB connection
 */
export async function initLanceDB(): Promise<Connection> {
  if (connection) return connection;

  try {
    connection = await connect(DB_PATH);
    console.log('✅ LanceDB connected at:', DB_PATH);
    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to LanceDB:', error);
    throw error;
  }
}

/**
 * Get or create the documents table
 */
export async function getDocumentsTable(): Promise<Table> {
  if (documentsTable) return documentsTable;

  const db = await initLanceDB();
  const tables = await db.tableNames();

  if (tables.includes(TABLE_NAME)) {
    documentsTable = await db.openTable(TABLE_NAME);
  } else {
    // Create table with initial schema
    documentsTable = await db.createTable(TABLE_NAME, [
      {
        id: 'init',
        path: '',
        type: 'text',
        hash: '',
        vector: new Array(384).fill(0), // Default embedding size
        content: '',
        metadata: JSON.stringify({
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          size: 0,
          folder: '',
        }),
      },
    ]);
    console.log('📦 Created documents table');
  }

  return documentsTable;
}

/**
 * Insert documents into the database
 */
export async function insertDocuments(
  documents: MemoryDocument[]
): Promise<void> {
  const table = await getDocumentsTable();

  const rows = documents.map((doc) => ({
    id: doc.id,
    path: doc.path,
    type: doc.type,
    hash: doc.hash,
    vector: doc.vector,
    content: doc.content || '',
    metadata: JSON.stringify(doc.metadata),
  }));

  await table.add(rows);
  console.log(`📥 Inserted ${documents.length} documents`);
}

/**
 * Search documents by vector similarity
 */
export async function searchByVector(
  queryVector: number[],
  limit: number = 10
): Promise<MemorySearchResult[]> {
  const table = await getDocumentsTable();

  const results = await table.search(queryVector).limit(limit).toArray();

  return results.map((row) => ({
    document: {
      id: row.id,
      path: row.path,
      type: row.type,
      hash: row.hash,
      vector: row.vector,
      content: row.content,
      metadata: JSON.parse(row.metadata),
    },
    score: row._distance || 0,
    snippet: row.content?.slice(0, 200),
  }));
}

/**
 * Search documents by keyword (full-text)
 */
export async function searchByKeyword(
  keyword: string,
  limit: number = 10
): Promise<MemorySearchResult[]> {
  const table = await getDocumentsTable();

  // Use SQL-like filtering for keyword search
  const results = await table
    .filter(`content LIKE '%${keyword}%'`)
    .limit(limit)
    .toArray();

  return results.map((row) => ({
    document: {
      id: row.id,
      path: row.path,
      type: row.type,
      hash: row.hash,
      vector: row.vector,
      content: row.content,
      metadata: JSON.parse(row.metadata),
    },
    score: 1,
    snippet: row.content?.slice(0, 200),
  }));
}

/**
 * Delete document by ID
 */
export async function deleteDocument(id: string): Promise<void> {
  const table = await getDocumentsTable();
  await table.delete(`id = '${id}'`);
}

/**
 * Check if document exists by hash (for deduplication)
 */
export async function documentExistsByHash(hash: string): Promise<boolean> {
  const table = await getDocumentsTable();
  const results = await table.filter(`hash = '${hash}'`).limit(1).toArray();
  return results.length > 0;
}

/**
 * Clear all documents
 */
export async function clearAllDocuments(): Promise<void> {
  const db = await initLanceDB();
  const tables = await db.tableNames();

  if (tables.includes(TABLE_NAME)) {
    await db.dropTable(TABLE_NAME);
    documentsTable = null;
    console.log('🗑️ Cleared all documents');
  }
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  const table = await getDocumentsTable();
  const count = await table.countRows();
  return count;
}
