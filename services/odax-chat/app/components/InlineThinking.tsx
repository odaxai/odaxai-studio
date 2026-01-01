'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface InlineThinkingProps {
  content: string;
}

export default function InlineThinking({ content }: InlineThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Estimate duration (mock, or calculate from length)
  const duration = Math.max(1, Math.ceil(content.length / 50));

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors select-none"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Brain size={14} />
        <span className="font-medium">
          {isExpanded ? 'Thinking Process' : `Thought for ${duration}s`}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-4 border-l-2 border-gray-700 ml-1.5">
          <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed font-mono bg-black/20 p-3 rounded-md">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
