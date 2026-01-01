'use client';

import { useState, useEffect } from 'react';
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { X, FileText, Download } from 'lucide-react';

import { searchPlugin } from '@react-pdf-viewer/search';
import '@react-pdf-viewer/search/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  theme?: 'dark' | 'light';
  highlights?: string[];
  onExplain?: (text: string) => void;
  onAskQuestion?: (text: string, question: string) => void;
  onVisualize?: (text: string) => void;
  onHighlightKeyPoints?: () => void;
  isGenerating?: boolean;
  // Translation support
  translatedDocument?: {
    name: string;
    content: string;
  } | null;
  onDownloadTranslated?: () => void;
}

export default function PDFViewer({
  fileUrl,
  fileName,
  onClose,
  theme = 'dark',
  highlights = [],
  onExplain,
  onAskQuestion,
  onVisualize,
  onHighlightKeyPoints,
  isGenerating = false,
  translatedDocument,
  onDownloadTranslated,
}: PDFViewerProps) {
  // Use native zoom/layout plugin for best experience
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [], // Cleanup sidebar
  });

  const [selectedText, setSelectedText] = useState('');
  const [questionInput, setQuestionInput] = useState('');

  // Initialize search plugin
  const searchPluginInstance = searchPlugin({
    keyword:
      highlights.length > 0
        ? highlights.map((h) => h.replace(/^"|"$/g, ''))
        : [], // Auto-highlight
  });
  const { highlight } = searchPluginInstance;

  // Effect to trigger highlights when props change
  useEffect(() => {
    if (highlights.length > 0) {
      // Clean quotes if present
      const cleanHighlights = highlights.map((h) => h.replace(/^"|"$/g, ''));
      console.log('Applying highlights:', cleanHighlights);

      // Highlight each key point
      // Highlight each key point
      const keywordsToHighlight = cleanHighlights.map((kw) => ({
        keyword: kw,
        matchCase: false,
        wholeWords: false,
      }));

      highlight(keywordsToHighlight);
    }
  }, [highlights, highlight]);

  // Listen for text selection in PDF
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 10) {
        setSelectedText(text);
      }
    };

    // Add listener to the document to catch PDF text selection
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Combine plugins
  const plugins = [defaultLayoutPluginInstance, searchPluginInstance];

  const colors =
    theme === 'dark'
      ? {
          bg: '#0d0d0d',
          headerBg: '#1a1a1a',
          border: '#2a2a2a',
          text: '#e5e5e5',
          textMuted: '#888',
        }
      : {
          bg: '#fff',
          headerBg: '#fafafa',
          border: '#e5e5e5',
          text: '#171717',
          textMuted: '#666',
        };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: colors.bg,
        borderLeft: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        position: 'relative',
      }}
    >
      {/* Selection Tooltip with Question Input */}
      {selectedText && onExplain && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#000000',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '280px',
            maxWidth: '400px',
            animation: 'fadeIn 0.2s ease-out',
            fontFamily: 'inherit',
            // Always visible, disable interaction when generating
            pointerEvents: isGenerating ? 'none' : 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact header showing selection status */}
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ✨ Selected text ({selectedText.length} characters)
          </div>

          {/* Question input */}
          <input
            type="text"
            placeholder="Ask a question about this text..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && questionInput.trim() && onAskQuestion) {
                onAskQuestion(selectedText, questionInput.trim());
                setQuestionInput('');
                setSelectedText('');
                window.getSelection()?.removeAllRanges();
              }
            }}
            style={{
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              color: 'white',
              outline: 'none',
              width: '100%',
            }}
          />

          {/* Action buttons */}
          <div
            style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}
          >
            <button
              onClick={() => {
                setSelectedText('');
                setQuestionInput('');
                window.getSelection()?.removeAllRanges();
              }}
              style={{
                background: 'transparent',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                color: '#aaa',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (questionInput.trim() && onAskQuestion) {
                  onAskQuestion(selectedText, questionInput.trim());
                } else {
                  onExplain(selectedText);
                }
                setQuestionInput('');
                setSelectedText('');
                window.getSelection()?.removeAllRanges();
              }}
              style={{
                background: '#000000',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ✨ {questionInput.trim() ? 'Ask' : 'Explain'}
            </button>
            {!questionInput.trim() && onVisualize && (
              <button
                onClick={() => {
                  onVisualize(selectedText);
                  setSelectedText('');
                  window.getSelection()?.removeAllRanges();
                }}
                style={{
                  background: '#2563eb', // Blue for visualize
                  border: '1px solid #1d4ed8',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Create a conceptual map/graph"
              >
                🕸️ Visualize
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compact Header - Title & Close Only */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.headerBg,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          <FileText size={16} color={colors.textMuted} />
          <span
            style={{
              fontWeight: 600,
              fontSize: '12px',
              color: colors.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {fileName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Highlight Key Points Button */}
          {onHighlightKeyPoints && (
            <button
              onClick={onHighlightKeyPoints}
              disabled={isGenerating}
              style={{
                background: isGenerating
                  ? '#444'
                  : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                color: isGenerating ? '#888' : '#000',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Ask AI to highlight key points"
            >
              ✨ Highlight
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              marginLeft: '4px',
            }}
            title="Hide PDF"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: theme === 'dark' ? '#1a1a1a' : '#f0f0f0',
        }}
      >
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div
            style={{
              height: '100%',
              // Custom CSS to style the PDF viewer
            }}
            className={
              theme === 'dark' ? 'pdf-viewer-dark' : 'pdf-viewer-light'
            }
          >
            {/* CSS for text selection highlight & Search Highlight */}
            <style>{`
              .pdf-viewer-dark ::selection,
              .pdf-viewer-light ::selection {
                background: rgba(251, 191, 36, 0.4) !important; /* Yellow-ish for selection */
                color: inherit !important;
              }
              .pdf-viewer-dark ::-moz-selection,
              .pdf-viewer-light ::-moz-selection {
                background: rgba(251, 191, 36, 0.4) !important;
                color: inherit !important;
              }
              .rpv-core__text-layer-text::selection {
                background: rgba(251, 191, 36, 0.4) !important;
              }
              
              /* Search/Key Point Highlights - YELLOW */
              .rpv-search__highlight {
                background-color: #fbbf24 !important; /* Amber-400 */
                color: black !important;
                border-radius: 2px;
                box-shadow: 0 0 4px rgba(251, 191, 36, 0.5);
              }
            `}</style>
            <Viewer
              fileUrl={fileUrl}
              defaultScale={SpecialZoomLevel.PageWidth}
              plugins={plugins}
              theme={theme === 'dark' ? 'dark' : 'light'}
            />
          </div>
        </Worker>
      </div>

      {/* Highlights Footer */}
      {highlights.length > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.headerBg,
            fontSize: '10px',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ color: '#f59e0b' }}>●</span>
          {highlights.length} key sections highlighted
        </div>
      )}

      {/* Translated Document Available Banner */}
      {translatedDocument && onDownloadTranslated && (
        <div
          style={{
            padding: '12px 14px',
            borderTop: `1px solid ${colors.border}`,
            background:
              theme === 'dark'
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <FileText size={14} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                Translation Ready
              </div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>
                {translatedDocument.name}
              </div>
            </div>
          </div>

          <button
            onClick={onDownloadTranslated}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      )}
    </div>
  );
}
