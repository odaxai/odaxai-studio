'use client';

import { Source } from '../context/ChatContext';
import { ExternalLink, Loader2, Check } from 'lucide-react';

interface ResearchProgressPanelProps {
  progress: number;
  phase: string;
  message: string;
  sources: Source[];
  currentSource?: number;
  totalSources?: number;
}

export default function ResearchProgressPanel({
  progress,
  phase,
  message,
  sources,
  currentSource,
  totalSources,
}: ResearchProgressPanelProps) {
  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #2a2a2a',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: phase === 'complete' ? '#10b981' : '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {phase === 'complete' ? (
              <Check size={18} color="white" />
            ) : (
              <Loader2 size={18} color="white" className="animate-spin" />
            )}
          </div>
          <div>
            <div
              style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 600 }}
            >
              Deep Research
            </div>
            <div style={{ color: '#808080', fontSize: '12px' }}>{message}</div>
          </div>
        </div>
        <div
          style={{
            color: phase === 'complete' ? '#10b981' : '#6366f1',
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: 'monospace',
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '4px',
          background: '#2a2a2a',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: phase === 'complete' ? '#10b981' : '#6366f1',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Phase info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
          fontSize: '11px',
          color: '#606060',
        }}
      >
        <span>Local processing</span>
        <span>
          {currentSource && totalSources
            ? `Source ${currentSource} of ${totalSources}`
            : 'Initializing...'}
        </span>
      </div>

      {/* Sources being analyzed */}
      {sources.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #2a2a2a',
            }}
          >
            <ExternalLink size={14} color="#606060" />
            <span
              style={{ color: '#808080', fontSize: '12px', fontWeight: 500 }}
            >
              Analyzing Sources ({sources.length})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {sources.map((source) => (
              <SourceItem key={source.id} source={source} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SourceItem({ source }: { source: Source }) {
  const isReading = source.status === 'reading';

  const handleClick = () => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        width: '100%',
      }}
    >
      {/* Number badge */}
      <div
        style={{
          minWidth: '22px',
          height: '22px',
          borderRadius: '5px',
          background: isReading ? '#6366f1' : '#2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isReading ? 'white' : '#808080',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {isReading ? <Loader2 size={12} className="animate-spin" /> : source.id}
      </div>

      {/* Thumbnail */}
      {source.image && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#2a2a2a',
          }}
        >
          <img
            src={source.image}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: isReading ? '#6366f1' : '#c0c0c0',
            fontSize: '12px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isReading ? 'Reading...' : source.title?.slice(0, 50) || 'Source'}
        </div>
        <div
          style={{
            color: '#505050',
            fontSize: '10px',
          }}
        >
          {(() => {
            try {
              return new URL(source.url).hostname;
            } catch {
              return source.url?.slice(0, 30);
            }
          })()}
        </div>
      </div>

      <ExternalLink size={12} color="#505050" />
    </button>
  );
}
