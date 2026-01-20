// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  repo_id: string;
  filename: string;
  size: string;
  category: 'coding' | 'chat' | 'odax' | 'thinking';
  recommended?: boolean;
  comingSoon?: boolean;
}

// Verified GGUF models that work on macOS with llama.cpp
// + OdaxAI models coming soon + Thinking models for deep research
export const AVAILABLE_MODELS: ModelConfig[] = [
  // ODAX AI - Coming Soon
  {
    id: 'odax_coder_3b',
    name: 'OdaxAI Coder 3B',
    description: 'Our custom fine-tuned coding model - Coming Soon!',
    repo_id: 'OdaxAI/Coder-3B-GGUF',
    filename: 'odax-coder-3b-q4_k_m.gguf',
    size: '2.0 GB',
    category: 'odax',
    recommended: true,
    comingSoon: true,
  },
  {
    id: 'odax_chat_3b',
    name: 'OdaxAI Chat 3B',
    description: 'Lightweight chat model optimized for Mac - Coming Soon!',
    repo_id: 'OdaxAI/Chat-3B-GGUF',
    filename: 'odax-chat-3b-q4_k_m.gguf',
    size: '2.0 GB',
    category: 'odax',
    comingSoon: true,
  },

  // THINKING - For Deep Research & Reasoning
  {
    id: 'olmo_3_7b_think',
    name: 'Olmo 3 7B Think',
    description: 'Advanced reasoning model - excellent for deep thinking',
    repo_id: 'unsloth/Olmo-3-7B-Think-GGUF',
    filename: 'Olmo-3-7B-Think-Q4_K_M.gguf',
    size: '4.1 GB',
    category: 'thinking',
    recommended: true,
  },
  {
    id: 'deepthink_reasoning_7b',
    name: 'Deepthink Reasoning 7B',
    description: 'Deep reasoning model for complex analysis',
    repo_id: 'bartowski/Deepthink-Reasoning-7B-GGUF',
    filename: 'Deepthink-Reasoning-7B-IQ2_M.gguf',
    size: '2.7 GB',
    category: 'thinking',
  },
  {
    id: 'dream_instruct_7b',
    name: 'Dream v0 Instruct 7B',
    description: 'Creative reasoning for deep research tasks',
    repo_id: 'bartowski/Dream-org_Dream-v0-Instruct-7B-GGUF',
    filename: 'Dream-org_Dream-v0-Instruct-7B-IQ2_M.gguf',
    size: '2.5 GB',
    category: 'thinking',
  },

  // CODING - For VSCode/code-server
  {
    id: 'qwen2.5_coder_7b',
    name: 'Qwen 2.5 Coder 7B',
    description: 'Best coding model for macOS - excellent for code completion',
    repo_id: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    filename: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    size: '4.7 GB',
    category: 'coding',
    recommended: true,
  },
  {
    id: 'qwen2.5_coder_3b',
    name: 'Qwen 2.5 Coder 3B',
    description: 'Fast & lightweight coding assistant',
    repo_id: 'Qwen/Qwen2.5-Coder-3B-Instruct-GGUF',
    filename: 'qwen2.5-coder-3b-instruct-q4_k_m.gguf',
    size: '2.0 GB',
    category: 'coding',
  },

  // CHAT - For odax-chat
  {
    id: 'qwen2.5_3b_chat',
    name: 'Qwen 2.5 3B Chat',
    description: 'General chat model - fast responses',
    repo_id: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    size: '2.0 GB',
    category: 'chat',
    recommended: true,
  },
];
