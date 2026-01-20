// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import React, { useState, useMemo, memo } from 'react';
import { Source } from '../context/ChatContext';
import { Copy, Check, Play, Save } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

interface MessageRendererProps {
  content: string;
  sources?: Source[];
  themeColors: any;
  theme?: 'dark' | 'light';
  thinking?: string;
  onShowThinking?: (content: string) => void;
}

// --- Types for Block-Based Rendering ---
type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'list'
  | 'table'
  | 'code'
  | 'mermaid'
  | 'hr';

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  language?: string;
  items?: string[];
  ordered?: boolean;
  headers?: string[];
  rows?: string[][];
}

// --- Main Component ---

const MessageRenderer = memo(
  ({
    content,
    themeColors,
    theme,
    thinking,
    onShowThinking,
  }: MessageRendererProps) => {
    // Optimization: Memoize parsed blocks to avoid re-parsing on every re-render if content is identical
    // In streaming, content changes every frame, so this doesn't help much UNLESS we throttle.
    // However, React 18 automatic batching helps.
    // The real fix is ensuring MemoizedBlock prevents child re-renders.

    const blocks = useMemo(() => parseBlocks(content), [content]);

    return (
      <div
        className="message-content"
        style={{ lineHeight: '1.6', fontSize: '15px' }}
      >
        {thinking && (
          <div
            style={{
              marginBottom: '12px',
            }}
          >
            <button
              onClick={() => onShowThinking && onShowThinking(thinking)}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'rgba(99, 102, 241, 0.25)';
                (e.currentTarget as HTMLElement).style.borderColor =
                  'rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'rgba(99, 102, 241, 0.15)';
                (e.currentTarget as HTMLElement).style.borderColor =
                  'rgba(99, 102, 241, 0.3)';
              }}
            >
              <Brain size={16} strokeWidth={2} />
              <span style={{ fontWeight: 500 }}>View Reasoning</span>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>
                ({Math.round(thinking.length / 4)} tokens)
              </span>
            </button>
          </div>
        )}

        {blocks.map((block) => (
          <MemoizedBlock
            key={block.id}
            block={block}
            themeColors={themeColors}
            theme={theme || 'dark'}
          />
        ))}
      </div>
    );
  }
);

export default MessageRenderer;

// --- Types for Block-Based Rendering ---
type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'list'
  | 'table'
  | 'code'
  | 'mermaid'
  | 'hr';

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  language?: string;
  items?: string[];
  ordered?: boolean;
  headers?: string[];
  rows?: string[][];
}

// --- Helper Components (Preserved) ---

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="copy-btn"
      style={{
        background: 'transparent',
        border: 'none',
        color: copied ? '#10b981' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '6px 10px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function RunButton({ code, language }: { code: string; language: string }) {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    const lang = (language || '').toLowerCase();

    // JS execution
    if (lang === 'javascript' || lang === 'js') {
      try {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(
            args
              .map((a) =>
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              )
              .join(' ')
          );
        };
        const result = new Function(code)();
        console.log = originalLog;
        const outputText =
          logs.length > 0
            ? logs.join('\n')
            : result !== undefined
              ? String(result)
              : 'Code executed (no output)';
        setOutput(outputText);
      } catch (e) {
        setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
      setRunning(false);
      return;
    }

    // Python execution
    if (lang === 'python' || lang === 'py' || lang === 'python3') {
      try {
        const res = await fetch('http://localhost:5001/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'python' }),
        });
        if (res.ok) {
          const data = await res.json();
          setOutput(data.output || data.error || 'Executed');
        } else {
          setOutput(
            '⚠️ Python executor not running.\nStart it with: cd server/python-executor && sh start.sh'
          );
        }
      } catch (err) {
        setOutput('⚠️ Python executor unreachable.');
      }
      setRunning(false);
      return;
    }

    setOutput(`Language "${language}" - copy and run in terminal.`);
    setRunning(false);
  };

  const runnableLanguages = [
    'python',
    'py',
    'javascript',
    'js',
    'typescript',
    'ts',
    'bash',
    'sh',
    'shell',
  ];
  if (!runnableLanguages.includes((language || '').toLowerCase())) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleRun}
        disabled={running}
        style={{
          background: running ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
          border: 'none',
          color: running ? '#10b981' : 'rgba(255,255,255,0.5)',
          cursor: running ? 'wait' : 'pointer',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s',
        }}
      >
        <Play size={14} />
        {running ? 'Running...' : 'Run'}
      </button>
      {output && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#10b981',
            fontFamily: 'monospace',
            maxWidth: '300px',
            whiteSpace: 'pre-wrap',
            zIndex: 100,
          }}
        >
          {output}
        </div>
      )}
    </div>
  );
}

