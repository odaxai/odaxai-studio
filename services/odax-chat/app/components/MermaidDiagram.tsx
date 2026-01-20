// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  theme?: 'dark' | 'light';
}

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function MermaidDiagram({
  chart,
  theme = 'dark',
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        darkMode: theme === 'dark',
        primaryColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        lineColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
      },
    });

    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      const attemptRender = async (code: string): Promise<boolean> => {
        try {
          // Pre-processing: Clean up common LLM mistakes
          // 1. Find the start of the diagram (ignore "Here is the chart:" text inside block)
          const validStarts = [
            'graph',
            'flowchart',
            'sequenceDiagram',
            'classDiagram',
            'stateDiagram',
            'erDiagram',
            'gantt',
            'pie',
            'mindmap',
          ];

          let cleanCode = code.trim();
          const lines = cleanCode.split('\n');
          const startIndex = lines.findIndex((line) =>
            validStarts.some((s) => line.trim().startsWith(s))
          );

          if (startIndex > 0) {
            cleanCode = lines.slice(startIndex).join('\n');
          } else if (
            startIndex === -1 &&
            !validStarts.some((s) => cleanCode.startsWith(s))
          ) {
            // If no clear start found, maybe it's just missing the definition?
            // Default to graph TD if it looks like node syntax
            if (cleanCode.includes('-->') || cleanCode.includes('---')) {
              cleanCode = 'graph TD\n' + cleanCode;
            }
          }

          // 2. Fix unquoted labels: A[Text with (parens)] -> A["Text with (parens)"]
          cleanCode = cleanCode.replace(/\[([^"\]][^\]]*?)\]/g, '["$1"]');

          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, cleanCode);
          setSvg(svg);
          setError(null);
          return true;
        } catch (err) {
          return false;
        }
      };

      // 1. Try rendering (standard clean)
      if (await attemptRender(chart)) return;

      // 2. BRUTAL MODE: If it failed, it's likely due to invalid chars in labels.
      // Replace content of ALL labels with alphanumeric-only version.
      // e.g. A["Complex & Bad (Label)"] -> A["Complex Bad Label"]
      let brutalCode = chart;

      // Ensure we have a graph definition first
      if (
        !brutalCode.includes('graph ') &&
        !brutalCode.includes('flowchart ')
      ) {
        brutalCode = 'graph TD\n' + brutalCode;
      }

      // Brutal regex: find content inside [...] and strip non-alphanumeric chars
      brutalCode = brutalCode.replace(/\[(.*?)\]/g, (match, content) => {
        const safeContent = content.replace(/[^a-zA-Z0-9 \-_]/g, ' '); // Replace bad chars with space
        return `["${safeContent.trim()}"]`;
      });

      if (await attemptRender(brutalCode)) return;

      // 2. If rejected, it might be due to truncation (common with LLMs).
      // Try removing the last line recursively until it works.
      let lines = chart.split('\n');

      // Safety limit: don't prune everything, keep at least the header (graph TD)
      const minLines =
        lines[0]?.startsWith('graph') || lines[0]?.startsWith('flowchart')
          ? 2
          : 1;

      while (lines.length > minLines) {
        lines.pop(); // Remove the last line (likely incomplete)
        const prunedCode = lines.join('\n');
        if (await attemptRender(prunedCode)) {
          // Success! Use the pruned version
          return;
        }
      }

      // 3. EMERGENCY FALLBACK: If absolutely everything fails, show a "Broken" diagram
      // so the user effectively sees that the system is working but the data was bad.
      try {
        const fallbackCode = `graph TD
        Error["⚠️ Visualization Failed"] --> Check["Click 'Show Code' below"]
        Check --> Details["The AI generated invalid syntax"]`;

        const id = `mermaid-fallback-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, fallbackCode);
        setSvg(svg);
        setError(null); // Clear error because we are showing a fallback
      } catch (fallbackErr) {
        console.error('Mermaid FATAL Error:', fallbackErr);
        setError('Mermaid system completely broken.');
      }
    };

    renderChart();
  }, [chart, theme]);

  if (error) {
    return (
      <div
        style={{
          padding: '12px',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)',
          color: '#ef4444',
          fontSize: '12px',
          margin: '8px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>⚠️ Could not render visualization.</div>
          <details>
            <summary style={{ cursor: 'pointer', opacity: 0.8 }}>
              Show Code
            </summary>
            <pre
              style={{
                marginTop: '8px',
                background: 'rgba(0,0,0,0.2)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                maxHeight: '200px',
              }}
            >
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="mermaid-container group"
        ref={containerRef}
        onClick={() => setIsModalOpen(true)}
        title="Click to zoom"
        style={{
          margin: '16px 0',
          padding: '16px',
          background:
            theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
          borderRadius: '12px',
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
          border: `1px solid ${
            theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }`,
          cursor: 'zoom-in',
          position: 'relative',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor =
            theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor =
            theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            opacity: 0.5,
          }}
        >
          <Maximize2 size={16} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => {
            // Close on background click
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '16px',
              gap: '16px',
              zIndex: 10000,
            }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Zoomable Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit={true}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '32px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '12px',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '8px 16px',
                      borderRadius: '24px',
                      zIndex: 10000,
                    }}
                  >
                    <button
                      onClick={() => zoomOut()}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <ZoomOut />
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => zoomIn()}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <ZoomIn />
                    </button>
                  </div>

                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: svg }}
                      style={{
                        // Filter to make text white in strict dark mode if SVG has black text
                        filter: theme === 'dark' ? 'invert(0)' : 'none',
                        width: '100%',
                        minWidth: '800px', // Ensure it's not tiny
                      }}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </>
  );
}
