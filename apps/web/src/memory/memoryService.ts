/**
 * Memory Service
 * Main facade for the Global Memory layer
 *
 * This is the single entry point for all memory operations:
 * - Indexing local files
 * - Searching/retrieving documents
 * - Managing memory configuration
 * - Providing RAG context to Chat/Search/Code
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG,
  IndexingStatus,
  MemoryStats,
  MemorySearchResult,
} from './schema/types';
import { initLanceDB } from './lancedbClient';
import { indexFiles, getIndexingStatus } from './ingestion/indexer';
import {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  clearMemory,
  getMemoryStats,
  getRAGContext,
  SearchOptions,
} from './api/memoryApi';

const CONFIG_PATH = '.odax/memory/config.json';

// Singleton config
let memoryConfig: MemoryConfig = { ...DEFAULT_MEMORY_CONFIG };
let isInitialized = false;

/**
 * Initialize the Memory Service
 */
export async function initMemoryService(): Promise<void> {
  if (isInitialized) return;

  try {
    // Load config
    await loadConfig();

    // Initialize LanceDB
    await initLanceDB();

    isInitialized = true;
    console.log('✅ Memory Service initialized');
  } catch (error) {
    console.error('Failed to initialize Memory Service:', error);
    throw error;
  }
}

/**
 * Load configuration from disk
 */
async function loadConfig(): Promise<void> {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      memoryConfig = { ...DEFAULT_MEMORY_CONFIG, ...JSON.parse(content) };
    } else {
      await saveConfig();
    }
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error);
    memoryConfig = { ...DEFAULT_MEMORY_CONFIG };
  }
}

/**
 * Save configuration to disk
 */
async function saveConfig(): Promise<void> {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(memoryConfig, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// ==========================================
// Configuration API
// ==========================================

export function getConfig(): MemoryConfig {
  return { ...memoryConfig };
}

export async function updateConfig(
  updates: Partial<MemoryConfig>
): Promise<MemoryConfig> {
  memoryConfig = { ...memoryConfig, ...updates };
  await saveConfig();
  return getConfig();
}

export async function enableMemory(enabled: boolean): Promise<void> {
  await updateConfig({ enabled });
}

export async function setIndexedFolders(folders: string[]): Promise<void> {
  await updateConfig({ indexedFolders: folders });
}

export async function addIndexedFolder(folder: string): Promise<void> {
  const current = memoryConfig.indexedFolders;
  if (!current.includes(folder)) {
    await updateConfig({ indexedFolders: [...current, folder] });
  }
}

export async function removeIndexedFolder(folder: string): Promise<void> {
  await updateConfig({
    indexedFolders: memoryConfig.indexedFolders.filter((f) => f !== folder),
  });
}

// ==========================================
// Indexing API
// ==========================================

export async function startIndexing(): Promise<void> {
  await initMemoryService();
  await indexFiles(memoryConfig);
}

export function getStatus(): IndexingStatus {
  return getIndexingStatus();
}

// ==========================================
// Search API (exported from memoryApi)
// ==========================================

export {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  getRAGContext,
  getMemoryStats,
  clearMemory,
};
export type { SearchOptions };

// ==========================================
// Convenience Methods for RAG
// ==========================================

/**
 * Query memory for relevant context (main RAG entry point)
 */
export async function query(
  queryText: string,
  options: SearchOptions = {}
): Promise<MemorySearchResult[]> {
  await initMemoryService();
  return hybridSearch(queryText, options);
}

/**
 * Get context for LLM injection
 */
export async function getContextForLLM(
  queryText: string,
  maxTokens: number = 4000
): Promise<string> {
  await initMemoryService();

  if (!memoryConfig.enabled) {
    return '';
  }

  return getRAGContext(queryText, maxTokens);
}

/**
 * Check if memory is enabled and has content
 */
export async function isMemoryAvailable(): Promise<boolean> {
  if (!memoryConfig.enabled) return false;

  try {
    const stats = await getMemoryStats();
    return stats.totalDocuments > 0;
  } catch {
    return false;
  }
}
