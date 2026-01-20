// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import styles from './ThinkingPanel.module.css';

interface ThinkingPanelProps {
  thinkingStatus: string;
  thinkingContent: string;
  isActive: boolean;
  modelName?: string;
  thinkingHistory?: string[];
  theme?: 'light' | 'dark';
  onClose?: () => void;
}

export default function ThinkingPanel({
  thinkingStatus,
  thinkingContent,
  isActive,
  modelName = 'Thinking Model',
  // thinkingHistory is unused for now
  theme = 'dark',
  onClose,
}: ThinkingPanelProps) {
  // Simple state: user can collapse/expand manually
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const thinkingContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thinking content as it updates
  useEffect(() => {
    if (thinkingContentRef.current) {
      thinkingContentRef.current.scrollTop =
        thinkingContentRef.current.scrollHeight;
    }
  }, [thinkingContent]);

  // Dynamic NPU load based on content changes
  const npuLoad =
    isActive && thinkingContent
      ? Math.min(95, 60 + (thinkingContent.length % 35))
      : 0;

  // Toggle function
  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Don't render if not active and no content
  if (!isActive && !thinkingContent) return null;

  // Minimized state - just show a small button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={styles.minimizedButton}
        title="Show Thinking Panel"
        style={
          theme === 'light'
            ? {
                background: '#ffffff',
                color: '#6b7280',
                border: '1px solid #e5e5e5',
              }
            : {}
        }
      >
        <span style={{ fontSize: '14px' }}>R</span>
        {thinkingContent && isActive && (
          <span className={styles.minimizedDot} />
        )}
      </button>
    );
  }

  return (
    <div
      className={`${styles.panel} ${isExpanded ? styles.expanded : styles.collapsed} ${theme === 'light' ? styles.light : ''}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={toggleExpanded}
          className={styles.expandButton}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Icon removed per user request */}

        <div className={styles.headerText}>
          <h3>Reasoning</h3>
          {isExpanded && <span className={styles.modelName}>{modelName}</span>}
        </div>

        {isActive && (
          <div className={styles.liveIndicator}>
            <span className={styles.dot} />
            {isExpanded && 'Live'}
          </div>
        )}

        <button
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              setIsMinimized(true);
            }
          }}
          className={styles.closeButton}
          title={onClose ? 'Close' : 'Minimize'}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content - only show when expanded */}
      {isExpanded && (
        <div className={styles.content}>
          {/* Status */}
          {thinkingStatus && (
            <div className={styles.statusBar}>
              <span style={{ fontSize: '10px', marginRight: '6px' }}>*</span>
              <span>{thinkingStatus}</span>
            </div>
          )}

          {/* Thinking Content with visible scrollbar */}
          <div className={styles.thinkingContent} style={{ overflow: 'auto' }}>
            {thinkingContent ? (
              <div
                className={styles.thinkingText}
                ref={thinkingContentRef}
                style={{
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#6366f1 transparent',
                }}
              >
                {/* Format the content with better structure */}
                {thinkingContent.split('\n').map((line, i) => {
                  const trimmedLine = line.trim();
                  // Check if line looks like a numbered point or bullet
                  const isNumberedPoint = /^\d+[\.\)]\s/.test(trimmedLine);
                  const isBulletPoint = /^[-•*]\s/.test(trimmedLine);
                  const isHeader =
                    /^#+\s/.test(trimmedLine) || trimmedLine.endsWith(':');

                  if (isHeader) {
                    return (
                      <p
                        key={i}
                        style={{
                          fontWeight: 600,
                          color: '#a5a6f6',
                          marginTop: '12px',
                          marginBottom: '6px',
                          fontSize: '13px',
                        }}
                      >
                        {trimmedLine.replace(/^#+\s*/, '')}
                      </p>
                    );
                  }

                  if (isNumberedPoint || isBulletPoint) {
                    return (
                      <p
                        key={i}
                        style={{
                          paddingLeft: '16px',
                          position: 'relative',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: '0',
                            color: '#8b5cf6',
                          }}
                        >
                          {isBulletPoint
                            ? '•'
                            : trimmedLine.match(/^\d+[\.\)]/)?.[0]}
                        </span>
                        {trimmedLine.replace(/^[-•*\d+\.\)]\s*/, '')}
                      </p>
                    );
                  }

                  return <p key={i}>{line || '\u00A0'}</p>;
                })}
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span style={{ fontSize: '20px', opacity: 0.5 }}>...</span>
                <p>Waiting for model reasoning...</p>
              </div>
            )}
          </div>

          {/* GPU Activity Spectrum Wave */}
          {isActive && (
            <div className={styles.processingSection}>
              {/* Colorful Spectrum Wave */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '28px',
                  padding: '4px 0',
                }}
              >
                {[...Array(16)].map((_, i) => {
                  // Rainbow spectrum colors
                  const hue = (i / 16) * 360;
                  return (
                    <div
                      key={i}
                      style={{
                        width: '3px',
                        background: `linear-gradient(to top, hsl(${hue}, 80%, 50%), hsl(${hue + 30}, 90%, 60%))`,
                        borderRadius: '2px',
                        animation: `audioWave 0.6s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.05}s`,
                        minHeight: '3px',
                        boxShadow: `0 0 4px hsla(${hue}, 80%, 50%, 0.5)`,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flex: 1,
                }}
              >
                <span
                  style={{
                    color: '#e0e0e0',
                    fontWeight: 600,
                    fontSize: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  NPU Processing
                </span>
                {/* NPU Power Bar */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    height: '8px',
                    width: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      background:
                        'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
                      height: '100%',
                      width: `${npuLoad}%`,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease-out',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  <span>Apple Neural Engine</span>
                  <span style={{ color: npuLoad > 80 ? '#ef4444' : '#22c55e' }}>
                    {npuLoad}% Load
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer - only when expanded */}
      {isExpanded && (
        <div className={styles.footer}>
          <span style={{ fontSize: '10px', marginRight: '6px' }}>*</span>
          <span>{isActive ? 'Reasoning Active' : 'Reasoning Complete'}</span>
        </div>
      )}
    </div>
  );
}
