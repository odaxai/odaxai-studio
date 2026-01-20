// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { X, Scan, ZoomIn, ZoomOut } from 'lucide-react';

// Lazy load PDFViewer only when needed
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  loading: () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        background: '#0d0d0d',
      }}
    >
      Loading PDF Viewer...
    </div>
  ),
  ssr: false,
});

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  theme: 'dark' | 'light';
  isGenerating?: boolean;
  highlights?: string[];

  // Interactive features
  onExplain?: (text: string) => void;
  onAskQuestion?: (text: string, question: string) => void;
  onVisualize?: (text: string) => void;
  onHighlightKeyPoints?: () => void;

  // Translation support
  translatedDocument?: {
    name: string;
    content: string;
  } | null;
  onDownloadTranslated?: () => void;

  themeColors?: any;
}

export default function DocumentViewer({
  fileUrl,
  fileName,
  onClose,
  theme,
  isGenerating,
  highlights,
  onExplain,
  onAskQuestion,
  onVisualize,
  onHighlightKeyPoints,
  translatedDocument,
  onDownloadTranslated,
  themeColors = {
    border: '#333',
    text: '#fff',
    textMuted: '#888',
    primary: '#6366f1',
  },
}: DocumentViewerProps) {
  const isImage = /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName);

  if (isImage) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: theme === 'dark' ? '#0f0f11' : '#fff',
          borderLeft: `1px solid ${themeColors.border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${themeColors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: theme === 'dark' ? '#18181b' : '#f8f9fa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <span
              style={{
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '240px',
                color: themeColors.text,
              }}
              title={fileName}
            >
              {fileName}
            </span>
          </div>
          <X
            size={20}
            style={{ cursor: 'pointer', color: themeColors.textMuted }}
            onClick={onClose}
          />
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: `1px solid ${themeColors.border}`,
            display: 'flex',
            gap: '12px',
            background: theme === 'dark' ? '#121214' : '#fff',
            fontSize: '13px',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => {
              alert(
                "OCR is requested! Ask the chat: 'Extract text from this image' or 'Find the license plate'."
              );
            }}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              fontSize: '12px',
            }}
          >
            <Scan size={14} /> Extract Text (OCR)
          </button>
          <span
            style={{
              color: themeColors.textMuted,
              marginLeft: 'auto',
              fontSize: '11px',
            }}
          >
            Image Mode
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            background: theme === 'dark' ? '#000' : '#f0f0f0',
          }}
        >
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <PDFViewer
      fileUrl={fileUrl}
      fileName={fileName}
      onClose={onClose}
      theme={theme}
      isGenerating={isGenerating}
      highlights={highlights}
      onExplain={onExplain}
      onAskQuestion={onAskQuestion}
      onVisualize={onVisualize}
      onHighlightKeyPoints={onHighlightKeyPoints}
      translatedDocument={translatedDocument}
      onDownloadTranslated={onDownloadTranslated}
    />
  );
}
