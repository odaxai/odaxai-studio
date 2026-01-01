'use client';

import { Brain, Search, FileText, Sparkles } from 'lucide-react';

interface ThinkingIndicatorProps {
  status: string;
  mode?: 'search' | 'deep-research';
}

export default function ThinkingIndicator({
  status,
  mode = 'search',
}: ThinkingIndicatorProps) {
  const Icon = mode === 'deep-research' ? Brain : Search;
  const color = mode === 'deep-research' ? '#a855f7' : '#3b82f6';
  const bgColor =
    mode === 'deep-research'
      ? 'rgba(168, 85, 247, 0.1)'
      : 'rgba(59, 130, 246, 0.1)';
  const borderColor =
    mode === 'deep-research'
      ? 'rgba(168, 85, 247, 0.3)'
      : 'rgba(59, 130, 246, 0.3)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        marginBottom: '16px',
      }}
    >
      {/* Animated Icon */}
      <div
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pulsing ring */}
        <div
          style={{
            position: 'absolute',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: `2px solid ${color}`,
            animation: 'thinking-pulse 1.5s ease-in-out infinite',
          }}
        />
        <Icon size={20} color={color} />
      </div>

      {/* Status Text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: '#ececec',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '2px',
          }}
        >
          {mode === 'deep-research' ? 'Deep Research' : 'Web Search'}
        </div>
        <div
          style={{
            color: '#8e8e8e',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              gap: '3px',
            }}
          >
            <span className="thinking-dot" style={{ animationDelay: '0s' }}>
              •
            </span>
            <span className="thinking-dot" style={{ animationDelay: '0.2s' }}>
              •
            </span>
            <span className="thinking-dot" style={{ animationDelay: '0.4s' }}>
              •
            </span>
          </span>
          {status}
        </div>
      </div>

      {/* Progress Icons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <div
          style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <Search size={16} color="#8e8e8e" />
        </div>
        <div
          style={{
            padding: '6px',
            borderRadius: '8px',
            background:
              mode === 'deep-research'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'transparent',
          }}
        >
          <FileText
            size={16}
            color={mode === 'deep-research' ? '#8e8e8e' : '#4a4a4a'}
          />
        </div>
        <div
          style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'transparent',
          }}
        >
          <Sparkles size={16} color="#4a4a4a" />
        </div>
      </div>
    </div>
  );
}
