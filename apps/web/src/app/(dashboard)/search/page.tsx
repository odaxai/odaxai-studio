// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

/**
 * Local Deep Search Page
 * Search through local memory using the Memory Service
 */

import { useState, useRef, useEffect } from 'react';
import {
  Search,
  FileText,
  Code,
  Image as ImageIcon,
  FolderOpen,
  Bot,
  ChevronDown,
  Loader2,
  Sparkles,
  Shield,
  Database,
  Settings,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocalSearch, LocalSearchProvider } from '@/context/SearchContext';
import Link from 'next/link';

interface Model {
  name: string;
  path: string;
}

function SearchPageContent(): JSX.Element {
  const {
    query,
    setQuery,
    isSearching,
    results,
    answer,
    progress,
    status,
    steps,
    selectedModel,
    setSelectedModel,
    performSearch,
    resetSearch,
  } = useLocalSearch();

  const [models, setModels] = useState<Model[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        if (data.models?.length > 0) {
          setModels(data.models);
          if (!selectedModel) {
            setSelectedModel(data.models[0].path);
          }
        }
      } catch {}
    };
    fetchModels();
    inputRef.current?.focus();
  }, []);

  const getModelName = (path: string) =>
    path.split('/').pop()?.replace('.gguf', '').slice(0, 12) || 'Model';

  const handleSearch = () => performSearch(query, selectedModel);
  const isActive = isSearching || !!answer;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="w-full h-screen bg-[#0a0a0c] overflow-y-auto">
      {/* HEADER */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isActive
            ? 'sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur border-b border-white/10'
            : 'min-h-[60vh] flex flex-col items-center justify-center'
        }`}
      >
        <div
          className={`w-full mx-auto ${isActive ? 'max-w-5xl px-6 py-4' : 'max-w-3xl px-6'}`}
        >
          {/* Title */}
          <div className={`text-center ${isActive ? 'mb-4' : 'mb-8'}`}>
            <h1
              className={`font-bold text-white tracking-tight duration-500 ${
                isActive ? 'text-xl' : 'text-5xl md:text-6xl mb-2'
              }`}
            >
              Local Deep Search
            </h1>
            <p
              className={`text-white/40 duration-500 ${isActive ? 'text-[10px] mt-0.5' : 'text-base'}`}
            >
              Search your local files with AI-powered understanding
            </p>
          </div>

          {/* Search Bar */}
          <div
            className={`flex items-center gap-3 transition-all duration-500 ${
              isActive
                ? ''
                : 'bg-[#0a0a0c] border border-white/10 p-2 rounded-2xl shadow-2xl hover:border-white/20'
            }`}
          >
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4">
              <Search className="w-5 h-5 text-white/40 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search your documents, code, notes..."
                className="w-full py-4 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm"
              />

              {/* Model Selector */}
              <div className="relative border-l border-white/10 pl-3 ml-2">
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-xs text-white/50"
                >
                  <Bot className="w-4 h-4" />
                  <span className="max-w-[80px] truncate hidden sm:block">
                    {selectedModel ? getModelName(selectedModel) : 'Model'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showModelSelector && models.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50">
                    {models.map((model, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedModel(model.path);
                          setShowModelSelector(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 ${
                          selectedModel === model.path
                            ? 'text-indigo-400'
                            : 'text-white/70'
                        }`}
                      >
                        {getModelName(model.path)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            {(isActive || answer) && (
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className={`px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  isSearching
                    ? 'bg-white/5 text-white/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            )}
          </div>

          {/* Badges */}
          <div
            className={`flex items-center justify-center gap-4 mt-6 ${isActive ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
              <Shield className="w-3 h-3" />
              <span>100% Local • No cloud</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/5 px-3 py-1.5 rounded-full border border-indigo-500/10">
              <Database className="w-3 h-3" />
              <span>Powered by Global Memory</span>
            </div>
            <Link
              href="/settings/privacy"
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
            >
              <Settings className="w-3 h-3" />
              <span>Configure Memory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <main className="max-w-5xl mx-auto px-6 py-6 pb-32">
        {/* Progress */}
        {isSearching && (
          <div className="mb-8">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Local Results */}
        {results.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Found {results.length} documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate mb-1">
                        {result.title}
                      </div>
                      <div className="text-xs text-white/40 truncate mb-2">
                        {result.folder}
                      </div>
                      {result.snippet && (
                        <p className="text-xs text-white/60 line-clamp-2">
                          {result.snippet}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {Math.round(result.score * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div className="bg-[#0d0d10] rounded-2xl border border-white/5 p-8">
            <ReactMarkdown className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-indigo-400">
              {answer}
            </ReactMarkdown>
          </div>
        )}

        {/* Empty State */}
        {!isActive && !answer && results.length === 0 && (
          <div className="text-center py-16">
            <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 mb-2">
              Search your indexed local files
            </p>
            <Link
              href="/settings/privacy"
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Configure folders to index →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage(): JSX.Element {
  return (
    <LocalSearchProvider>
      <SearchPageContent />
    </LocalSearchProvider>
  );
}
