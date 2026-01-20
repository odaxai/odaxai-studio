// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="border-t border-border bg-bg-panel p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          {/* Attachment button (placeholder) */}
          <button
            className="btn-ghost p-2.5 rounded-lg mb-1"
            disabled={disabled}
            title="Attach file (coming soon)"
          >
            <Paperclip className="h-5 w-5 text-text-tertiary" />
          </button>

          {/* Input area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Message OdaxAI... (Shift+Enter for new line)"
              disabled={disabled}
              className={cn(
                'input resize-none py-3 pr-12 min-h-[52px] max-h-[200px]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              className={cn(
                'absolute right-2 bottom-2 btn-primary p-2 rounded-lg',
                (!message.trim() || disabled) &&
                  'opacity-50 cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-text-tertiary text-center">
          OdaxAI can make mistakes. Consider checking important information.
        </div>
      </div>
    </div>
  );
}

