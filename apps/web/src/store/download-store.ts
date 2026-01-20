// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DownloadProgress {
  progress: number;
  speed: string;
  eta: string;
  downloadedMB: string;
}

interface ActiveDownload {
  modelId: string;
  filename: string;
  repo: string;
  progress: DownloadProgress;
  startedAt: number;
}

interface DownloadState {
  // Active download (only one at a time)
  activeDownload: ActiveDownload | null;

  // Actions
  startDownload: (modelId: string, filename: string, repo: string) => void;
  updateProgress: (progress: DownloadProgress) => void;
  completeDownload: () => void;
  cancelDownload: () => void;

  // Polling ref (not persisted)
  pollingInterval: NodeJS.Timeout | null;
  setPollingInterval: (interval: NodeJS.Timeout | null) => void;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      activeDownload: null,
      pollingInterval: null,

      startDownload: (modelId, filename, repo) => {
        set({
          activeDownload: {
            modelId,
            filename,
            repo,
            progress: {
              progress: 0,
              speed: 'Starting...',
              eta: 'calculating',
              downloadedMB: '0',
            },
            startedAt: Date.now(),
          },
        });
      },

      updateProgress: (progress) => {
        const current = get().activeDownload;
        if (current) {
          set({
            activeDownload: {
              ...current,
              progress,
            },
          });
        }
      },

      completeDownload: () => {
        const interval = get().pollingInterval;
        if (interval) {
          clearInterval(interval);
        }
        set({
          activeDownload: null,
          pollingInterval: null,
        });
      },

      cancelDownload: () => {
        const interval = get().pollingInterval;
        if (interval) {
          clearInterval(interval);
        }
        set({
          activeDownload: null,
          pollingInterval: null,
        });
      },

      setPollingInterval: (interval) => {
        // Clear old interval first
        const old = get().pollingInterval;
        if (old) {
          clearInterval(old);
        }
        set({ pollingInterval: interval });
      },
    }),
    {
      name: 'odax-download-storage',
      partialize: (state) => ({
        activeDownload: state.activeDownload,
      }),
    }
  )
);

// Helper hook to start polling for download progress
export function startDownloadPolling(
  filename: string,
  onComplete: () => void,
  onError: () => void
) {
  const store = useDownloadStore.getState();

  const interval = setInterval(async () => {
    try {
      const progressRes = await fetch(
        `/api/models/download?filename=${filename}`
      );
      const data = await progressRes.json();

      if (data.status === 'complete') {
        store.completeDownload();
        onComplete();
      } else if (data.status === 'error') {
        store.completeDownload();
        onError();
      } else if (data.status === 'downloading') {
        store.updateProgress({
          progress: data.progress || 0,
          speed: data.speed || '0 MB/s',
          eta: data.eta || 'calculating',
          downloadedMB: data.downloadedMB || '0',
        });
      } else if (data.status === 'not_found') {
        // Download finished or never started
        store.completeDownload();
        onComplete();
      }
    } catch (e) {
      // Ignore poll errors
    }
  }, 1000);

  store.setPollingInterval(interval);

  return interval;
}
