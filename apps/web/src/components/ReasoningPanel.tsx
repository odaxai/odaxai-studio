// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import {
  Brain,
  Search,
  Globe,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { ReasoningStep } from '@/context/SearchContext';

interface ReasoningPanelProps {
  steps: ReasoningStep[];
  isActive: boolean;
  onClose: () => void;
}

function getStepIcon(type: ReasoningStep['type']) {
  switch (type) {
    case 'thinking':
      return <Brain className="w-4 h-4" />;
    case 'search':
      return <Search className="w-4 h-4" />;
    case 'visit':
      return <Globe className="w-4 h-4" />;
    case 'answer':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <ChevronRight className="w-4 h-4" />;
  }
}

function getStepColor(type: ReasoningStep['type']) {
  switch (type) {
    case 'thinking':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'search':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'visit':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'answer':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

export default function ReasoningPanel({
  steps,
  isActive,
  onClose,
}: ReasoningPanelProps) {
  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#0d0d10] border-l border-white/10 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/10 rounded-lg">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Reasoning</h3>
            <p className="text-[10px] text-white/40">
              {steps.length} step{steps.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isActive && (
            <div className="ml-auto flex items-center gap-1.5 bg-purple-500/10 px-2 py-0.5 rounded text-[10px] text-purple-400 border border-purple-500/20">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-xl border ${getStepColor(step.type)} animate-in slide-in-from-right-4 duration-300`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {getStepIcon(step.type)}
              <span className="text-xs font-medium capitalize">
                {step.type}
              </span>
              <span className="ml-auto text-[9px] opacity-50">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
              {step.content}
            </p>
          </div>
        ))}

        {/* Active indicator */}
        {isActive && (
          <div className="p-3 rounded-xl border border-white/5 bg-white/5 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500/30 animate-spin flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <span className="text-xs text-white/50">Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="text-[10px] text-white/30 text-center">
          ReAct Agent • Local Processing
        </div>
      </div>
    </div>
  );
}
