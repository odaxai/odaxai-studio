// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

/**
 * Privacy & Memory Settings Page
 * Allows users to configure memory indexing and view privacy options
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  FolderOpen,
  Trash2,
  RefreshCw,
  Database,
  FileText,
  Code,
  Image as ImageIcon,
  AlertCircle,
  Check,
  X,
  Plus,
} from 'lucide-react';

interface MemoryStatus {
  isIndexing: boolean;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: string[];
}

interface MemoryConfig {
  enabled: boolean;
  indexedFolders: string[];
}

interface MemoryStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
}

export default function PrivacySettingsPage(): JSX.Element {
  const [config, setConfig] = useState<MemoryConfig>({
    enabled: false,
    indexedFolders: [],
  });
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/memory/index');
      const data = await res.json();
      setConfig(data.config || { enabled: false, indexedFolders: [] });
      setStatus(data.status || null);
      setStats(data.stats || null);
      setConsentGiven(data.config?.enabled || false);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Add folder
  const handleAddFolder = async () => {
    if (!newFolder.trim()) return;

    const folders = [...config.indexedFolders, newFolder.trim()];
    setConfig((prev) => ({ ...prev, indexedFolders: folders }));
    setNewFolder('');
  };

  // Remove folder
  const handleRemoveFolder = (folder: string) => {
    setConfig((prev) => ({
      ...prev,
      indexedFolders: prev.indexedFolders.filter((f) => f !== folder),
    }));
  };

  // Start indexing
  const handleStartIndexing = async () => {
    if (config.indexedFolders.length === 0) return;

    setIndexing(true);
    try {
      await fetch('/api/memory/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders: config.indexedFolders }),
      });
    } catch (error) {
      console.error('Failed to start indexing:', error);
    }
  };

  // Clear memory
  const handleClearMemory = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all indexed memory? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await fetch('/api/memory/index', { method: 'DELETE' });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to clear memory:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Privacy & Memory</h1>
            <p className="text-white/40">
              Configure local file indexing for Global Memory
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">
                About Local Indexing
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                OdaxAI Studio can index your local files to enable memory and
                retrieval. This feature is <strong>entirely local</strong> — no
                data is sent to external servers.
              </p>
              <ul className="text-sm text-white/50 space-y-1 mb-4">
                <li>
                  • Embeddings and metadata are stored locally in{' '}
                  <code className="text-indigo-400">.odax/memory/</code>
                </li>
                <li>• You control which folders are indexed</li>
                <li>• You can delete all indexed data at any time</li>
              </ul>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-white text-sm">
                  I understand and want to enable local memory
                </span>
              </label>
            </div>
          </div>
        </div>

        {consentGiven && (
          <>
            {/* Indexed Folders */}
            <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white">Indexed Folders</h3>
                </div>
                <span className="text-xs text-white/40">
                  {config.indexedFolders.length} folder(s)
                </span>
              </div>

              {/* Folder list */}
              <div className="space-y-2 mb-4">
                {config.indexedFolders.length === 0 ? (
                  <p className="text-white/40 text-sm py-4 text-center">
                    No folders added. Add a folder path below.
                  </p>
                ) : (
                  config.indexedFolders.map((folder) => (
                    <div
                      key={folder}
                      className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2"
                    >
                      <code className="text-sm text-white/80 truncate">
                        {folder}
                      </code>
                      <button
                        onClick={() => handleRemoveFolder(folder)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add folder */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="/path/to/folder"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddFolder}
                  disabled={!newFolder.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Indexing Status */}
            {status?.isIndexing && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  <h3 className="font-semibold text-white">
                    Indexing in Progress
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{
                        width: `${status.totalFiles > 0 ? (status.processedFiles / status.totalFiles) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-white/50">
                    <span>
                      {status.processedFiles} / {status.totalFiles} files
                    </span>
                    <span className="truncate max-w-[200px]">
                      {status.currentFile}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && stats.totalDocuments > 0 && (
              <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Memory Stats</h3>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {stats.totalDocuments}
                    </div>
                    <div className="text-xs text-white/40">Total Documents</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {stats.documentsByType?.text || 0}
                    </div>
                    <div className="text-xs text-white/40">Text</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <Code className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {stats.documentsByType?.code || 0}
                    </div>
                    <div className="text-xs text-white/40">Code</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <ImageIcon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {stats.documentsByType?.image || 0}
                    </div>
                    <div className="text-xs text-white/40">Images</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleStartIndexing}
                disabled={
                  config.indexedFolders.length === 0 || status?.isIndexing
                }
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {status?.isIndexing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Start Indexing
                  </>
                )}
              </button>

              <button
                onClick={handleClearMemory}
                disabled={stats?.totalDocuments === 0}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Memory
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