function SaveButton({ code, language }: { code: string; language: string }) {
  const [saved, setSaved] = useState(false);
  const handleSave = async () => {
    const filename = prompt('Enter filename:', `code.${language || 'txt'}`);
    if (!filename) return;
    try {
      const res = await fetch('http://localhost:3000/api/save-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, filename }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      alert('Failed to save file');
    }
  };
  return (
    <button
      onClick={handleSave}
      style={{
        background: 'transparent',
        border: 'none',
        color: saved ? '#10b981' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '6px 10px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
      }}
    >
      {saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? 'Saved!' : 'Save'}
    </button>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  return (
    <div
      style={{
        background: '#1e1e1e',
        borderRadius: '8px',
        marginTop: '16px',
        marginBottom: '16px',
        overflow: 'hidden',
        border: '1px solid #333',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#1e1e1e',
          borderBottom: '1px solid #333',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: '#d4d4d4',
            fontWeight: 500,
            paddingLeft: '4px',
          }}
        >
          {language || 'code'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RunButton code={code} language={language} />
          <SaveButton code={code} language={language} />
          <CopyButton text={code} />
        </div>
      </div>
      <div style={{ display: 'flex', overflow: 'auto', maxHeight: '500px' }}>
        <div
          style={{
            padding: '16px 0',
            background: '#1e1e1e',
            borderRight: '1px solid #333',
            minWidth: '40px',
            textAlign: 'right',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {lines.map((_, index) => (
            <div
              key={index}
              style={{
                padding: '0 12px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#6e7681',
                fontFamily:
                  "'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace",
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <pre
          style={{
            margin: 0,
            padding: '16px',
            overflow: 'auto',
            flex: 1,
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#d4d4d4',
            fontFamily:
              "'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace",
            background: '#1e1e1e',
          }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function Brain({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-1.4 4.5 4.5 0 0 1-3 1.4" />
    </svg>
  );
}

// --- Inline Formatting Helper ---
function processInlineFormatting(
  text: string,
  themeColors: any
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  let result = text;
  result = result.replace(/`([^`]+)`/g, '⟨CODE⟩$1⟨/CODE⟩');
  result = result.replace(/\*\*([^*]+)\*\*/g, '⟨BOLD⟩$1⟨/BOLD⟩');
  result = result.replace(/\*([^*]+)\*/g, '⟨ITALIC⟩$1⟨/ITALIC⟩');

  const tokens = result.split(
    /(⟨CODE⟩.*?⟨\/CODE⟩|⟨BOLD⟩.*?⟨\/BOLD⟩|⟨ITALIC⟩.*?⟨\/ITALIC⟩)/
  );

  for (const token of tokens) {
    if (token.startsWith('⟨CODE⟩')) {
      const content = token.replace('⟨CODE⟩', '').replace('⟨/CODE⟩', '');
      parts.push(
        <code
          key={key++}
          style={{
            background: 'rgba(128,128,128,0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: "'SF Mono', 'Monaco', monospace",
            color: '#f472b6',
          }}
        >
          {content}
        </code>
      );
    } else if (token.startsWith('⟨BOLD⟩')) {
      const content = token.replace('⟨BOLD⟩', '').replace('⟨/BOLD⟩', '');
      parts.push(
        <strong
          key={key++}
          style={{ fontWeight: 600, color: themeColors.text }}
        >
          {content}
        </strong>
      );
    } else if (token.startsWith('⟨ITALIC⟩')) {
      const content = token.replace('⟨ITALIC⟩', '').replace('⟨/ITALIC⟩', '');
      parts.push(
        <em key={key++} style={{ fontStyle: 'italic' }}>
          {content}
        </em>
      );
    } else if (token) {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIdx = 0;
      let match;
      while ((match = linkRegex.exec(token)) !== null) {
        if (match.index > lastIdx)
          parts.push(
            <span key={key++}>{token.slice(lastIdx, match.index)}</span>
          );
        parts.push(
          <a
            key={key++}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#818cf8', textDecoration: 'none' }}
          >
            {match[1]}
          </a>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < token.length)
        parts.push(<span key={key++}>{token.slice(lastIdx)}</span>);
    }
  }
  return parts;
}

// --- Memoized Table Row ---
const MemoizedTableRow = memo(
  ({
    row,
    index,
    themeColors,
  }: {
    row: string[];
    index: number;
    themeColors: any;
  }) => {
    return (
      <tr
        style={{
          background:
            index % 2 === 0
              ? themeColors.tableRowOdd
              : themeColors.tableRowEven,
          transition: 'background-color 0.15s ease',
        }}
        // CSS hover is handled via className in production, this is inline fallback
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            themeColors.tableRowHover || 'rgba(100,100,255,0.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            index % 2 === 0
              ? themeColors.tableRowOdd
              : themeColors.tableRowEven;
        }}
      >
        {row.map((cell, j) => (
          <td
            key={j}
            style={{
              padding: '14px 20px', // Larger padding
              color: themeColors.text,
              borderBottom: `1px solid ${themeColors.tableBorder}`,
              lineHeight: '1.5',
            }}
          >
            {processInlineFormatting(cell, themeColors)}
          </td>
        ))}
      </tr>
    );
  },
  // Custom equality check: only re-render if the row CONTENT changes.
  // This bypasses the new-array-reference issue from parseBlocks.
  (prev, next) => {
    if (prev.index !== next.index) return false;
    if (prev.row.length !== next.row.length) return false;
    for (let i = 0; i < prev.row.length; i++) {
      if (prev.row[i] !== next.row[i]) return false;
    }
    return true;
  }
);
MemoizedTableRow.displayName = 'MemoizedTableRow';

// --- Memoized Block Component ---
// This is the key optimization. It only re-renders if props change.
const MemoizedBlock = memo(
  ({
    block,
    themeColors,
    theme,
  }: {
    block: Block;
    themeColors: any;
    theme: 'dark' | 'light';
  }) => {
    switch (block.type) {
      case 'code':
        return (
          <CodeBlock
            language={block.language || ''}
            code={block.content || ''}
          />
        );
      case 'mermaid':
        return <MermaidDiagram chart={block.content || ''} theme={theme} />;
      case 'table':
        return (
          <div
            style={{
              overflowX: 'auto',
              marginTop: '20px',
              marginBottom: '20px',
              borderRadius: '12px',
              border: `1px solid ${themeColors.tableBorder}`,
              boxShadow:
                theme === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.3)'
                  : '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '15px', // Slightly larger for readability
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, #2a2a3e, #1e1e2e)'
                        : 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                  }}
                >
                  {block.headers?.map((header, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '14px 20px', // More generous padding
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: theme === 'dark' ? '#a0a0ff' : '#4a4a8a',
                        borderBottom: `2px solid ${themeColors.tableBorder}`,
                      }}
                    >
                      {processInlineFormatting(header, themeColors)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, i) => (
                  <MemoizedTableRow
                    key={i} // Index is safe here as rows only append
                    row={row}
                    index={i}
                    themeColors={themeColors}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'list':
        const Tag = block.ordered ? 'ol' : 'ul';
        return (
          <Tag
            style={{
              paddingLeft: '24px',
              marginTop: '12px',
              marginBottom: '12px',
            }}
          >
            {block.items?.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: '8px',
                  color: themeColors.text,
                  paddingLeft: '4px',
                }}
              >
                {processInlineFormatting(item, themeColors)}
              </li>
            ))}
          </Tag>
        );
      case 'h1':
        return (
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: themeColors.text,
              marginTop: '28px',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {processInlineFormatting(block.content || '', themeColors)}
          </h1>
        );
      case 'h2':
        return (
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: themeColors.text,
              marginTop: '24px',
              marginBottom: '12px',
              letterSpacing: '-0.01em',
            }}
          >
            {processInlineFormatting(block.content || '', themeColors)}
          </h2>
        );
      case 'h3':
        return (
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: themeColors.text,
              marginTop: '20px',
              marginBottom: '10px',
            }}
          >
            {processInlineFormatting(block.content || '', themeColors)}
          </h3>
        );
      case 'hr':
        return (
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              margin: '24px 0',
            }}
          />
        );
      case 'paragraph':
      default:
        if (!block.content?.trim()) return null;
        return (
          <p
            style={{
              marginTop: '12px',
              marginBottom: '12px',
              color: themeColors.text,
            }}
          >
            {processInlineFormatting(block.content || '', themeColors)}
          </p>
        );
    }
  },
  (prev, next) => {
    // Custom comparison for performance

    // 1. Check strict primitives
    if (prev.block.id !== next.block.id) return false;
    if (prev.theme !== next.theme) return false;
    if (prev.block.type !== next.block.type) return false;

    // 2. Check content (fast string comparison)
    if (prev.block.content !== next.block.content) return false;

    // 3. For complex types (table, list), check deep structure ONLY if strictly necessary
    // Arrays are ref-checked first, then length, then content
    if (prev.block.type === 'table') {
      const pRows = prev.block.rows || [];
      const nRows = next.block.rows || [];
      if (pRows.length !== nRows.length) return false;
      // Optimization: Only check the last row content, as tables usually append
      if (pRows.length > 0) {
        const lastP = pRows[pRows.length - 1];
        const lastN = nRows[nRows.length - 1];
        if (lastP.length !== lastN.length) return false;
        if (lastP.join('') !== lastN.join('')) return false; // fast string check
        // If strict correctness needed, check all. But for streaming, last row is 99% of changes.
      }
      return true;
    }

    if (prev.block.type === 'list') {
      const pItems = prev.block.items || [];
      const nItems = next.block.items || [];
      if (pItems.length !== nItems.length) return false;
      // Check last item
      if (
        pItems.length > 0 &&
        pItems[pItems.length - 1] !== nItems[nItems.length - 1]
      )
        return false;
      return true;
    }

    // Default equal
    return true;
  }
);

// --- Main Parser Function ---
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let currentId = 0;

  // 1. Split by Code Blocks first (```)
  // Improved regex to capture unclosed code blocks at the end of the string
  const codeParts = content.split(/(```[\s\S]*?(?:```|$))/g);

  codeParts.forEach((part) => {
    if (part.startsWith('```')) {
      // It's a code block (closed or unclosed)
      let innerContent = part.slice(3);
      if (innerContent.endsWith('```')) {
        innerContent = innerContent.slice(0, -3);
      }

      let language = '';
      let code = innerContent;

      const newlineIndex = innerContent.indexOf('\n');
      if (newlineIndex !== -1) {
        language = innerContent.slice(0, newlineIndex).trim();
        code = innerContent.slice(newlineIndex + 1);
      }

      // Clean language
      language = language.replace(/[^a-zA-Z0-9+#-]/g, '');

      if (language.toLowerCase() === 'mermaid') {
        blocks.push({
          id: `mermaid-${currentId++}`,
          type: 'mermaid',
          content: code.trim(),
        });
      } else {
        blocks.push({
          id: `code-${currentId++}`,
          type: 'code',
          content: code.trim(), // Keep formatting? trim() might remove indent. Code layout usually handles indent.
          language,
        });
      }
    } else {
      // It's markdown text - parse line by line
      const lines = part.split('\n');
      let currentTable: Block | null = null;
      let currentList: Block | null = null;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          // Reset context on empty line
          currentTable = null;
          currentList = null;
          return;
        }

        // --- Table Detection (Relaxed for Streaming) ---
        // Just checking startsWith('|') prevents flip-flop between P and Table
        if (trimmed.startsWith('|')) {
          const cells = trimmed
            .split('|')
            .map((c) => c.trim())
            .filter((c, i, arr) => {
              // Remove empty first/last elements caused by splitting '|...|'
              // logic: if string is "| a | b |", split gives ["", " a ", " b ", ""]
              // We want to keep inner content.
              if (i === 0 && c === '') return false;
              if (i === arr.length - 1 && c === '') return false;
              return true;
            });

          const isSeparator = cells.every((c) => /^[-:]+$/.test(c));

          if (isSeparator && currentTable) {
            return; // Ignore separator row
          }

          if (!currentTable) {
            // Start new table
            currentTable = {
              id: `table-${currentId++}`,
              type: 'table',
              headers: cells,
              rows: [],
            };
            blocks.push(currentTable);
          } else {
            // Add row to existing table
            currentTable.rows?.push(cells);
          }
          currentList = null;
          return;
        } else {
          currentTable = null;
        }

        // --- List Detection ---
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);

        if (numberedMatch || bulletMatch) {
          const isOrdered = !!numberedMatch;
          const itemContent = numberedMatch
            ? numberedMatch[2]
            : bulletMatch![1];

          if (!currentList || currentList.ordered !== isOrdered) {
            // Start new list
            currentList = {
              id: `list-${currentId++}`,
              type: 'list',
              ordered: isOrdered,
              items: [itemContent],
            };
            blocks.push(currentList);
          } else {
            // Append to existing list
            currentList.items?.push(itemContent);
          }
          return;
        } else {
          currentList = null;
        }

        // --- Headings & HR ---
        if (trimmed.startsWith('# ')) {
          blocks.push({
            id: `h1-${currentId++}`,
            type: 'h1',
            content: trimmed.slice(2),
          });
          return;
        }
        if (trimmed.startsWith('## ')) {
          blocks.push({
            id: `h2-${currentId++}`,
            type: 'h2',
            content: trimmed.slice(3),
          });
          return;
        }
        if (trimmed.startsWith('### ')) {
          blocks.push({
            id: `h3-${currentId++}`,
            type: 'h3',
            content: trimmed.slice(4),
          });
          return;
        }
        if (trimmed === '---' || trimmed === '***') {
          blocks.push({ id: `hr-${currentId++}`, type: 'hr' });
          return;
        }

        // --- Regular Paragraph ---
        // If the previous block was a paragraph, append to it (for multi-line paragraphs)
        // OTHERWISE, create new paragraph
        const lastBlock = blocks[blocks.length - 1];
        if (
          lastBlock &&
          lastBlock.type === 'paragraph' &&
          !currentTable &&
          !currentList
        ) {
          // Add space only if previous wasn't a hard break context?
          // For now simple space is fine
          lastBlock.content += ' ' + trimmed;
        } else {
          blocks.push({
            id: `p-${currentId++}`,
            type: 'paragraph',
            content: trimmed,
          });
        }
      });
    }
  });

  return blocks;
}

// --- Main Component ---

// End of MessageRenderer wrapper

// End of file active
