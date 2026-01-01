'use client';

/**
 * Local Search Context
 * Provides local-only search functionality using the Memory Service
 *
 * This replaces the web-based SearchContext for the Local-First architecture
 */

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';

export interface LocalSearchResult {
  id: string;
  path: string;
  title: string;
  type: 'text' | 'code' | 'pdf' | 'image';
  snippet?: string;
  score: number;
  folder: string;
}

export interface SearchStep {
  id: number;
  type: 'thinking' | 'searching' | 'analyzing' | 'complete';
  content: string;
  timestamp: number;
}

interface LocalSearchContextType {
  query: string;
  setQuery: (q: string) => void;
  isSearching: boolean;
  results: LocalSearchResult[];
  answer: string;
  progress: number;
  status: string;
  steps: SearchStep[];
  selectedModel: string | null;
  setSelectedModel: (m: string | null) => void;
  performSearch: (q: string, modelPath: string | null) => Promise<void>;
  resetSearch: () => void;
}

const LocalSearchContext = createContext<LocalSearchContextType | undefined>(
  undefined
);

export function LocalSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LocalSearchResult[]>([]);
  const [answer, setAnswer] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [steps, setSteps] = useState<SearchStep[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const addStep = (type: SearchStep['type'], content: string) => {
    setSteps((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  };

  const resetSearch = useCallback(() => {
    setResults([]);
    setAnswer('');
    setProgress(0);
    setStatus('');
    setSteps([]);
    setIsSearching(false);
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string, modelPath: string | null) => {
      if (!searchQuery.trim() || isSearching) return;

      resetSearch();
      setIsSearching(true);
      setQuery(searchQuery);

      try {
        // Step 1: Query Memory
        addStep('thinking', `Analyzing query: "${searchQuery}"`);
        setStatus('Searching local memory...');
        setProgress(10);

        // Call local memory API
        const memoryResponse = await fetch('/api/memory/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, limit: 20 }),
        });

        if (!memoryResponse.ok) {
          throw new Error('Memory search failed');
        }

        const memoryData = await memoryResponse.json();
        addStep(
          'searching',
          `Found ${memoryData.results?.length || 0} relevant documents`
        );
        setProgress(40);

        // Transform results
        const localResults: LocalSearchResult[] = (
          memoryData.results || []
        ).map((r: any) => ({
          id: r.document.id,
          path: r.document.path,
          title: r.document.metadata?.title || r.document.path.split('/').pop(),
          type: r.document.type,
          snippet: r.snippet || r.document.content?.slice(0, 200),
          score: r.score,
          folder: r.document.metadata?.folder || '',
        }));

        setResults(localResults);
        setProgress(60);

        // Step 2: Generate synthesis with LLM
        if (localResults.length > 0 && modelPath) {
          addStep(
            'analyzing',
            'Synthesizing information from local sources...'
          );
          setStatus('Generating response...');

          // Build context from results
          const context = localResults
            .slice(0, 5)
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet || ''}`)
            .join('\n\n');

          // Call LLM
          const llmResponse = await fetch('/api/llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `You are a helpful assistant. Answer the user's question based on the following local documents.

USER QUESTION: "${searchQuery}"

LOCAL DOCUMENTS:
${context}

INSTRUCTIONS:
- Answer directly based on the provided documents
- Cite sources with [1], [2], etc.
- If no relevant information is found, say so clearly
- Keep the response concise and helpful

ANSWER:`,
              model_path: modelPath,
              n_predict: 2048,
              temperature: 0.3,
              stream: true,
            }),
          });

          if (llmResponse.ok && llmResponse.body) {
            const reader = llmResponse.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              for (const line of decoder
                .decode(value, { stream: true })
                .split('\n')) {
                if (line.startsWith('data:')) {
                  try {
                    const data = JSON.parse(line.slice(5));
                    if (data.content) {
                      accumulated += data.content;
                      setAnswer(accumulated);
                    }
                  } catch {}
                }
              }
            }
          }

          setProgress(100);
          addStep('complete', 'Search complete');
        } else if (localResults.length === 0) {
          setAnswer(
            'No relevant documents found in your local memory. Try indexing more folders in Settings > Memory.'
          );
          setProgress(100);
          addStep('complete', 'No results found');
        }

        setStatus('Complete');
      } catch (error) {
        console.error('Search error:', error);
        setAnswer(
          'An error occurred during search. Please check that the Memory Service is running.'
        );
        addStep('complete', 'Search failed');
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, resetSearch]
  );

  return (
    <LocalSearchContext.Provider
      value={{
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
      }}
    >
      {children}
    </LocalSearchContext.Provider>
  );
}

export function useLocalSearch() {
  const context = useContext(LocalSearchContext);
  if (!context) {
    throw new Error('useLocalSearch must be used within LocalSearchProvider');
  }
  return context;
}
