'use client';

import { create } from 'zustand';

interface Model {
  id: string;
  name: string;
  filename: string;
  path: string;
  category: string;
  size?: string;
  installed?: boolean;
}

interface ModelStore {
  availableModels: Model[];
  activeModel: string | null;
  isLoading: boolean;
  fetchModels: () => Promise<void>;
  setActiveModel: (modelId: string) => void;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  availableModels: [],
  activeModel: null,
  isLoading: false,

  fetchModels: async () => {
    set({ isLoading: true });
    try {
      // Fetch from Dashboard API - it returns scanned models from ~/.odax/models
      const res = await fetch('http://localhost:3000/api/models', {
        mode: 'cors',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];

        console.log(`📦 Loaded ${models.length} models from ~/.odax/models`);

        // Restore active model from localStorage or use first model
        const savedModel = localStorage.getItem('odax-active-model');
        const defaultModel =
          savedModel && models.find((m: Model) => m.id === savedModel)
            ? savedModel
            : models[0]?.id;

        // Save to localStorage if we auto-selected first model
        if (!savedModel && defaultModel) {
          localStorage.setItem('odax-active-model', defaultModel);
          console.log('🎯 Auto-saved first model:', defaultModel);
        }

        set({
          availableModels: models,
          activeModel: defaultModel || get().activeModel,
        });
      } else {
        console.error('API error:', res.status);
        set({ availableModels: [] });
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      set({ availableModels: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveModel: (modelId) => {
    console.log('🎯 Active model set to:', modelId);
    localStorage.setItem('odax-active-model', modelId);
    set({ activeModel: modelId });
  },
}));
