import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Conversation, Message } from '@odax/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  
  // Model Settings
  modelPath: string;
  activeModel: string | null;
  availableModels: Array<{ id: string; name: string; category: string; path: string; size?: string }>;

  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  setActiveConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  
  // Model Actions
  setModelPath: (path: string) => void;
  setActiveModel: (model: string) => void;
  fetchModels: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      modelPath: '~/.odax/models',
      activeModel: null,
      availableModels: [],

      fetchModels: async () => {
        try {
          const res = await fetch('/api/models');
          if (res.ok) {
            const data = await res.json();
            set({ availableModels: data.models || [] });
            
            // Auto-select first model if none selected and models exist
            const state = get();
            if (!state.activeModel && data.models && data.models.length > 0) {
              set({ activeModel: data.models[0].id });
            }
          }
        } catch (err) {
          console.error('Failed to fetch local models:', err);
        }
      },

      createConversation: () => {
        const id = nanoid();
        const newConversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
        }));

        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: filtered,
            activeConversationId:
              state.activeConversationId === id
                ? filtered[0]?.id || null
                : state.activeConversationId,
          };
        });
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      sendMessage: async (conversationId, content) => {
        const userMessage: Message = {
          id: nanoid(),
          role: 'user',
          content,
          timestamp: Date.now(),
        };

        // Add user message
        get().addMessage(conversationId, userMessage);

        // Set streaming state
        set({ isStreaming: true });

        try {
          // Call LLM API
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              message: content,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get response');
          }

          if (!response.body) throw new Error('No response body');

          // Initialize assistant message
          const assistantMessageId = nanoid();
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '', // Start empty
            timestamp: Date.now(),
          };
          
          get().addMessage(conversationId, assistantMessage);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Keep the last partial line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === '[DONE]') continue; // Skip done marker
                  
                  const data = JSON.parse(jsonStr);
                  // llama.cpp returns { content: "token", stop: false, ... }
                  if (data.content) {
                    fullContent += data.content;
                    get().updateMessage(conversationId, assistantMessageId, fullContent);
                  }
                } catch (e) {
                  // Ignore parse errors for partial/malformed chunks
                  console.debug('SSE parse error:', e);
                }
              }
            }
          }

          // Ensure we have content
          if (!fullContent.trim()) {
            fullContent = 'No response received from the engine. Is the model loaded?';
            get().updateMessage(conversationId, assistantMessageId, fullContent);
          }

          // Update conversation title if this is the first user message
          const conv = get().conversations.find((c) => c.id === conversationId);
          if (conv && conv.messages.length === 2 && conv.title === 'New Chat') {
            const title =
              content.length > 50 ? content.slice(0, 50) + '...' : content;
            get().renameConversation(conversationId, title);
          }
        } catch (error) {
          console.error('Failed to send message:', error);

          // Add error message
          const errorMessage: Message = {
            id: nanoid(),
            role: 'assistant',
            content:
              'Sorry, I encountered an error. Please make sure the Odax Engine is running.',
            timestamp: Date.now(),
          };
          get().addMessage(conversationId, errorMessage);
        } finally {
          set({ isStreaming: false });
        }
      },

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },
      
      setModelPath: (path) => set({ modelPath: path }),
      setActiveModel: (model) => set({ activeModel: model }),
    }),
    {
      name: 'odax-chat-storage',
      partialize: (state) => ({ 
        conversations: state.conversations, 
        modelPath: state.modelPath,
        activeModel: state.activeModel
      }),
    }
  )
);
