'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { trackInference } from '../lib/usageTracker';
import { createActivityPost } from '../lib/socialService';
import {
  detectHardware,
  calculatePerformance,
  formatHardwareForPost,
} from '../lib/hardwareDetect';
import { auth } from '../lib/firebase';

// Source from web search
export interface Source {
  id: number;
  title: string;
  url: string;
  content: string;
  image?: string;
  status?: 'searching' | 'reading' | 'done';
}

export interface MessageMetrics {
  totalTokens: number;
  timeMs: number;
  tps: number;
  timeToFirstTokenMs?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  aiContent?: string; // Hidden content for AI (e.g. full PDF text)
  timestamp: number;
  isStreaming?: boolean;
  sources?: Source[];
  thinking?: string;
  metrics?: MessageMetrics;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type SearchMode = 'none' | 'search' | 'deep-research';

interface ResearchProgress {
  phase:
    | 'idle'
    | 'searching'
    | 'reading'
    | 'analyzing'
    | 'synthesizing'
    | 'complete';
  message: string;
  progress: number;
  currentSource?: number;
  totalSources?: number;
}

interface TranslationState {
  isTranslating: boolean;
  progress: number;
  status: string;
  fileName: string;
  targetLang: string;
  translatedDocument: {
    name: string;
    content: string;
  } | null;
}

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  isChatsLoaded: boolean;
  isGenerating: boolean;
  searchMode: SearchMode;
  thinkingEnabled: boolean;
  localMemoryEnabled: boolean;
  thinkingStatus: string;
  thinkingContent: string;
  thinkingHistory: string[];
  currentSources: Source[];
  researchProgress: ResearchProgress;
  // Translation state
  translationState: TranslationState;
  setTranslationState: (state: Partial<TranslationState>) => void;
  startTranslation: (
    fileName: string,
    content: string,
    targetLang: string,
    targetLangName: string
  ) => void;
  cancelTranslation: () => void;
  // Other methods
  setThinkingContent: (content: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  setLocalMemoryEnabled: (enabled: boolean) => void;
  createNewChat: () => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearAllChats: () => void;
  sendMessage: (displayContent: string, aiContent?: string) => void;
  stopGeneration: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// AI Server configuration - supports multiple backends
const AI_SERVERS = [
  {
    name: 'llama-server',
    url: 'http://localhost:8081',
    healthEndpoint: '/health',
  },
  {
    name: 'Ollama',
    url: 'http://localhost:11434',
    healthEndpoint: '/api/tags',
  },
];

let activeAIServer: string | null = null;

// Check if an AI server is available
async function checkAIServer(
  serverUrl: string,
  healthEndpoint: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${serverUrl}${healthEndpoint}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Find the first available AI server
async function findAvailableAIServer(): Promise<string | null> {
  // If we already have an active server, verify it's still available
  if (activeAIServer) {
    const server = AI_SERVERS.find((s) => s.url === activeAIServer);
    if (server) {
      const isAvailable = await checkAIServer(
        server.url,
        server.healthEndpoint
      );
      if (isAvailable) return activeAIServer;
    }
  }

  // Try each server in order
  for (const server of AI_SERVERS) {
    console.log(`🔍 Checking AI server: ${server.name} at ${server.url}`);
    const isAvailable = await checkAIServer(server.url, server.healthEndpoint);
    if (isAvailable) {
      console.log(`✅ Found active AI server: ${server.name}`);
      activeAIServer = server.url;
      return server.url;
    }
  }

  console.log('❌ No AI server available');
  return null;
}

// Get the appropriate chat completions endpoint based on server type
function getChatEndpoint(serverUrl: string): string {
  if (serverUrl.includes('11434')) {
    // Ollama uses /api/chat
    return `${serverUrl}/api/chat`;
  }
  // llama-server uses OpenAI-compatible endpoint
  return `${serverUrl}/v1/chat/completions`;
}

const WEB_API = 'http://localhost:3000';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('none');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const thinkingEnabledRef = useRef(thinkingEnabled);

  useEffect(() => {
    thinkingEnabledRef.current = thinkingEnabled;
  }, [thinkingEnabled]);
  const [localMemoryEnabled, setLocalMemoryEnabled] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [thinkingHistory] = useState<string[]>([]);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [researchProgress, setResearchProgress] = useState<ResearchProgress>({
    phase: 'idle',
    message: '',
    progress: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Translation state (persists across navigation)
  const [translationState, setTranslationStateInternal] =
    useState<TranslationState>({
      isTranslating: false,
      progress: 0,
      status: '',
      fileName: '',
      targetLang: '',
      translatedDocument: null,
    });
  const translationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('odax-chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed.chats || []);
        setCurrentChatId(parsed.currentChatId || null);
      } catch {
        setChats([]);
        setCurrentChatId(null);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        'odax-chats',
        JSON.stringify({ chats, currentChatId })
      );
    }
  }, [chats, currentChatId, isLoaded]);

  const currentChat = chats.find((c) => c.id === currentChatId) || null;

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  }, []);

  const selectChat = useCallback(
    (chatId: string) => setCurrentChatId(chatId),
    []
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== chatId);
        if (currentChatId === chatId) {
          setCurrentChatId(filtered[0]?.id || null);
        }
        return filtered;
      });
    },
    [currentChatId]
  );

  const clearAllChats = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem('odax-chats');
  }, []);

  const stopGeneration = useCallback(() => {
    console.log('🛑 Stopping generation...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setThinkingStatus('');
    setThinkingContent('');
    setResearchProgress({ phase: 'idle', message: '', progress: 0 });

    // Update the current streaming message to mark it as stopped
    setChats((prev) =>
      prev.map((chat) => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg?.isStreaming) {
          return {
            ...chat,
            messages: [
              ...chat.messages.slice(0, -1),
              {
                ...lastMsg,
                isStreaming: false,
                content: lastMsg.content + '\n\n*[Generation stopped by user]*',
              },
            ],
          };
        }
        return chat;
      })
    );
  }, []);

  // Deep research with ReAct agent
  const performDeepResearchStreaming = async (
    query: string
  ): Promise<{ sources: Source[]; context: string; answer?: string }> => {
    return new Promise((resolve, reject) => {
      const sources: Source[] = [];
      let answer = '';

      setResearchProgress({
        phase: 'searching',
        message: 'Starting deep research...',
        progress: 0,
      });
      setCurrentSources([]);

      // Use the new ReAct agent endpoint
      const eventSource = new EventSource(
        `${WEB_API}/api/react-agent?query=${encodeURIComponent(query)}`
      );

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        setResearchProgress({
          phase: data.phase || 'analyzing',
          message: data.message,
          progress: data.progress,
          currentSource: data.step,
          totalSources: 10,
        });
      });

      eventSource.addEventListener('source', (e) => {
        const source = JSON.parse(e.data);
        // Ensure status is set
        const sourceWithStatus = { ...source, status: source.status || 'done' };
        setCurrentSources((prev) => [...prev, sourceWithStatus]);
        sources.push(sourceWithStatus);
      });

      eventSource.addEventListener('source_update', (e) => {
        const updatedSource = JSON.parse(e.data);
        setCurrentSources((prev) =>
          prev.map((s) => (s.id === updatedSource.id ? updatedSource : s))
        );
      });

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        answer = data.answer || '';
        eventSource.close();
        setResearchProgress({
          phase: 'complete',
          message: `Research complete (${data.iterations || 0} steps)`,
          progress: 100,
        });

        // Build context from sources
        const context = sources
          .map((s) => `[${s.id}] ${s.title}\n${s.content}`)
          .join('\n\n');

        resolve({ sources: data.sources || sources, context, answer });
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
        reject(new Error('Research agent error'));
      });
    });
  };

  // Simple web search (non-streaming)
  const performWebSearch = async (
    query: string
  ): Promise<{ sources: Source[]; context: string }> => {
    console.log('🔍 Starting web search for:', query);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(`${WEB_API}/api/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode: 'search' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Search API error:', res.status, errorText);
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await res.json();
      console.log(
        `✅ Web search returned ${data.sources?.length || 0} results`
      );

      // Transform sources to match expected format
      const sources: Source[] = (data.sources || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        content: s.content || s.snippet || '',
        status: 'done' as const,
      }));

      return { sources, context: data.context || '' };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Web search timeout');
      } else {
        console.error('❌ Search error:', error.message);
      }
      return { sources: [], context: '' };
    }
  };

  // Stream response from LLM
  const callLlamaServerStreaming = async (
    messages: Message[],
    chatId: string,
    sources: Source[] = [],
    context: string = ''
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);

    const assistantMsgId = Date.now();
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                role: 'assistant' as const,
                content: '',
                timestamp: assistantMsgId,
                isStreaming: true,
                sources: sources,
              },
            ],
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );

    try {
      // Build messages for Ollama chat format
      // Optimize context based on request type
      const lastMsg = messages[messages.length - 1];
      const isVisualizeRequest = lastMsg.content.includes(
        'Create a simple MermaidJS flowchart diagram'
      );
      const isPDFAnalysis = lastMsg.content.includes(
        '---BEGIN DOCUMENT CONTENT---'
      );

      let ollamaMessages: Array<{ role: string; content: string }>;

      if (isVisualizeRequest || isPDFAnalysis) {
        // FOR VISUALIZE OR PDF ANALYSIS: Discard history to avoid Context Overflow.
        // If we send history + PDF, we instantly hit 8k/10k limits if the user tried this before.

        let contentToSend = lastMsg.content;
        // Truncate if insanely large (prevent Network Error / Load Failed)
        if (contentToSend.length > 35000) {
          console.warn(
            `⚠️ Content too large (${contentToSend.length} chars). Truncating to 35k...`
          );
          contentToSend =
            contentToSend.slice(0, 35000) +
            '\n\n...[Content Truncated for Safety]...';
        }

        ollamaMessages = [
          {
            role: lastMsg.role,
            content: isPDFAnalysis
              ? contentToSend +
                '\n\nCRITICAL INSTRUCTION: You MUST start the table on a NEW LINE. Use proper Markdown for all tables.\n\nExample:\n\n### Key Concepts\n\n| Concept | Definition |\n|---|---|\n| ... | ... |'
              : contentToSend,
          },
        ];
      } else {
        // STANDARD CHAT: Include history
        ollamaMessages = messages.map((m) => {
          return {
            role: m.role,
            content: m.content,
          };
        });
      }

      // Add system message
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (context) {
        ollamaMessages.unshift({
          role: 'system' as const,
          content: `You are OdaxAI. Match the user's language exactly.
Use the context below ONLY if the user asks about the document. For greetings or general questions, respond briefly.

Context:
${context}`,
        });
      } else {
        ollamaMessages.unshift({
          role: 'system' as const,
          content: `You are OdaxAI. Match the user's language exactly. Be brief and natural.`,
        });
      }

      // Enforce thinking tags if mode is enabled
      if (thinkingEnabled) {
        ollamaMessages[0].content += `

MODALITÀ RAGIONAMENTO / REASONING MODE:
- Usa <think> e </think> per il ragionamento interno. / Use <think> and </think> for internal reasoning.
- Dopo </think>, scrivi la risposta COMPLETA. / After </think>, write the COMPLETE answer.
- NON mettere la risposta finale dentro <think>. / Do NOT put the final answer inside <think>.

Formato / Format:
<think>
[Ragionamento... / Reasoning...]
</think>
[Risposta completa / Complete answer]

⚠️ LINGUA: Ragiona E rispondi nella lingua dell'utente. / LANGUAGE: Think AND respond in the user's language.`;
      }

      // Only set thinking status if thinking mode is enabled
      if (thinkingEnabled) {
        setThinkingStatus('Generating response...');
        setThinkingContent('');
      } else {
        setThinkingStatus('');
        setThinkingContent('');
      }

      // Get current model path from store - llama.cpp uses file paths
      const modelPath = localStorage.getItem('odax-active-model') || 'default';

      // Log what we're sending
      console.log('🔄 Preparing AI request...');
      console.log('📦 Model:', modelPath);
      console.log('📨 Messages count:', ollamaMessages.length);
      const lastUserMsg = ollamaMessages.filter((m) => m.role === 'user').pop();
      if (lastUserMsg) {
        console.log('📝 Last user message length:', lastUserMsg.content.length);
        console.log(
          '📝 Last user message preview:',
          lastUserMsg.content.slice(0, 500)
        );
      }

      // Translation Guard: Detect translation requests and enforce strict mode
      const lastMsgContent =
        ollamaMessages[ollamaMessages.length - 1]?.content || '';
      const isTranslationRequest =
        /translate|traduci|traduzione|tradurre/i.test(lastMsgContent);

      if (isTranslationRequest) {
        console.log('🌍 Translation request detected - Applying strict guard');
        // Inject temporary system instruction
        ollamaMessages.splice(ollamaMessages.length - 1, 0, {
          role: 'system',
          content: `CRITICAL TRANSLATION MODE:
The user wants a translation.
1. Output ONLY the translated text.
2. NO conversational filler ("Here is the translation", "Sure").
3. DO NOT SUMMARIZE. Convert the entire text provided.
4. If using <think>, keep it separated and output the translation AFTER </think>.`,
        });
      }

      // Enforce thinking tags in user message as well (stronger adherence)
      // We prepend and append instructions to the LAST user message to ensure attention
      const lastUserMsgForLang = ollamaMessages
        .filter((m) => m.role === 'user')
        .pop();

      if (lastUserMsgForLang) {
        const originalContent = lastUserMsgForLang.content;

        // Extract ONLY the user's question for language detection (exclude document content)
        let textForLangDetect = originalContent;
        const endDocIdx = originalContent.lastIndexOf('---END DOCUMENT---');
        if (endDocIdx >= 0) {
          textForLangDetect = originalContent
            .slice(endDocIdx + '---END DOCUMENT---'.length)
            .trim();
        }
        // Also strip any thinking prefix
        textForLangDetect = textForLangDetect
          .replace(/^(Ragiona passo|Think step|Razona paso).*$/m, '')
          .trim();

        // Language detection on USER'S QUESTION ONLY (not document content)
        const isItalian =
          /\b(ciao|analizza|dimmi|perché|traduci|fammi|puoi|vorrei|della|nella|alla|riassumi|spiega|questo pdf)\b/i.test(
            textForLangDetect
          );
        const isSpanish =
          /\b(hola|analiza|dime|qué|cómo|por qué|puedes|quiero|resumen)\b/i.test(
            textForLangDetect
          );
        const isFrench =
          /\b(bonjour|salut|analyse|pouvez|voulez|merci|s'il|résumé)\b/i.test(
            textForLangDetect
          );
        const isGerman =
          /\b(hallo|analysiere|kannst|bitte|danke|warum|dieser|zusammenfassung)\b/i.test(
            textForLangDetect
          );

        // Determine language suffix
        let langSuffix: string;
        if (isItalian) {
          langSuffix = 'Rispondi IN ITALIANO.';
        } else if (isSpanish) {
          langSuffix = 'Responde EN ESPAÑOL.';
        } else if (isFrench) {
          langSuffix = 'Réponds EN FRANÇAIS.';
        } else if (isGerman) {
          langSuffix = 'Antworte AUF DEUTSCH.';
        } else {
          langSuffix = 'Respond in the SAME language as the user input above.';
        }

        if (thinkingEnabled) {
          // With thinking: add think prefix + suffix + opening tag
          let thinkPrefix: string;
          if (isItalian) {
            thinkPrefix =
              'Ragiona passo dopo passo. Usa <think> per il ragionamento e </think> prima della risposta finale.';
          } else if (isSpanish) {
            thinkPrefix =
              'Razona paso a paso. Usa <think> para el razonamiento y </think> antes de la respuesta final.';
          } else {
            thinkPrefix =
              'Think step by step. Use <think> for reasoning and </think> before the final answer.';
          }

          if (
            originalContent.includes('---BEGIN DOCUMENT---') ||
            originalContent.includes('---EXCERPT FROM DOCUMENT---')
          ) {
            lastUserMsgForLang.content = `${thinkPrefix}\n\n${originalContent}\n\n${langSuffix}\n<think>`;
          } else {
            lastUserMsgForLang.content = `${thinkPrefix}\n\nUser: ${originalContent}\n\n${langSuffix}\n<think>`;
          }
        } else {
          // Without thinking: just append language suffix as LAST line
          lastUserMsgForLang.content = `${originalContent}\n\n${langSuffix}`;
        }
      }

      // Find available AI server
      const serverUrl = await findAvailableAIServer();
      if (!serverUrl) {
        throw new Error('NO_AI_SERVER');
      }

      const chatEndpoint = getChatEndpoint(serverUrl);
      const isOllama = serverUrl.includes('11434');
      console.log(
        '🔗 Using AI server:',
        chatEndpoint,
        isOllama ? '(Ollama)' : '(llama-server)'
      );

      // For Ollama, use a valid model name (check what's available)
      let ollamaModel = 'qwen3:4b'; // Default Ollama model
      if (
        isOllama &&
        modelPath &&
        !modelPath.includes('/') &&
        !modelPath.includes('.gguf')
      ) {
        // modelPath looks like an Ollama model name
        ollamaModel = modelPath;
      }

      // Build request body - format differs between llama-server and Ollama
      const requestBody = isOllama
        ? {
            model: ollamaModel,
            messages: ollamaMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
            options: {
              temperature: 0.7,
              num_ctx: 10240,
              num_predict: 4096,
            },
          }
        : {
            model: modelPath,
            messages: ollamaMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
            temperature: 0.7,
            n_predict: 4096,
            n_ctx: 10240,
          };

      // Log request details for debugging
      console.log('🚀 AI Request Details:', {
        server: isOllama ? 'Ollama' : 'llama-server',
        model: isOllama ? ollamaModel : modelPath,
        messagesCount: ollamaMessages.length,
        lastMessagePreview:
          ollamaMessages[ollamaMessages.length - 1]?.content?.slice(0, 200) +
          '...',
        params: isOllama
          ? requestBody.options
          : {
              n_predict: requestBody.n_predict,
              temperature: requestBody.temperature,
            },
      });

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        // Log error details
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error');
        console.error('❌ Server error details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          endpoint: chatEndpoint,
          totalMessages: ollamaMessages.length,
          totalChars: JSON.stringify(requestBody).length,
          requestParams: isOllama
            ? requestBody.options
            : { n_predict: requestBody.n_predict },
        });
        throw new Error(`Server error: ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Start content - if thinking mode, we already added <think> to prompt so model continues from there
      let accumulatedContent = thinkingEnabled ? '<think>' : '';
      let accumulatedThinking = '';
      let visibleContent = '';
      let lastUpdateTime = 0;

      // Performance metrics
      const startTime = performance.now();
      let firstTokenTime = 0;
      let tokenCharsCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Handle both Ollama (newline-delimited JSON) and llama.cpp (SSE format)
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            let content = '';
            let reasoningContent = '';

            if (isOllama) {
              // Ollama sends newline-delimited JSON objects
              const data = JSON.parse(line);
              content = data.message?.content || '';
            } else {
              // llama.cpp sends SSE format: data: {...}
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr === '[DONE]') continue;

              const data = JSON.parse(jsonStr);
              // llama.cpp uses OpenAI format: choices[0].delta.content
              content = data.choices?.[0]?.delta?.content || '';
              // Some models (Qwen, DeepSeek R1) use reasoning_content field
              reasoningContent =
                data.choices?.[0]?.delta?.reasoning_content || '';
            }

            // Record first token time
            if ((content || reasoningContent) && firstTokenTime === 0) {
              firstTokenTime = performance.now() - startTime;
            }

            // Accumulate content
            if (content) {
              accumulatedContent += content;
              tokenCharsCount += content.length;
            }

            // Accumulate reasoning from native field (Qwen/DeepSeek format)
            if (reasoningContent && thinkingEnabledRef.current) {
              accumulatedThinking += reasoningContent;
              tokenCharsCount += reasoningContent.length;
              setThinkingContent(accumulatedThinking);
              setThinkingStatus('Reasoning...');
            }

            // Also check for <think> tags in content (fallback for other models)
            if (thinkingEnabledRef.current && !reasoningContent) {
              const cleanContent = accumulatedContent.trimStart();

              // Case 1: Standard tags match (case insensitive)
              const thinkMatch = cleanContent.match(
                /<think>([\s\S]*?)(<\/think>|$)/i
              );

              if (thinkMatch && thinkMatch[1]) {
                // Found content inside tags
                const thinkText = thinkMatch[1].trim();
                // Only update if we have new content
                if (thinkText.length > accumulatedThinking.length) {
                  accumulatedThinking = thinkText;
                  setThinkingContent(thinkText);
                  setThinkingStatus('Reasoning...');
                }
              }
              // Case 2: Starts with <think> but no content/closing yet
              else if (/^<think>/i.test(cleanContent)) {
                const thinkText = cleanContent.replace(/^<think>/i, '').trim();
                if (thinkText.length > accumulatedThinking.length) {
                  accumulatedThinking = thinkText;
                  setThinkingContent(thinkText);
                  setThinkingStatus('Reasoning...');
                }
              }
            }
          } catch {
            /* ignore */
          }
        } // End of lines loop

        // THROTTLE UI UPDATES (100ms)
        // Prevents browser freeze during heavy rendering (tables/markdown)
        const now = Date.now();
        if (now - lastUpdateTime > 100) {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === chatId) {
                const updatedMessages = [...chat.messages];
                const lastMsg = updatedMessages[updatedMessages.length - 1];
                if (lastMsg?.isStreaming) {
                  // Direct update without expensive regex - let the Renderer handle presentation
                  lastMsg.content = accumulatedContent;
                  lastMsg.thinking = accumulatedThinking;
                }
                return { ...chat, messages: updatedMessages };
              }
              return chat;
            })
          );
          lastUpdateTime = now;
        }
      }

      // Calculation metrics finalized
      const endTime = performance.now();
      const totalTimeMs = endTime - startTime;
      const tps =
        totalTimeMs > 0 ? tokenCharsCount / 4 / (totalTimeMs / 1000) : 0;

      // Mark streaming complete
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            const updatedMessages = [...chat.messages];
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            if (lastMsg?.isStreaming) {
              lastMsg.isStreaming = false;

              // Attach performance metrics
              lastMsg.metrics = {
                totalTokens: Math.round(tokenCharsCount / 4),
                timeMs: Math.round(totalTimeMs),
                tps: parseFloat(tps.toFixed(2)),
                timeToFirstTokenMs: Math.round(firstTokenTime),
              };

              // FORCE FLUSH: Ensure we have the latest accumulated content
              // This is critical because the throttle (100ms) might have missed the last chunk.
              if (lastMsg.isStreaming) {
                lastMsg.content = accumulatedContent;
                lastMsg.thinking = accumulatedThinking;
              }

              // Smart logic to cleanup <think> tags if present in the final content
              // But ONLY if we actually found them. Otherwise trust accumulatedContent.
              const finalContent = lastMsg.content || '';
              const thinkMatch = finalContent.match(
                /<think>[\s\S]*?<\/think>/i
              );

              if (thinkMatch) {
                // If we have thinking tags, clean them out for the main display
                const cleanContent = finalContent
                  .replace(/<think>[\s\S]*?<\/think>/gi, '')
                  .trim();
                if (cleanContent.length > 0) {
                  lastMsg.content = cleanContent;
                }
              }

              // Fallback: If content is empty/placeholder, try to rescue it from thinking (existing logic)
              const isPlaceholderContent =
                !lastMsg.content ||
                lastMsg.content.trim().length < 5 || // Lowered threshold
                /reasoning.*completed|click.*button|processo.*completato/i.test(
                  lastMsg.content
                );

              if (
                isPlaceholderContent &&
                accumulatedThinking.trim().length > 0
              ) {
                // ... (keep existing rescue logic)
                const thinkContent = accumulatedThinking;
                // Look for common answer patterns in the thinking
                const answerPatterns = [
                  /(?:risposta finale|final answer|risposta|answer|conclusione|conclusion|answer is)[:\s]*\n?([\s\S]+)$/i,
                  /(?:in conclusione|in summary|in breve|quindi|thus|therefore)[:\s]*([\s\S]+)$/i,
                  /(?:per riassumere|to summarize|in definitiva|ultimately)[:\s]*([\s\S]+)$/i,
                ];

                let extractedAnswer = '';
                for (const pattern of answerPatterns) {
                  const match = thinkContent.match(pattern);
                  if (match && match[1] && match[1].trim().length > 10) {
                    extractedAnswer = match[1].trim();
                    break;
                  }
                }
                if (extractedAnswer) {
                  lastMsg.content = extractedAnswer;
                }
              }

              // Check if content is empty or contains placeholder text
              // This block is now redundant due to the new logic above, but keeping it for context if needed.
              // const isPlaceholderContent =
              //   !lastMsg.content ||
              //   lastMsg.content.trim().length < 20 ||
              //   /reasoning.*completed|click.*button|view.*details|processo.*completato|traduzione.*completata|ecco.*traduzione|here.*translation|translation.*complete|fatto|done|completed/i.test(
              //     lastMsg.content
              //   );

              // First, try to extract content from accumulatedContent AFTER </think>
              const afterThinkFinal = accumulatedContent.match(
                /<\/think>\s*([\s\S]+)$/i
              );
              if (
                afterThinkFinal &&
                afterThinkFinal[1] &&
                afterThinkFinal[1].trim().length > 30
              ) {
                let finalAnswer = afterThinkFinal[1].trim();
                // Remove any orphan punctuation at start
                finalAnswer = finalAnswer.replace(/^[\s,;:.]+/, '');
                if (finalAnswer.length > 20) {
                  lastMsg.content = finalAnswer;
                }
              } else if (
                (isPlaceholderContent || !lastMsg.content) &&
                accumulatedThinking.trim().length > 0
              ) {
                // Try to extract final answer from thinking content
                const thinkContent = accumulatedThinking;

                // Look for common answer patterns in the thinking
                const answerPatterns = [
                  /(?:risposta finale|final answer|risposta|answer|conclusione|conclusion|answer is)[:\s]*\n?([\s\S]+)$/i,
                  /(?:in conclusione|in summary|in breve|quindi|thus|therefore)[:\s]*([\s\S]+)$/i,
                  /(?:per riassumere|to summarize|in definitiva|ultimately)[:\s]*([\s\S]+)$/i,
                ];

                let extractedAnswer = '';
                for (const pattern of answerPatterns) {
                  const match = thinkContent.match(pattern);
                  if (match && match[1] && match[1].trim().length > 20) {
                    extractedAnswer = match[1].trim();
                    break;
                  }
                }

                if (extractedAnswer) {
                  lastMsg.content = extractedAnswer;
                } else {
                  // Try to get the last meaningful paragraph from the thinking content
                  const paragraphs = thinkContent
                    .split(/\n\n+/)
                    .filter((p) => p.trim().length > 50);
                  if (paragraphs.length > 0) {
                    // Get the last 2-3 paragraphs as the response
                    const lastParagraphs = paragraphs.slice(-3).join('\n\n');
                    lastMsg.content = lastParagraphs;
                  } else {
                    // Last resort: take the entire thinking as it IS the content
                    lastMsg.content = thinkContent;
                  }
                }
              }

              // Final cleanup: remove any residual </think> or <think> tags from content
              if (lastMsg.content) {
                lastMsg.content = lastMsg.content
                  .replace(/<\/?think\s*>?/gi, '')
                  .replace(/<\/?(t(h(i(n(k)?)?)?)?)?$/i, '')
                  .replace(/^[\s,;:.]+/, '') // Remove leading orphan punctuation
                  .trim();
              }

              if (!lastMsg.content || lastMsg.content.trim().length === 0) {
                lastMsg.content = 'Sono pronto ad aiutarti!';
              }

              lastMsg.thinking = accumulatedThinking; // Save thinking content
            }
            return {
              ...chat,
              messages: updatedMessages,
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );

      // Track usage in Firestore (if user is logged in)
      const currentUser = auth.currentUser;
      if (currentUser && tokenCharsCount > 0) {
        const estimatedInputTokens = Math.round(
          ollamaMessages.reduce((acc, m) => acc + m.content.length, 0) / 4
        );
        const estimatedOutputTokens = Math.round(tokenCharsCount / 4);
        const totalTokensUsed = estimatedInputTokens + estimatedOutputTokens;

        // Extract readable model name from path
        // e.g., "/path/to/qwen2.5-3b-instruct-q4_k_m.gguf" -> "qwen2-5-3b-instruct-q4-k-m"
        // IMPORTANT: Replace dots (.) with dashes (-) to prevent Firestore nested path issues
        let modelName = modelPath;
        if (modelPath.includes('/')) {
          const filename = modelPath.split('/').pop() || modelPath;
          modelName = filename
            .replace(/\.gguf$/i, '')
            .replace(/_/g, '-')
            .replace(/\./g, '-');
        } else {
          // Also sanitize if no path (direct model name)
          modelName = modelPath.replace(/\./g, '-');
        }

        // Calculate reasoning tokens if thinking was used
        const reasoningTokens = accumulatedThinking
          ? Math.round(accumulatedThinking.length / 4)
          : 0;

        trackInference(
          currentUser.uid,
          modelName,
          estimatedInputTokens,
          estimatedOutputTokens,
          {
            isReasoning: thinkingEnabledRef.current && reasoningTokens > 0,
            reasoningTokens: reasoningTokens,
            responseTimeMs: Math.round(totalTimeMs),
          }
        );

        // Post activity if sharing is enabled
        const sharingEnabled =
          localStorage.getItem('odax-sharing-enabled') === 'true';
        if (sharingEnabled) {
          // Detect hardware and calculate performance
          const hardware = detectHardware();
          const perf = calculatePerformance(
            totalTokensUsed,
            Math.round(totalTimeMs)
          );
          const hardwareString = formatHardwareForPost(hardware);

          // Format time
          const now = new Date();

          // Build post content with details
          const tokenStr =
            totalTokensUsed >= 1000
              ? (totalTokensUsed / 1000).toFixed(1) + 'K'
              : totalTokensUsed.toString();

          const tpsStr =
            perf.tokensPerSecond > 0 ? ` @ ${perf.tokensPerSecond} tok/s` : '';

          const reasoningInfo =
            thinkingEnabledRef.current && reasoningTokens > 0
              ? ` (${Math.round((reasoningTokens / 1000) * 10) / 10}K reasoning)`
              : '';

          // Build flex-worthy post content
          const postContent = `${tokenStr} tokens${tpsStr} with ${modelName}${reasoningInfo}`;

          createActivityPost(
            currentUser.uid,
            currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              'User',
            currentUser.photoURL,
            thinkingEnabledRef.current && reasoningTokens > 0
              ? 'reasoning'
              : 'inference',
            postContent,
            {
              modelId: modelName,
              tokenCount: totalTokensUsed,
              reasoningTokens: reasoningTokens,
              responseTimeMs: Math.round(totalTimeMs),
              tokensPerSecond: perf.tokensPerSecond,
              hardware: hardwareString,
              cpuCores: hardware.cpu.cores,
              gpuRenderer: hardware.gpu.renderer,
              timestamp: now.toISOString(),
            }
          );
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Determine error message based on error type
      let errorMessage = '⚠️ **AI Server Not Available**\n\n';

      if (err instanceof Error && err.message === 'NO_AI_SERVER') {
        errorMessage +=
          'No AI server detected. Please start one of the following:\n\n';
        errorMessage += '**Option 1: Ollama** (Recommended)\n';
        errorMessage += '- Install from [ollama.ai](https://ollama.ai)\n';
        errorMessage += '- Run: `ollama serve`\n';
        errorMessage += '- Then: `ollama run qwen2.5:3b`\n\n';
        errorMessage += '**Option 2: llama-server**\n';
        errorMessage +=
          '- Run the start script: `sh apps/macos/scripts/start-llama.sh`\n';
      } else if (
        err instanceof Error &&
        (err.message.includes('Server error: 400') ||
          err.message.includes('CONTEXT_OVERFLOW'))
      ) {
        // Handle Context Overflow specifically
        errorMessage =
          '❌ **Errore: Documento Troppo Grande (Context Overflow)**\n\n';
        errorMessage +=
          'Il contenuto del documento supera la capacità di memoria (Context Window) del modello AI.\n\n';
        errorMessage += '**Soluzioni:**\n';
        errorMessage +=
          '1. Il sistema tronca automaticamente i testi lunghi, ma questo PDF potrebbe essere eccezionalmente denso.\n';
        errorMessage +=
          '2. Riprova: il sistema ha ridotto ulteriormente il limite di sicurezza.\n';
        errorMessage +=
          "3. Carica solo le pagine chiave come immagini per l'OCR.\n";
      } else {
        errorMessage += `Error: ${
          err instanceof Error ? err.message : 'Unknown error'
        }\n\n`;
        errorMessage +=
          'Please check that your AI server is running and try again.';
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            const updatedMessages = [...chat.messages];
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            if (lastMsg?.isStreaming) {
              lastMsg.isStreaming = false;
              lastMsg.content = errorMessage;
            }
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        })
      );
    } finally {
      setIsGenerating(false);
      setThinkingStatus('');
      // Clear global thinking content to close the side panel
      // The content is preserved in the message history
      setThinkingContent('');
    }
  };

  const sendMessage = async (displayContent: string, aiContent?: string) => {
    let targetChatId = currentChatId;

    // Use aiContent for AI processing/Search/Memory if provided, otherwise use displayContent
    const contentForAI = aiContent || displayContent;

    // Clean content for display
    const cleanDisplayContent = displayContent
      .replace(/\[Web Search Enabled\]/gi, '')
      .replace(/\[Deep Research Mode.*?\]/gi, '')
      .trim();

    // Clean content for AI
    const cleanAIContent = contentForAI
      .replace(/\[Web Search Enabled\]/gi, '')
      .replace(/\[Deep Research Mode.*?\]/gi, '')
      .trim();

    let sources: Source[] = [];
    let context = '';

    if (searchMode === 'deep-research') {
      setThinkingStatus('Running deep research...');
      try {
        const result = await performDeepResearchStreaming(cleanAIContent);
        sources = result.sources;
        context = result.context;
        // agentAnswer = result.answer || '';
      } catch {
        // Fallback to simple search
        const result = await performWebSearch(cleanAIContent);
        sources = result.sources;
        context = result.context;
      }
    } else if (searchMode === 'search') {
      setThinkingStatus('Searching the web...');
      const result = await performWebSearch(cleanAIContent);
      sources = result.sources;
      context = result.context;
      setCurrentSources(sources);
    }

    // If local memory is enabled, save the message and get memory context
    if (localMemoryEnabled) {
      try {
        // Save user message to memory (use AI content for better context)
        await fetch('/api/user-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: cleanAIContent }),
        });

        // Only retrieve memory context if the message seems to reference documents/knowledge
        // Short casual messages like "hi", "hello", "ciao" should NOT trigger memory retrieval
        const isDocumentRelated =
          /\b(analizza|documento|pdf|riassumi|cosa dice|tell me about|analyze|summarize|document|explain|spiega|contenuto|paper|articolo|report|studio|ricerca|research|findings|results|conclusi|method|approach)\b/i.test(
            cleanAIContent
          );
        const isSubstantialQuery = cleanAIContent.length > 50;

        if (isDocumentRelated || isSubstantialQuery) {
          // Retrieve relevant memory for context
          const memoryRes = await fetch(
            `/api/user-memory?query=${encodeURIComponent(cleanAIContent)}`
          );
          if (memoryRes.ok) {
            const memoryData = await memoryRes.json();
            if (memoryData.context) {
              // Prepend memory context to search context
              context = memoryData.context + '\n\n' + context;
            }
          }
        }
      } catch (e) {
        console.error('Memory API error:', e);
      }
    }

    if (!targetChatId) {
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: cleanDisplayContent.slice(0, 50),
        messages: [
          { role: 'user', content: cleanDisplayContent, timestamp: Date.now() },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setChats([newChat]);
      setCurrentChatId(newChat.id);
      targetChatId = newChat.id;

      // Create AI message with full content
      const aiMessages = [
        {
          role: 'user' as const,
          content: cleanAIContent,
          timestamp: Date.now(),
        },
      ];

      await callLlamaServerStreaming(aiMessages, newChat.id, sources, context);
      return;
    }

    const userMsg: Message = {
      role: 'user',
      content: cleanDisplayContent,
      aiContent:
        cleanAIContent !== cleanDisplayContent ? cleanAIContent : undefined,
      timestamp: Date.now(),
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === targetChatId) {
          const newTitle =
            chat.messages.length === 0
              ? cleanDisplayContent.slice(0, 50)
              : chat.title;
          return {
            ...chat,
            messages: [...chat.messages, userMsg],
            title: newTitle,
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );

    const updatedChat = chats.find((c) => c.id === targetChatId);
    if (updatedChat) {
      // Build AI messages: optimize history to avoid re-sending full documents
      const MAX_HISTORY_MSGS = 6; // Keep last 6 messages (3 user + 3 assistant) for context
      const recentMessages = updatedChat.messages.slice(-MAX_HISTORY_MSGS);

      const chatHistory = recentMessages.map((m) => {
        const rawContent = m.aiContent || m.content;

        // Truncate old messages that contain document text to save tokens
        // Only keep full content for the LATEST user message
        if (
          rawContent.includes('---BEGIN DOCUMENT---') ||
          rawContent.includes('---EXCERPT FROM DOCUMENT---')
        ) {
          // Extract just the user's question (before document block)
          const docStart = rawContent.indexOf('---BEGIN DOCUMENT---');
          const excerptStart = rawContent.indexOf(
            '---EXCERPT FROM DOCUMENT---'
          );
          const cutPoint = docStart >= 0 ? docStart : excerptStart;

          if (cutPoint > 0) {
            const userQuestion = rawContent.slice(0, cutPoint).trim();
            return {
              role: m.role,
              content: `${userQuestion}\n[Document was attached - see context above for details]`,
              timestamp: m.timestamp,
            };
          }
        }

        // Truncate very long messages (>2000 chars) in history
        if (rawContent.length > 2000) {
          return {
            role: m.role,
            content:
              rawContent.slice(0, 2000) +
              '\n[... truncated for context efficiency ...]',
            timestamp: m.timestamp,
          };
        }

        return {
          role: m.role,
          content: rawContent,
          timestamp: m.timestamp,
        };
      });

      const aiMessages = [
        ...chatHistory,
        {
          role: 'user' as const,
          content: cleanAIContent,
          timestamp: Date.now(),
        },
      ];

      await callLlamaServerStreaming(
        aiMessages,
        targetChatId,
        sources,
        context
      );
    }
  };

  // Translation functions
  const setTranslationState = useCallback(
    (updates: Partial<TranslationState>) => {
      setTranslationStateInternal((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const startTranslation = useCallback(
    async (
      fileName: string,
      content: string,
      targetLang: string,
      targetLangName: string
    ) => {
      // Set initial state
      setTranslationStateInternal({
        isTranslating: true,
        progress: 0,
        status: `Starting translation to ${targetLangName}...`,
        fileName,
        targetLang,
        translatedDocument: null,
      });

      const abortController = new AbortController();
      translationAbortRef.current = abortController;

      try {
        // Import translation service dynamically
        const { translateDocument } =
          await import('../services/translationService');

        const translatedText = await translateDocument(
          content,
          targetLang,
          targetLangName,
          (progress, status) => {
            setTranslationStateInternal((prev) => ({
              ...prev,
              progress,
              status,
            }));
          },
          abortController.signal
        );

        // Create translated document
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const translatedName = `${baseName}_${targetLangName}.pdf`;

        setTranslationStateInternal((prev) => ({
          ...prev,
          progress: 100,
          status: 'Translation complete!',
          translatedDocument: {
            name: translatedName,
            content: translatedText,
          },
        }));

        // Keep showing completion for a bit, then hide progress
        setTimeout(() => {
          setTranslationStateInternal((prev) => ({
            ...prev,
            isTranslating: false,
          }));
        }, 3000);
      } catch (err) {
        console.error('Translation error:', err);
        setTranslationStateInternal((prev) => ({
          ...prev,
          status: 'Translation failed',
          progress: 0,
        }));
        setTimeout(() => {
          setTranslationStateInternal((prev) => ({
            ...prev,
            isTranslating: false,
          }));
        }, 3000);
      }
    },
    []
  );

  const cancelTranslation = useCallback(() => {
    if (translationAbortRef.current) {
      translationAbortRef.current.abort();
      translationAbortRef.current = null;
    }
    setTranslationStateInternal({
      isTranslating: false,
      progress: 0,
      status: '',
      fileName: '',
      targetLang: '',
      translatedDocument: null,
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        isChatsLoaded: isLoaded,
        currentChatId,
        currentChat,
        isGenerating,
        searchMode,
        thinkingEnabled,
        localMemoryEnabled,
        thinkingStatus,
        thinkingContent,
        thinkingHistory,
        currentSources,
        researchProgress,
        // Translation
        translationState,
        setTranslationState,
        startTranslation,
        cancelTranslation,
        // Methods
        setThinkingContent,
        setSearchMode,
        setThinkingEnabled,
        setLocalMemoryEnabled,
        createNewChat,
        selectChat,
        deleteChat,
        clearAllChats,
        sendMessage,
        stopGeneration,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
