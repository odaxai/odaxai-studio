// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chat-store';
import { AVAILABLE_MODELS } from '@/lib/models-config';
import { Send, Sparkles, User, Bot, ChevronDown, Plus, MessageSquare } from 'lucide-react';

export function ChatInterface(): JSX.Element {
  const {
    conversations,
    activeConversationId,
    activeModel,
    setActiveConversation,
    createConversation,
    sendMessage,
    isStreaming,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  // Chat models only
  const chatModels = AVAILABLE_MODELS.filter(m => m.category === 'chat');
  const selectedModel = chatModels.find(m => m.id === activeModel);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !activeConversationId) return;
    
    const message = input.trim();
    setInput('');
    
    await sendMessage(activeConversationId, message);
  };

  const handleNewChat = () => {
    const newId = createConversation();
    setActiveConversation(newId);
  };

  return (
    <div className="flex h-screen pt-11 bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-white/10 bg-[#0f0f0f] overflow-hidden flex flex-col`}>
        {/* New Chat Button */}
        <div className="p-3 border-b border-white/10">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-8">
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3 group ${
                  conv.id === activeConversationId
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.messages.length} messages
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Model Selector */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">OdaxAI Chat</h1>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <select
              value={activeModel || ''}
              onChange={(e) => useChatStore.getState().setActiveModel(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 pr-10 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer outline-none"
            >
              <option value="">Select model...</option>
              {chatModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Ask anything! Your local AI is ready to help.
              </p>
              {!selectedModel && (
                <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
                  ⚠️ Please select a chat model above
                </div>
              )}
            </div>
          ) : (
            // Messages
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 border border-white/10 text-gray-100'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              
              {isStreaming && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-2xl px-5 py-3 bg-white/5 border border-white/10">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4 bg-[#0f0f0f]">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={selectedModel ? "Type your message..." : "Please select a model first..."}
                  disabled={!selectedModel || isStreaming}
                  rows={1}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel || isStreaming}
                className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg disabled:shadow-none"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {selectedModel ? `Using ${selectedModel.name}` : 'No model selected'} • Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
