// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useChatContext } from '../context/ChatContext';
import { X, Download, Globe } from 'lucide-react';
import { generateTranslatedPDF } from '../services/translationService';

// Global translation toast that shows in layout (persists across pages)
export default function TranslationToast() {
  const { translationState, cancelTranslation } = useChatContext();

  // Don't show if not translating and no translated doc
  if (!translationState.isTranslating && !translationState.translatedDocument) {
    return null;
  }

  const handleDownload = () => {
    if (translationState.translatedDocument) {
      generateTranslatedPDF(
        translationState.fileName || 'document.pdf',
        translationState.translatedDocument.content,
        translationState.translatedDocument.name
          .replace(/.*_/, '')
          .replace('.pdf', '')
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999, // Very high to show above everything
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'rgba(10, 10, 10, 0.95)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        border: '1px solid #333',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '320px',
        maxWidth: '400px',
        animation: 'slideUp 0.3s ease',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: translationState.translatedDocument
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0,
        }}
      >
        {translationState.translatedDocument ? (
          <Download size={20} />
        ) : (
          <Globe
            size={20}
            style={{
              animation: 'spin 2s linear infinite',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {translationState.translatedDocument ? (
            <>✅ Translation Complete</>
          ) : (
            <>🌍 Translating...</>
          )}
        </div>

        {/* Show file name */}
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {translationState.fileName || 'document'}
        </div>

        {/* Progress bar (only when translating) */}
        {translationState.isTranslating &&
          !translationState.translatedDocument && (
            <>
              <div
                style={{
                  height: '4px',
                  background: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    width: `${translationState.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                {translationState.status}
              </div>
            </>
          )}

        {/* Download button when complete */}
        {translationState.translatedDocument && (
          <button
            onClick={handleDownload}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px 12px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            Download Translated PDF
          </button>
        )}
      </div>

      {/* Close/Cancel Button */}
      <button
        onClick={cancelTranslation}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
        }}
        title={translationState.isTranslating ? 'Cancel' : 'Dismiss'}
      >
        <X size={14} />
      </button>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
