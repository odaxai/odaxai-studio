// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import {
  ArrowUp,
  Paperclip,
  Menu,
  ChevronDown,
  Square,
  Sparkles,
  Database,
  Mic,
  Sun,
  Moon,
  Zap,
  Clock,
  Cpu,
  Activity,
} from 'lucide-react';
import styles from './ChatArea.module.css';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { useModelStore } from '../store/model-store';
import SourceCard from './SourceCard';
// import ResearchProgressPanel from './ResearchProgressPanel'; // Removed unused
import MessageRenderer from './MessageRenderer';
import ThinkingPanel from './ThinkingPanel';
// import PDFViewer from './PDFViewer'; // Lazy load this
import dynamic from 'next/dynamic';

import DocumentViewer from './DocumentViewer';

import { useDropzone } from 'react-dropzone';
// import * as pdfjsLib from 'pdfjs-dist'; // Removed to prevent main thread blocking
import { parsePdf, parseWord } from '../actions';
import { X as XIcon, FileText, Download, Scan } from 'lucide-react';
import {
  detectTranslationRequest,
  generateTranslatedPDF,
} from '../services/translationService';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  getUserStats,
  syncHardware,
  syncPendingStats,
} from '../lib/usageTracker';
import { cleanupUserStats } from '../lib/cleanupStats';
import { detectHardware } from '../lib/hardwareDetect';

// PDF worker initialization moved to PDFViewer component or lazy loaded

interface ChatAreaProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  user?: import('firebase/auth').User | null;
  profile?: import('../context/AuthContext').UserProfile | null;
  onSignOut?: () => Promise<void>;
  authLoading?: boolean;
}

export default function ChatArea({
  onToggleSidebar,
  isSidebarOpen,
  theme,
  setTheme,
  user,
  profile, // Use profile from props
}: ChatAreaProps) {
  // Get chat data from context
  const {
    sendMessage,
    isGenerating,
    currentChat,
    stopGeneration,
    searchMode,
    thinkingEnabled,
    setThinkingEnabled,
    localMemoryEnabled,
    setLocalMemoryEnabled,
    thinkingStatus,
    thinkingContent,
    setThinkingContent,
    thinkingHistory,
    currentSources,
    researchProgress,
    // Translation (from context - persists across navigation)
    translationState,
    startTranslation,
    cancelTranslation,
    isChatsLoaded,
  } = useChatContext();

  // Extract messages from current chat for convenience
  const messages = currentChat?.messages || [];

  const [isSyncing, setIsSyncing] = useState(false);
  const [techStatsModal, setTechStatsModal] = useState<any | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; content: string; fileUrl?: string }[]
  >([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Highlight state
  const [highlights, setHighlights] = useState<string[]>([]);
  const [awaitingHighlights, setAwaitingHighlights] = useState(false);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  // const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null); // Removed: Use profile.photoURL
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userStats, setUserStats] = useState<{
    totalTokens: number;
    totalInferences: number;
    modelsUsed: Record<string, number>;
    tokensPerModel?: Record<string, number>;
    reasoningCount?: number;
  } | null>(null);
  const [sharingEnabled, setSharingEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('odax-sharing-enabled') === 'true';
    }
    return false;
  });

  // Refresh stats when AI response completes
  const prevIsGenerating = useRef(isGenerating);
  useEffect(() => {
    // When generation ends (was true, now false) - refresh stats
    if (prevIsGenerating.current && !isGenerating && firebaseUser) {
      getUserStats(firebaseUser.uid).then((stats) => {
        if (stats) setUserStats(stats);
      });
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating, firebaseUser]);

  // Effect to parse AI response for highlights
  useEffect(() => {
    if (!awaitingHighlights || !messages || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.content.includes('## 🔑 Key Points to Highlight')
    ) {
      const lines = lastMessage.content.split('\n');
      const extracted: string[] = [];
      lines.forEach((line) => {
        const match = line.match(/\*\*\\"(.+?)\\"\*\*/);
        if (match) extracted.push(match[1]);
        else {
          // Try simpler match without escaped quotes if needed
          const simpleMatch = line.match(/\*\*"(.+?)"\*\*/);
          if (simpleMatch) extracted.push(simpleMatch[1]);
        }
      });
      if (extracted.length) setHighlights(extracted);
      setAwaitingHighlights(false);
    }
  }, [messages, awaitingHighlights]);

  // Active document for side panel (PDF Viewer)
  const [localActiveDocument, setLocalActiveDocument] = useState<{
    name: string;
    content: string;
    fileUrl?: string;
  } | null>(null);

  // Remember last document so it can be reopened
  const [lastDocument, setLastDocument] = useState<{
    name: string;
    content: string;
    fileUrl?: string;
  } | null>(null);

  // Resizable PDF panel width (percentage)
  const [pdfPanelWidth, setPdfPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  // Wrapper to track last document when closing
  const setActiveDocument = (doc: typeof localActiveDocument) => {
    if (doc) {
      setLastDocument(doc);
    }
    setLocalActiveDocument(doc);
  };
  // Alias activeDocument to localActiveDocument to minimize refactor impact
  const activeDocument = localActiveDocument;

  // ... (drag drop logic) ...

  // --- Advanced Client-Side OCR Fallback ---
  const performClientSideOcrFallback = async (file: File): Promise<string> => {
    console.log(
      '🔄 Starting Enhanced Client-Side OCR fallback for:',
      file.name
    );
    setThinkingStatus('Enhanced OCR running locally (Please Wait)...');

    try {
      // 1. Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker to LOCAL file (copied to public folder) to avoid CORS/Network issues
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        // Disable unnecessary font loading which can crash
        disableFontFace: true,
      });

      const pdf = await loadingTask.promise;
      console.log(`📄 PDF Loaded (Pages: ${pdf.numPages})`);

      // 2. Dynamic import of Tesseract
      const Tesseract = (await import('tesseract.js')).default;

      let fullText = '';
      // Limit to first 5 pages for responsiveness - warn user if truncated
      const numPagesToScan = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= numPagesToScan; i++) {
        setThinkingStatus(`Scanning page ${i}/${numPagesToScan}...`);

        try {
          const page = await pdf.getPage(i);
          // High res logic: Scale 2.0 is good balance
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not create canvas context');

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;

          // Convert to blob
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (!blob) {
            console.warn(`⚠️ Page ${i} render failed (empty blob)`);
            continue;
          }

          // Perform OCR with proper language
          const {
            data: { text },
          } = await Tesseract.recognize(blob, 'eng+ita', {
            // logger: m => console.log(m) // Uncomment for noisy logs
          });

          const cleanText = text.trim();
          if (cleanText.length > 0) {
            fullText += `[Page ${i} OCR]\n${cleanText}\n\n`;
          } else {
            console.warn(`⚠️ Page ${i} OCR returned empty text`);
          }
        } catch (pageErr) {
          console.error(`❌ Failed to process page ${i}:`, pageErr);
        }
      }

      if (pdf.numPages > 5) {
        fullText += `\n[... OCR limited to first 5 pages for speed. Total document pages: ${pdf.numPages}. Please upload as images for full processing if needed ...]`;
      }

      // Safety limit for OCR text too
      if (fullText.length > 15000) {
        const head = fullText.slice(0, 10000);
        const tail = fullText.slice(fullText.length - 5000);
        fullText = `${head}\n\n[... OCR Middle Truncated ...]\n\n${tail}`;
      }

      if (fullText.trim().length < 20) {
        throw new Error(
          'OCR returned insufficient text (page likely blank or unrecognizable)'
        );
      }

      console.log(`✅ OCR Complete: ${fullText.length} chars extracted`);
      return fullText;
    } catch (e) {
      console.error('❌ critical Client OCR failed:', e);
      throw e;
    } finally {
      // Clear status
      // We don't clear explicitly here because sendMessage will overwrite it or it will fade
      // But let's set it to empty just in case
      // setThinkingStatus('');
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    console.log(
      '📎 Files dropped:',
      acceptedFiles.map((f) => f.name)
    );
    setIsProcessingFile(true);
    try {
      for (const file of acceptedFiles) {
        const isPdf =
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          console.log(`📄 Processing PDF via server action: ${file.name}`);
          try {
            // Use server action for PDF parsing (more reliable than client-side pdfjs)
            const formData = new FormData();
            formData.append('file', file);

            // Server attempt
            const result = await parsePdf(formData);
            let extractedText = result.text || '';
            let serverFailed = false;

            // Check for server failure/empty text which implies scanned PDF
            // Also check for very short text (e.g. just page numbers)
            if (
              !extractedText ||
              extractedText.includes('Text extraction failed') ||
              extractedText.trim().length < 50
            ) {
              console.warn(
                '⚠️ Server returned failure/empty/short text. Attempting Client OCR...'
              );
              serverFailed = true;

              // Show toast or alert? Just rely on thinkingStatus
              try {
                const fallbackText = await performClientSideOcrFallback(file);
                extractedText = fallbackText; // Override with OCR text
                serverFailed = false; // Recovered!
              } catch (fallbackErr) {
                console.error('❌ Fallback OCR also failed:', fallbackErr);
                // Stay failed
              }
            }

            // Truncate to prevent Context Window Overflow (Error 400)
            // 15,000 chars is approx 4k token - SAFE for all models (even 8k context)
            const MAX_PDF_CHARS = 15000;
            const HEAD_CHARS = 10000;
            const TAIL_CHARS = 5000;

            let truncatedText = extractedText.trim();

            if (truncatedText.length > MAX_PDF_CHARS) {
              console.log(
                `⚠️ PDF text truncated smart: ${truncatedText.length} → ${MAX_PDF_CHARS} chars`
              );
              // Keep Intro/Body and Conclusion
              const head = truncatedText.slice(0, HEAD_CHARS);
              const tail = truncatedText.slice(
                truncatedText.length - TAIL_CHARS
              );

              truncatedText = `${head}\n\n[... SYSTEM NOTE: Middle section truncated for AI memory optimization ...]\n\n${tail}`;
            }

            console.log(
              `✅ PDF parsed: ${truncatedText.length} chars (Original: ${extractedText.length})`
            );
            const pdfBlobUrl = URL.createObjectURL(file);
            const newDoc = {
              name: file.name,
              content: truncatedText,
              fileUrl: pdfBlobUrl,
            };

            setAttachedFiles((prev) => {
              const newFiles = [...prev, newDoc];
              console.log(
                `📌 Attached files:`,
                newFiles.map((f) => f.name)
              );
              return newFiles;
            });

            // AUTO-OPEN PDF in viewer panel immediately
            setLocalActiveDocument(newDoc);
            setLastDocument(newDoc);
            console.log(`📖 Auto-opened PDF viewer for: ${file.name}`);
          } catch (pdfErr) {
            console.error('❌ PDF parsing failed:', pdfErr);

            // Try Client-Side Fallback!
            try {
              const ocrText = await performClientSideOcrFallback(file);
              const pdfBlobUrl = URL.createObjectURL(file);

              setAttachedFiles((prev) => [
                ...prev,
                {
                  name: file.name,
                  content: `[---BEGIN PDF OCR---]\n${ocrText}\n[---END PDF OCR---]`,
                  fileUrl: pdfBlobUrl,
                },
              ]);

              // Auto-open
              const newDoc = {
                name: file.name,
                content: ocrText,
                fileUrl: pdfBlobUrl,
              };
              setLocalActiveDocument(newDoc);
              setLastDocument(newDoc);
            } catch (fallbackErr) {
              // Fallback failed too
              const pdfBlobUrl = URL.createObjectURL(file);
              setAttachedFiles((prev) => [
                ...prev,
                {
                  name: file.name,
                  content: `[PDF: ${file.name} - Text extraction failed completely. Please use Image Upload for OCR.]`,
                  fileUrl: pdfBlobUrl,
                },
              ]);
            }
          }
        } else if (
          file.type.startsWith('text/') ||
          /\.(md|js|ts|py|txt|json|yml|yaml|csv|html|xml|rtf|log|ini|cfg|sh|bash|zsh|c|cpp|h|hpp|java|rb|php|go|rs|swift|kt)$/i.test(
            file.name
          )
        ) {
          console.log(`📝 Processing text file: ${file.name}`);
          const text = await file.text();
          setAttachedFiles((prev) => [
            ...prev,
            { name: file.name, content: text },
          ]);
        } else if (/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
          // IMAGE OCR Support
          console.log(`🖼️ Processing image with OCR: ${file.name}`);
          try {
            // Dynamically import Tesseract.js to avoid large initial bundle
            const Tesseract = (await import('tesseract.js')).default;

            console.log('🔍 Starting Tesseract OCR...');
            const {
              data: { text },
            } = await Tesseract.recognize(
              file,
              'eng+ita' // Multi-language support
              // { logger: m => console.log(m) } // Uncomment for progress logs
            );

            console.log(`✅ Text extracted: ${text.length} chars`);
            const imageUrl = URL.createObjectURL(file);

            const extractedContent =
              text && text.trim().length > 10
                ? text
                : `[OCR Note: Low confidence text extraction or empty image.]`;

            setAttachedFiles((prev) => [
              ...prev,
              {
                name: file.name,
                content: `[---BEGIN IMAGE OCR: ${file.name}---]\n${extractedContent}\n[---END IMAGE OCR---]`,
                fileUrl: imageUrl,
              },
            ]);
          } catch (ocrErr) {
            console.error('❌ OCR failed:', ocrErr);
            const imageUrl = URL.createObjectURL(file);
            setAttachedFiles((prev) => [
              ...prev,
              {
                name: file.name,
                content: `[Image: ${file.name} - OCR Processing Failed. You can still refer to it.]`,
                fileUrl: imageUrl,
              },
            ]);
          }
        } else if (/\.docx$/i.test(file.name)) {
          // Word .docx documents - parse with mammoth on server
          console.log(`📄 Processing Word .docx: ${file.name}`);
          try {
            const formData = new FormData();
            formData.append('file', file);
            const result = await parseWord(formData);
            console.log(`✅ Word doc parsed: ${result.text.length} chars`);
            setAttachedFiles((prev) => [
              ...prev,
              { name: file.name, content: result.text },
            ]);
          } catch (wordErr) {
            console.error('❌ Word parsing failed:', wordErr);
            setAttachedFiles((prev) => [
              ...prev,
              {
                name: file.name,
                content: `[Errore lettura "${file.name}". Converti in PDF o copia-incolla il testo.]`,
              },
            ]);
          }
        } else if (/\.doc$/i.test(file.name)) {
          // Old Word .doc format - NOT supported by mammoth
          console.warn(`⚠️ Old .doc format not supported: ${file.name}`);
          alert(
            `⚠️ Il formato .doc (Word 97-2003) non è supportato.\n\nPer favore:\n1. Apri il file in Word o LibreOffice\n2. Salva come .docx o .pdf\n3. Carica il nuovo file`
          );
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              content: `[Il file "${file.name}" è in formato .doc (Word 97-2003) che non è supportato. Per favore converti in .docx o PDF prima di caricarlo.]`,
            },
          ]);
        } else {
          console.warn(`⚠️ Unsupported file type: ${file.name}`);
          alert(`File type not supported: ${file.name}`);
        }
      }
    } catch (e) {
      console.error('❌ File processing error:', e);
      alert('Error processing file');
    } finally {
      setIsProcessingFile(false);
      console.log('✓ File processing complete');
    }
  };

  const handleExtractText = async () => {
    if (!activeDocument) return;

    if (/\.(png|jpe?g|webp|bmp|gif)$/i.test(activeDocument.name)) {
      console.log('🔍 Manual OCR Requested...');
      setIsProcessingFile(true);
      setThinkingStatus('Extracting text from image...');

      try {
        const Tesseract = (await import('tesseract.js')).default;

        // Fetch blob from blob: URL
        const response = await fetch(activeDocument.fileUrl);
        const blob = await response.blob();

        const {
          data: { text },
        } = await Tesseract.recognize(blob, 'eng+ita');

        console.log('OCR Result length:', text.length);

        if (!text || text.trim().length < 5) {
          alert('OCR finished but found no text!');
        }

        const newContent = `[---BEGIN IMAGE OCR: ${activeDocument.name}---]\n${text}\n[---END IMAGE OCR---]`;

        // Update attached files with the new content
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.name === activeDocument.name ? { ...f, content: newContent } : f
          )
        );

        // Auto-analyze prompt
        const prompt = `Advanced Image Analysis Mode.

CRITICAL RULES:
1. Respond in the user's language (Default: Italian).
2. Extract structured data into Markdown tables.
3. Use minimal icons for key fields (e.g. 🚗 License Plate).

EXTRACTED TEXT:
"""
${text}
"""`;

        sendMessage(
          `🖼️ **OCR Extracted:**\n\n> "${text.slice(0, 50).replace(/\n/g, ' ')}..."`,
          prompt
        );
      } catch (e: any) {
        console.error('OCR Failed', e);
        alert('OCR Error: ' + e.message);
      } finally {
        setIsProcessingFile(false);
        setThinkingStatus('');
      }
    } else {
      alert(
        'OCR is supported for images (PNG, JPG). For PDFs, try converting to image if text extraction fails.'
      );
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const { availableModels, activeModel, fetchModels, setActiveModel } =
    useModelStore();
  const selectedModel = availableModels.find((m) => m.id === activeModel);

  // Smart Auto-Scroll: Only scroll if user is already near bottom to avoid fighting them
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll position to disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    // If user is within 100px of bottom, enable auto-scroll. Otherwise disable.
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      // Use 'auto' instead of 'smooth' for streaming to prevent lag accumulation
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [
    currentChat?.messages,
    // Also trigger on streaming message content changes
    currentChat?.messages?.[currentChat?.messages?.length - 1]?.content?.length,
    currentChat?.messages?.[currentChat?.messages?.length - 1]?.isStreaming,
    thinkingStatus,
    thinkingContent?.length, // Trigger on thinking content growth
    researchProgress.progress,
    shouldAutoScroll,
    isGenerating, // Trigger on generation state change
  ]);

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 10000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  useEffect(() => {
    if (currentSources.length > 0 && researchProgress.phase === 'complete') {
      setShowSourcesPanel(true);
    }
  }, [currentSources, researchProgress.phase]);

  // Firebase Auth State Listener + Firestore Profile Fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        console.log('🔐 User logged in:', user.email);

        // Profile photo is now handled via 'profile' prop from AuthContext

        // Cleanup any nested stats data and fetch user stats
        try {
          // Auto-cleanup nested objects from old dot-in-name bug
          const cleanup = await cleanupUserStats(user.uid);
          if (cleanup.cleaned) {
            console.log('🧹 Stats cleaned:', cleanup.message);
          }

          const stats = await getUserStats(user.uid);
          if (stats) {
            setUserStats(stats);
            console.log('📊 User stats loaded:', stats);
          }

          // Sync Hardware Stats
          const hardware = detectHardware();
          if (hardware) {
            syncHardware(user.uid, hardware);
          }
        } catch (error) {
          console.error('❌ Error fetching user stats:', error);
        }
      } else {
        // setUserPhotoURL(null); // Removed

        setUserStats(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (
      (!inputValue.trim() && attachedFiles.length === 0) ||
      isGenerating ||
      translationState.isTranslating
    )
      return;

    // Check for translation request with attached files
    console.log('📝 handleSend called with:', {
      inputValue,
      filesCount: attachedFiles.length,
    });
    const translationReq = detectTranslationRequest(inputValue);
    console.log('🔍 Translation detection result:', translationReq);

    if (translationReq.isTranslation && attachedFiles.length > 0) {
      // Start translation via context (persists across navigation)
      const fileToTranslate = attachedFiles[0];
      console.log(
        `🌍 Translation requested to ${translationReq.targetLangName}`
      );

      // Save document for viewing
      setLastDocument(fileToTranslate);
      setActiveDocument(fileToTranslate);

      // Start translation in context (runs in background)
      startTranslation(
        fileToTranslate.name,
        fileToTranslate.content,
        translationReq.targetLang,
        translationReq.targetLangName
      );

      // Clear input immediately
      setInputValue('');
      setAttachedFiles([]);

      return; // Don't proceed with normal send
    }

    // Normal message flow (non-translation)
    // Create message for the model with file content
    let modelMessage = inputValue;
    let displayMessage = inputValue; // For chat display - brief version
    let aiMessage = inputValue; // For AI - full message

    if (attachedFiles.length > 0) {
      // Truncate content to avoid exceeding context window (Guarantees space for output)
      const MAX_CONTENT_LENGTH = 150000; // ~40k tokens - Allows full document analysis
      const filesContext = attachedFiles
        .map((f) => {
          let content = f.content;
          console.log(
            `📄 File: ${f.name}, Content length: ${content.length} chars`
          );

          if (!content || content.length < 50) {
            console.warn(`⚠️ File ${f.name} seems empty or unreadable.`);
            return `[SYSTEM WARNING: The file "${f.name}" was attached but appears empty or could not be read. Please ask the user to upload it again or copy-paste the text.]`;
          }

          if (content.length > MAX_CONTENT_LENGTH) {
            content =
              content.slice(0, MAX_CONTENT_LENGTH) +
              `\n\n[... SYSTEM NOTE: Document truncated due to length limits. Total original length: ${f.content.length} characters. Analyze the available content above.]`;
          }
          // Format that makes it clear the content IS included and safe to analyze
          // Detect if this is an error message
          const isError =
            f.content.startsWith('[PDF:') && f.content.includes('failed');

          if (isError) {
            return `The file "${f.name}" could not be read (likely a scanned PDF). Suggest using the OCR feature.`;
          }

          return `---BEGIN DOCUMENT---
${content}
---END DOCUMENT---`;
        })
        .join('\n\n');

      const userInput = inputValue.trim();
      const userQuestion =
        userInput || 'Provide a comprehensive analysis of this document.';

      // Build rich analysis prompt
      const analysisInstruction = userInput
        ? `${userQuestion}\n\nUse rich Markdown formatting: tables, bold labels, bullet points. Be thorough.`
        : `Provide a comprehensive, detailed analysis of this document. Structure your response as follows:

## 📋 Executive Summary
Brief overview of the document (2-3 sentences).

## 🔑 Key Points
List the most important findings, arguments, or data points.

## 📊 Data & Metrics
If there are numbers, statistics, or comparisons, present them in a **Markdown table**.

## 🔬 Technical Details
Explain methodologies, approaches, or technical concepts found in the document.

## 💡 Conclusions & Significance
What are the main conclusions? Why is this important?

Use **bold** for key terms, tables for structured data, and be detailed.
Respond in the SAME language as the document.`;

      // Full message for AI (with complete PDF text)
      aiMessage = `${filesContext}\n\n${analysisInstruction}`;

      // Brief message for chat display (user doesn't need to see full PDF)
      displayMessage =
        attachedFiles.length > 0
          ? `📄 Attached: ${attachedFiles.map((f) => f.name).join(', ')}\n\n${userQuestion}`
          : userQuestion;

      console.log(
        `📤 Sending message with PDF, AI gets ${aiMessage.length} chars, user sees brief version`
      );

      // Save PDF for later viewing but DON'T auto-open the panel
      // User can click the button to view PDF if they want
      if (attachedFiles.length > 0) {
        setLastDocument(attachedFiles[0]);
      }

      // Auto-save PDF content to memory if enabled
      if (localMemoryEnabled) {
        console.log('💾 Saving PDF content to memory...');
        attachedFiles.forEach(async (f) => {
          try {
            // Use local API route (same origin, no CORS issues)
            await fetch('/api/user-memory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: 'document',
                content: `Document: ${f.name}\n\n${f.content.slice(0, 50000)}`,
              }),
            });
            console.log(`✅ Saved "${f.name}" to memory`);
          } catch (err) {
            console.error('❌ Failed to save to memory:', err);
          }
        });
      }
    }

    // Send display message to chat (brief), AI will get full PDF via attachedFiles context
    // Send both: display message for chat UI (brief), AI message for model (full PDF)
    sendMessage(displayMessage, aiMessage);
    setInputValue('');
    setAttachedFiles([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Web Search toggleSearchMode function removed - buttons disabled for now

  // Handle thinking toggle - auto-switch to thinking model
  // Handle thinking toggle - auto-switch to thinking model if needed
  const handleThinkingToggle = () => {
    if (!thinkingEnabled) {
      // Enabling thinking
      // Check if current model is ALREADY a thinking/reasoning model
      const currentIsThinking =
        selectedModel &&
        ((selectedModel.name || selectedModel.id || '')
          .toLowerCase()
          .includes('qwen3') ||
          (selectedModel.name || selectedModel.id || '')
            .toLowerCase()
            .includes('think') ||
          (selectedModel.name || selectedModel.id || '')
            .toLowerCase()
            .includes('reason') ||
          (selectedModel.name || selectedModel.id || '')
            .toLowerCase()
            .includes('deepthink') ||
          (selectedModel.name || selectedModel.id || '')
            .toLowerCase()
            .includes('deep-think'));

      if (!currentIsThinking) {
        // Only if NOT currently on a thinking model, try to find one
        const thinkingModel = availableModels.find((m) => {
          const name = (m.name || m.id || '').toLowerCase();
          return (
            name.includes('qwen3') ||
            name.includes('think') ||
            name.includes('reason') ||
            name.includes('deepthink') ||
            name.includes('deep-think')
          );
        });

        if (thinkingModel) {
          // Store current model to restore later
          localStorage.setItem('odax-previous-model', activeModel || '');
          setActiveModel(thinkingModel.id);
        }
      } else {
        console.log(
          '✅ Current model is already a thinking model, keeping it.'
        );
      }
      setThinkingEnabled(true);
    } else {
      // Disabling thinking - ONLY restore if we switched away (check logic?)
      // Actually, simple restore is fine, but maybe we should check if we switched.
      // For now, restoring previous model is standard behavior if we forced a switch.
      // But if we didn't force a switch (kept same model), restoring might switch BACK to something else?
      // Logic: If on enable we kept same model, we didn't set 'odax-previous-model' (or we set it to same?)
      // Wait, if !currentIsThinking, we set previous.
      // If currentIsThinking, we DO NOT set previous.
      // So on disable, we only restore if previous is set?

      const previousModel = localStorage.getItem('odax-previous-model');
      if (previousModel) {
        setActiveModel(previousModel);
        localStorage.removeItem('odax-previous-model'); // Clean up
      }
      setThinkingEnabled(false);
    }
  };

  // Microphone recording functions
  const startRecording = async () => {
    // Show helpful message - speech recognition doesn't work reliably in WKWebView
    alert(
      '🎤 Voice Input\n\n' +
        'For the best voice experience:\n' +
        '• Open http://localhost:3001 in Safari or Chrome\n' +
        '• Download "Whisper Tiny" from Dashboard → Models → Voice\n\n' +
        'Voice recognition in the native app is limited.'
    );

    try {
      // Try Web Speech API anyway (works in Safari, Chrome on web)
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = navigator.language || 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInputValue((prev) => prev + (prev ? ' ' : '') + text);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Microphone error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // const isResearching =
  //   researchProgress.phase !== 'idle' && researchProgress.phase !== 'complete';

  // Calculate offsets based on panels
  const sidebarOffset = isSidebarOpen ? '260px' : '0px';
  // Only show thinking panel when Think mode is enabled AND there's content or generating
  const showThinkingPanel =
    thinkingEnabled && (thinkingContent || isGenerating);
  const showSources = showSourcesPanel && currentSources.length > 0;
  // Right panel offset for CONTENT (messages area) - thinking takes priority, then sources, then PDF
  const contentRightOffset = showThinkingPanel
    ? '360px'
    : showSources
      ? '320px'
      : activeDocument
        ? `${pdfPanelWidth}%` // Split view based on dynamic width
        : '0px';
  // Input area should NOT shrink when thinking panel opens - keep it stable
  const rightPanelOffset = activeDocument ? `${pdfPanelWidth}%` : '0px';

  // Theme colors
  const themeColors =
    theme === 'dark'
      ? {
          bg: '#0d0d0d',
          assistantBg: 'transparent',
          userBg: '#2a2a2a',
          border: '#333',
          text: '#e5e5e5',
          textMuted: '#a3a3a3',
          inputBg: '#1a1a1a',
          tableHeaderBg: '#1e1e1e',
          tableRowOdd: '#1a1a1a',
          tableRowEven: '#141414',
          tableBorder: '#444',
          // Gradient for input container fade
          gradientFrom: 'rgba(13, 13, 13, 0)',
          gradientTo: 'rgba(13, 13, 13, 1)',
        }
      : {
          bg: '#ffffff',
          headerBg: 'rgba(250, 250, 250, 0.95)',
          border: '#e5e5e5',
          text: '#171717', // Slightly darker for contrast
          textMuted: '#666',
          userBubble: '#f3f4f6', // Light gray instead of black for user bubble
          assistantBg: 'transparent',
          inputBg: '#ffffff', // Pure white input box for cleaner look
          // Table colors
          tableBg: '#ffffff',
          tableHeaderBg: '#f3f4f6',
          tableBorder: '#e5e7eb',
          tableRowOdd: '#ffffff',
          tableRowEven: '#f9fafb',
          // Gradient for input container fade
          gradientFrom: 'rgba(250, 250, 250, 0)',
          gradientTo: 'rgba(250, 250, 250, 1)',
        };

  if (!isChatsLoaded) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: themeColors.bg,
          color: themeColors.textMuted,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div className={styles.spinner}></div>
          <span>Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={styles.chatArea}
      style={{ background: themeColors.bg }}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              padding: '40px 60px',
              border: '2px dashed #6366f1',
              borderRadius: '24px',
              background: 'rgba(30, 30, 30, 0.8)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              color: 'white',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              transform: 'scale(1.05)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <FileText size={32} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ marginBottom: '4px' }}>
                Drop to attach
              </p>
              <p style={{ color: '#a0a0a0', fontSize: '14px' }}>
                PDFs, Text, Markdown, Code
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Translation Progress Toast (non-blocking) */}
      {translationState.isTranslating && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1001,
            padding: '16px 20px',
            borderRadius: '12px',
            background:
              theme === 'dark'
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            minWidth: '300px',
            animation: 'slideUp 0.3s ease',
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <Download
              size={18}
              style={{
                animation:
                  translationState.progress < 100
                    ? 'spin 2s linear infinite'
                    : 'none',
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: theme === 'dark' ? '#fff' : '#171717',
                marginBottom: '6px',
              }}
            >
              {translationState.progress < 100
                ? `Translating ${translationState.fileName}...`
                : 'Complete!'}
            </div>

            {/* Progress Bar - GREEN */}
            <div
              style={{
                height: '4px',
                background: theme === 'dark' ? '#333' : '#e5e5e5',
                borderRadius: '2px',
                overflow: 'hidden',
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

            <div
              style={{
                fontSize: '11px',
                color: theme === 'dark' ? '#888' : '#999',
                marginTop: '4px',
              }}
            >
              {translationState.status}
            </div>
          </div>

          {/* Cancel Button */}
          <button
            onClick={cancelTranslation}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme === 'dark' ? '#666' : '#999',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cancel"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* PDF Parsing Progress Overlay - REMOVED */}

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: sidebarOffset,
          right: activeDocument ? '40%' : 0, // Adjust header width if doc panel open
          height: '56px',
          padding: '0 24px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: `1px solid ${themeColors.border}`,
          background: themeColors.headerBg,
          backdropFilter: 'blur(12px)',
          transition: 'left 0.3s ease, background 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeColors.textMuted,
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = themeColors.text;
              e.currentTarget.style.background =
                theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = themeColors.textMuted;
              e.currentTarget.style.background = 'transparent';
            }}
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Model Selector - Now Left Aligned */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              disabled={availableModels.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: theme === 'dark' ? '#2a2a2a' : '#f0f0f0',
                border: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                padding: '6px 12px',
                borderRadius: '8px',
                color:
                  availableModels.length === 0
                    ? themeColors.textMuted
                    : themeColors.text,
                fontSize: '13px',
                fontWeight: 500,
                cursor:
                  availableModels.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span
                style={{
                  maxWidth: '200px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedModel?.name ||
                  (availableModels.length === 0
                    ? 'Loading...'
                    : 'Select Model')}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.5 }} />
            </button>

            {showModelSelector && availableModels.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  width: '280px',
                  background: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                  border: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  zIndex: 1000,
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {/* Available Models List */}
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setActiveModel(model.id);
                      setShowModelSelector(false);
                      // Auto-enable thinking for reasoning models
                      const name = (model.name || model.id || '').toLowerCase();
                      if (
                        name.includes('think') ||
                        name.includes('reason') ||
                        name.includes('qwq')
                      ) {
                        // Only auto-enable if not already seemingly customized by user
                        // But for now, let's logic be simple: Reasoning model -> thinking ON
                        // setThinkingEnabled(true); // Let user decide or context handle it? Context handles it via handleThinkingToggle logic usually
                      }
                    }}
                    style={{
                      width: '100%',
                      background:
                        activeModel === model.id
                          ? theme === 'dark'
                            ? '#2a2a2a'
                            : '#f0f0f0'
                          : 'transparent',
                      border: 'none',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (activeModel !== model.id) {
                        e.currentTarget.style.background =
                          theme === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeModel !== model.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div
                      style={{
                        color: themeColors.text,
                        fontSize: '13px',
                        fontWeight: 500,
                        marginBottom: '2px',
                      }}
                    >
                      {model.name}
                    </div>
                    <div
                      style={{ color: themeColors.textMuted, fontSize: '11px' }}
                    >
                      {model.size || 'Unknown'} • {model.category}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Reopen PDF + Theme Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: 'auto',
          }}
        >
          {/* Show Reopen PDF button when panel is closed but document exists */}
          {!activeDocument && lastDocument && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setActiveDocument(lastDocument)}
                style={{
                  background:
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: themeColors.text,
                  borderRadius: '6px 0 0 6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  height: '32px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)';
                }}
                title="Reopen PDF"
              >
                <FileText size={14} />
                <span>
                  {lastDocument.name.length > 20
                    ? lastDocument.name.slice(0, 20) + '...'
                    : lastDocument.name}
                </span>
              </button>
              <button
                onClick={() => setLastDocument(null)}
                style={{
                  background:
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderLeft: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: themeColors.textMuted,
                  borderRadius: '0 6px 6px 0',
                  transition: 'all 0.2s',
                  height: '32px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = themeColors.textMuted;
                }}
                title="Remove/Close PDF"
              >
                <XIcon size={14} />
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeColors.textMuted,
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = themeColors.text;
              e.currentTarget.style.background =
                theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = themeColors.textMuted;
              e.currentTarget.style.background = 'transparent';
            }}
            title={
              theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
            }
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Profile / Login Button */}
          {firebaseUser ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                }}
              >
                {/* Profile Image - Use profile.photoURL from AuthContext */}
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt="Profile"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #333',
                    }}
                    onError={(e) => {
                      // Fallback to initial if image fails to load
                      console.error(
                        '❌ Profile image failed to load:',
                        profile.photoURL
                      );
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {(
                      profile?.displayName?.[0] ||
                      profile?.email?.[0] ||
                      firebaseUser?.email?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </div>
                )}
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    padding: '8px',
                    minWidth: '280px',
                    zIndex: 1001,
                  }}
                >
                  {/* User Info */}
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    {/* Profile Photo */}
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt="Profile"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #333',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#333',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: 600,
                          flexShrink: 0, // Prevent squashing
                        }}
                      >
                        {(
                          profile?.displayName?.[0] ||
                          profile?.email?.[0] ||
                          firebaseUser?.email?.[0] ||
                          'U'
                        ).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {' '}
                      {/* minWidth 0 needed for flex text trunction */}
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: themeColors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {profile?.displayName ||
                          firebaseUser.displayName ||
                          'User'}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: themeColors.textMuted,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {firebaseUser.email}
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  {userStats && (
                    <div
                      style={{
                        padding: '12px',
                        borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: themeColors.textMuted,
                          textTransform: 'uppercase',
                          marginBottom: '8px',
                        }}
                      >
                        Your Stats
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            background:
                              theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                            padding: '8px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: '#3b82f6',
                            }}
                          >
                            {userStats.totalTokens >= 1000
                              ? `${(userStats.totalTokens / 1000).toFixed(1)}K`
                              : userStats.totalTokens}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: themeColors.textMuted,
                            }}
                          >
                            Tokens
                          </div>
                        </div>
                        <div
                          style={{
                            background:
                              theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                            padding: '8px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: '#10b981',
                            }}
                          >
                            {userStats.totalInferences}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: themeColors.textMuted,
                            }}
                          >
                            Inferences
                          </div>
                        </div>
                      </div>
                      {/* Models Used */}
                      {Object.keys(userStats.modelsUsed).length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div
                            style={{
                              fontSize: '10px',
                              color: themeColors.textMuted,
                              marginBottom: '4px',
                            }}
                          >
                            Models Used:
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            {Object.entries(userStats.modelsUsed)
                              .filter(([, count]) => typeof count === 'number') // Skip nested objects
                              .sort(
                                ([, a], [, b]) => (b as number) - (a as number)
                              ) // Sort by most used
                              .slice(0, 3)
                              .map(([model, count]) => {
                                const tokens =
                                  userStats.tokensPerModel?.[model];
                                const tokenDisplay =
                                  typeof tokens === 'number'
                                    ? tokens >= 1000
                                      ? `${(tokens / 1000).toFixed(1)}K`
                                      : tokens
                                    : null;
                                return (
                                  <div
                                    key={model}
                                    style={{
                                      fontSize: '10px',
                                      background:
                                        theme === 'dark'
                                          ? '#2a2a2a'
                                          : '#f0f0f0',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: themeColors.text,
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginRight: '8px',
                                      }}
                                    >
                                      {model === 'default'
                                        ? 'default'
                                        : model.replace(/-q\d.*$/, '')}
                                    </span>
                                    <span
                                      style={{
                                        color: themeColors.textMuted,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {count}x{' '}
                                      {tokenDisplay ? `• ${tokenDisplay}` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sharing Toggle */}
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                    }}
                  >
                    {/* Manual Sync Button for Debugging */}
                    <button
                      onClick={async () => {
                        if (isSyncing) return;
                        setIsSyncing(true);
                        console.log('🔄 Manual Sync Triggered');
                        try {
                          const result = await syncPendingStats();
                          console.log('✅ Sync Result:', result);

                          // Force reload stats only if sync attempted
                          if (user) {
                            const stats = await getUserStats(user.uid);
                            if (stats) setUserStats(stats);
                          }

                          // Reset BEFORE alert so button unblocks immediately
                          setIsSyncing(false);
                          alert(result.message);
                        } catch (error) {
                          console.error('❌ Sync Error:', error);
                          setIsSyncing(false);
                          alert('Sync failed. Check console for details.');
                        }
                      }}
                      disabled={isSyncing}
                      style={{
                        width: '100%',
                        marginBottom: '12px',
                        padding: '8px',
                        background: isSyncing ? '#666' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isSyncing ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: isSyncing ? 0.7 : 1,
                      }}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Stats Now'}
                    </button>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{ fontSize: '13px', color: themeColors.text }}
                        >
                          Share Activity
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: themeColors.textMuted,
                          }}
                        >
                          Post stats to OdaxAI feed
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !sharingEnabled;
                          setSharingEnabled(newValue);
                          localStorage.setItem(
                            'odax-sharing-enabled',
                            String(newValue)
                          );
                        }}
                        style={{
                          width: '40px',
                          height: '22px',
                          borderRadius: '11px',
                          border: 'none',
                          cursor: 'pointer',
                          background: sharingEnabled ? '#10b981' : '#444',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: sharingEnabled ? '20px' : '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <button
                    onClick={async () => {
                      await signOut(auth);
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                      marginTop: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        theme === 'dark'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: theme === 'dark' ? '#2a2a2a' : '#e0e0e0',
                border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
                borderRadius: '8px',
                color: theme === 'dark' ? '#fff' : '#333',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  theme === 'dark' ? '#3a3a3a' : '#d0d0d0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  theme === 'dark' ? '#2a2a2a' : '#e0e0e0';
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Login
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div
        className={styles.mainContent}
        style={{
          marginLeft: sidebarOffset, // Push content by Sidebar
          marginRight: contentRightOffset, // Use the content offset variable
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
          height: '100%',
          width: 'auto',
          paddingTop: '56px', // Header height
          display: 'flex',
          flexDirection: 'row',
          background: themeColors.bg,
          overflow: 'hidden', // Prevent scroll on main container
        }}
      >
        {/* Chat Column */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1, // Take remaining space
            width: activeDocument ? `calc(100% - ${pdfPanelWidth}%)` : '100%',
            maxWidth: activeDocument ? '100%' : '900px', // Limit width only if no doc
            margin: '0 auto', // Center if limited width
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '24px',
            paddingBottom: '220px', // Extra space for input bar
            overflowY: 'auto', // Scrollable content
            transition: 'width 0.3s ease',
          }}
        >
          {!currentChat || currentChat.messages.length === 0 ? (
            <div
              className={styles.emptyState}
              style={{ color: themeColors.textMuted }}
            >
              {/* Empty state - ready for input */}
            </div>
          ) : (
            <>
              {currentChat.messages.map((message, idx) => (
                <div key={idx} className={styles.messageRow}>
                  {message.role === 'user' ? (
                    (() => {
                      // Format user message: show file badges instead of full content
                      const content = message.content;
                      // Match the new format: document "filename.pdf"
                      const fileMatches = content.match(/document "([^"]+)"/g);
                      // Extract user question after "Based on the document above,"
                      const userRequest =
                        content.match(
                          /Based on the document above, (.+)/
                        )?.[1] || '';

                      const hasFiles = fileMatches && fileMatches.length > 0;
                      const fileNames =
                        fileMatches?.map(
                          (m) => m.match(/document "([^"]+)"/)?.[1] || ''
                        ) || [];

                      return (
                        <div
                          className={styles.messageContent}
                          style={{ display: 'block' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              width: '100%',
                            }}
                          >
                            <div
                              className={styles.userBubble}
                              style={{
                                backgroundColor: themeColors.userBubble,
                                color: themeColors.text,
                              }}
                            >
                              {hasFiles && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    marginBottom: userRequest ? '8px' : 0,
                                  }}
                                >
                                  {fileNames.map((name, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        border:
                                          '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        fontSize: '13px',
                                      }}
                                    >
                                      <span style={{ fontSize: '14px' }}>
                                        📄
                                      </span>
                                      <span
                                        style={{
                                          maxWidth: '150px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {userRequest &&
                                userRequest !==
                                  'Please analyze the attached file(s).' && (
                                  <div>{userRequest}</div>
                                )}
                              {!hasFiles && <div>{content}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div
                      className={styles.messageContent}
                      style={{ background: themeColors.assistantBg }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Thinking Preview Layer - Shows real-time thought process */}
                        {message.isStreaming && message.thinking && (
                          <div
                            style={{
                              marginBottom: '8px',
                              padding: '8px',
                              background:
                                theme === 'dark'
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.05)',
                              borderRadius: '8px',
                              borderLeft: '2px solid #ec4899', // Pink for thinking
                              fontSize: '11px',
                              color: themeColors.textMuted,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: 'SF Mono, Menlo, monospace',
                              animation: 'pulse 1.5s infinite alternate', // Gentle pulse
                            }}
                          >
                            <Sparkles size={12} color="#ec4899" />
                            <div
                              style={{
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                              }}
                            >
                              {message.thinking
                                .slice(-80)
                                .replace(/\n/g, ' ') || 'Reasoning...'}
                            </div>
                          </div>
                        )}

                        {message.content ? (
                          <MessageRenderer
                            content={message.content}
                            sources={message.sources}
                            themeColors={themeColors}
                            theme={theme}
                            thinking={message.thinking}
                            onShowThinking={(text) => {
                              setThinkingContent(text);
                              // Ensure panel is visible
                              if (!thinkingContent && !isGenerating) {
                                // Just setting content makes it visible via our logic below
                              }
                            }}
                          />
                        ) : !message.thinking ? (
                          <span className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                        ) : null}
                        {message.isStreaming && message.content && (
                          <span className={styles.cursor}>|</span>
                        )}

                        {/* Message Actions (Visualize, etc.) */}
                        {!message.isStreaming &&
                          message.content &&
                          message.role === 'assistant' && (
                            <div
                              style={{
                                marginTop: '8px',
                                display: 'flex',
                                gap: '8px',
                              }}
                            >
                              <button
                                onClick={() => {
                                  if (isGenerating) return;
                                  const textToVisualize = message.content;
                                  // Increased to 6000 chars - Safe because we now use Context Isolation for visualization
                                  // (We discard history, so we have ~8k tokens free for this request)
                                  const safeText =
                                    textToVisualize.length > 6000
                                      ? textToVisualize.slice(0, 6000) + '...'
                                      : textToVisualize;

                                  const prompt = `Create a simple MermaidJS flowchart diagram based on the text below.

TEXT TO VISUALIZE:
"${safeText}"

RULES:
1. Start with: graph TD
2. Use simple IDs: A, B, C (single letters or numbers)
3. Labels in brackets: A["My Label"]
4. Arrows: A --> B
5. NO style commands
6. NO subgraphs
7. Keep it simple

Example:
\`\`\`mermaid
graph TD
    A["Main Concept"] --> B["Detail 1"]
    A --> C["Detail 2"]
    B --> D["Sub-detail"]
\`\`\`

ONLY output the mermaid code block.`;

                                  sendMessage(
                                    `🕸️ **Visualize this explanation**`,
                                    prompt
                                  );
                                }}
                                style={{
                                  background: 'transparent',
                                  border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  color: themeColors.textMuted,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background =
                                    theme === 'dark'
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.05)';
                                  e.currentTarget.style.color =
                                    themeColors.text;
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background =
                                    'transparent';
                                  e.currentTarget.style.color =
                                    themeColors.textMuted;
                                }}
                              >
                                🕸️ Visualize Concept
                              </button>
                            </div>
                          )}

                        {/* Metrics Display */}
                        {message.metrics && !message.isStreaming && (
                          <div
                            style={{
                              marginTop: '12px',
                              paddingTop: '8px',
                              borderTop: `1px solid ${
                                theme === 'dark'
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.1)'
                              }`,
                              fontSize: '11px',
                              color: themeColors.textMuted,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontFamily:
                                'SF Mono, Menlo, Monaco, Consolas, monospace',
                            }}
                          >
                            <span
                              title="Tokens per second"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Zap size={11} color="#f59e0b" />{' '}
                              {message.metrics.tps} t/s
                            </span>
                            <span
                              title="Total generation time"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={11} color="#8b5cf6" />{' '}
                              {(message.metrics.timeMs / 1000).toFixed(2)}s
                            </span>
                            <span
                              title="Total estimated tokens"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <FileText size={11} /> ~
                              {message.metrics.totalTokens}
                            </span>

                            <button
                              onClick={() => setTechStatsModal(message.metrics)}
                              style={{
                                marginLeft: 'auto',
                                background: 'transparent',
                                border: `1px solid ${themeColors.border || '#333'}`,
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '10px',
                                color: themeColors.textMuted,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.borderColor = '#fbbf24')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.borderColor =
                                  themeColors.border || '#333')
                              }
                            >
                              <Activity size={10} /> Tech Analysis
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Show separate thinking panel only if active and no messages yet? No, handled in MessageRenderer or below */}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* PDF Sliding Panel - Always in DOM for animation */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: `${pdfPanelWidth}%`,
            minWidth: '280px',
            maxWidth: '80%',
            height: '100%',
            borderLeft: `1px solid ${themeColors.border}`,
            display: 'flex',
            flexDirection: 'column',
            background: theme === 'dark' ? '#111' : '#fff',
            zIndex: 100,
            overflow: 'hidden',
            transform: activeDocument ? 'translateX(0)' : 'translateX(100%)',
            transition: isResizing
              ? 'none'
              : 'transform 0.3s ease-in-out, width 0.2s ease-out',
            boxShadow: activeDocument ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          {/* Resize Handle - Visible drag bar */}
          <div
            style={{
              position: 'absolute',
              left: '-4px',
              top: 0,
              bottom: 0,
              width: '12px',
              cursor: 'ew-resize',
              background: isResizing
                ? theme === 'dark'
                  ? 'rgba(99, 102, 241, 0.5)'
                  : 'rgba(99, 102, 241, 0.3)'
                : 'transparent',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsResizing(true);
              const startX = e.clientX;
              const startWidth = pdfPanelWidth;

              const onMouseMove = (moveEvent: MouseEvent) => {
                const delta = startX - moveEvent.clientX;
                const windowWidth = window.innerWidth;
                const newWidthPercent =
                  startWidth + (delta / windowWidth) * 100;
                // Min 25%, Max 65% - leaving at least 35% for chat/prompt area
                setPdfPanelWidth(Math.min(65, Math.max(25, newWidthPercent)));
              };

              const onMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                (e.target as HTMLElement).style.background =
                  theme === 'dark'
                    ? 'rgba(99, 102, 241, 0.3)'
                    : 'rgba(99, 102, 241, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                (e.target as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            {/* Visible drag indicator */}
            <div
              style={{
                width: '4px',
                height: '40px',
                borderRadius: '2px',
                background:
                  theme === 'dark'
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(0,0,0,0.2)',
              }}
            />
          </div>
          {activeDocument?.fileUrl ? (
            <>
              <DocumentViewer
                themeColors={themeColors}
                onExtractText={handleExtractText}
                key={`${activeDocument.fileUrl}-${activeDocument.name}`}
                fileUrl={activeDocument.fileUrl}
                fileName={activeDocument.name}
                onClose={() => setActiveDocument(null)}
                theme={theme}
                isGenerating={isGenerating}
                highlights={highlights}
                onExplain={(text) => {
                  if (isGenerating) {
                    console.warn('⚠️ Cannot explain while generating');
                    return;
                  }
                  const safeText =
                    text.length > 2000 ? text.slice(0, 2000) + '...' : text;
                  const prompt = `"${safeText}"

Explain this excerpt in detail. Structure your response with:
- **Key concepts** in bold
- A **table** for any technical terms (Term | Definition | Context)
- Why this is significant or what it means in practice
Respond in the SAME language as the excerpt above.`;
                  // Display a clean message to the user, send the full prompt to AI
                  sendMessage(
                    `📄 **Analyze selection:**\n\n> "${safeText.slice(0, 100)}${safeText.length > 100 ? '...' : ''}"`,
                    prompt
                  );
                }}
                onAskQuestion={(text, question) => {
                  if (isGenerating) {
                    console.warn('⚠️ Cannot ask while generating');
                    return;
                  }
                  const safeText =
                    text.length > 1500 ? text.slice(0, 1500) + '...' : text;
                  const prompt = `"${safeText}"

Question: ${question}
Respond in the SAME language as the question above.`;
                  // Display the question clean, with a quote reference
                  sendMessage(
                    `${question}\n\n> 📄 _Reference: "${safeText.slice(0, 80)}${safeText.length > 80 ? '...' : ''}"`,
                    prompt
                  );
                }}
                onVisualize={(text) => {
                  if (isGenerating) {
                    console.warn('⚠️ Cannot visualize while generating');
                    return;
                  }
                  const safeText =
                    text.length > 1500 ? text.slice(0, 1500) + '...' : text;
                  // Escape backticks to prevent prompt injection/confusion
                  const escapedText = safeText.replace(/`/g, "'");

                  const prompt = `Create a minimal concept map.

TEXT TO VISUALIZE:
"${escapedText}"

INSTRUCTIONS:
1. Extract max 8 key concepts.
2. Use VERY SHORT labels (max 3-4 words).
3. Ignore details, tables, or numbers.
4. Output strict MermaidJS format:

\`\`\`mermaid
graph TD
    A["Main Concept"] --> B["Sub Concept"]
\`\`\`
`;

                  sendMessage(
                    `🕸️ **Visualize selection:**\n\n> "${safeText.slice(0, 100)}${safeText.length > 100 ? '...' : ''}"`,
                    prompt
                  );
                }}
                onHighlightKeyPoints={() => {
                  if (isGenerating) {
                    console.warn('⚠️ Cannot highlight while generating');
                    return;
                  }
                  setAwaitingHighlights(true);
                  // Get the document content to analyze
                  const docContent = activeDocument?.content || '';
                  const safeContent =
                    docContent.length > 5000
                      ? docContent.slice(0, 5000) + '...'
                      : docContent;

                  const prompt = `---BEGIN DOCUMENT---
${safeContent}
---END DOCUMENT---

Identify the key points of the document with exact citations. Use tables and emojis to structure the response.
Respond in the SAME language as the document above.`;
                  sendMessage(prompt);
                }}
                // Translation support - use context state
                translatedDocument={translationState.translatedDocument}
                onDownloadTranslated={() => {
                  if (translationState.translatedDocument) {
                    generateTranslatedPDF(
                      activeDocument?.name || 'document.pdf',
                      translationState.translatedDocument.content,
                      translationState.translatedDocument.name
                        .replace(/.*_/, '')
                        .replace('.pdf', '')
                    );
                  }
                }}
              />
              {/* Highlight Progress Bar */}
              {awaitingHighlights && (
                <div
                  style={{
                    padding: '12px',
                    background: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                    borderTop: '1px solid rgba(128,128,128,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    className={styles.spinner}
                    style={{
                      width: 16,
                      height: 16,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: `${themeColors.text} ${themeColors.text} ${themeColors.text} transparent`,
                      borderRadius: '50%',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: themeColors.text }}>
                    Thinking & Analyzing Document...
                  </span>
                </div>
              )}

              {/* Success Toast / Indicator (Optional, or just let the PDF highlights speak for themselves) */}
              {highlights.length > 0 && !awaitingHighlights && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                    fontSize: '12px',
                    color: '#10b981',
                    textAlign: 'center',
                  }}
                >
                  ✨ {highlights.length} key points highlighted in document
                </div>
              )}
            </>
          ) : activeDocument ? (
            // Fallback to text viewer
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: `1px solid ${themeColors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: theme === 'dark' ? '#1a1a1a' : '#fafafa',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '12px',
                    color: themeColors.text,
                  }}
                >
                  📄 {activeDocument.name}
                </span>
                <button
                  onClick={() => setActiveDocument(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: themeColors.textMuted,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  color: themeColors.text,
                  background: theme === 'dark' ? '#0d0d0d' : '#fff',
                }}
              >
                {activeDocument.content}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Reasoning Panel - Always available */}
      <ThinkingPanel
        thinkingStatus={thinkingStatus}
        thinkingContent={thinkingContent}
        isActive={!!thinkingContent || (thinkingEnabled && isGenerating)}
        modelName={selectedModel?.name}
        theme={theme}
        onClose={() => setThinkingContent('')}
        thinkingHistory={thinkingHistory}
      />
      {/* Sources Panel - Fixed position on right */}
      {showSourcesPanel && currentSources.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            right: 0,
            bottom: 0,
            width: '320px',
            borderLeft: '1px solid #2a2a2a',
            background: '#1a1a1a',
            padding: '20px',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h3
              style={{
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Sources (
              {currentSources.filter((s) => s.status === 'done').length})
            </h3>
            <button
              onClick={() => setShowSourcesPanel(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#707070',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              Close
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentSources
              .filter((s) => s.status === 'done')
              .map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
          </div>
        </div>
      )}

      {/* Input Container - Centered */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: sidebarOffset,
          right: rightPanelOffset,
          padding: '16px 24px 24px',
          background: `linear-gradient(to top, ${themeColors.bg} 70%, transparent 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: isResizing ? 'none' : 'left 0.3s ease, right 0.3s ease',
          zIndex: 50, // Below PDF panel (100) but above content
        }}
      >
        {isProcessingFile && (
          <div style={{ padding: '8px', color: '#6366f1', fontSize: '12px' }}>
            Processing file...
          </div>
        )}
        <div
          style={{
            width: '100%',
            maxWidth: '48rem',
            margin: '0 auto',
            background: theme === 'light' ? '#ffffff' : themeColors.inputBg,
            borderRadius: '16px',
            padding: '12px 16px',
            border: `1px solid ${themeColors.border}`,
            boxShadow:
              theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <div className={styles.inputWrapper}>
            {attachedFiles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  padding: '0 4px',
                }}
              >
                {attachedFiles.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      background: theme === 'dark' ? '#333' : '#f0f0f0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: themeColors.text,
                      border: `1px solid ${themeColors.border}`,
                    }}
                  >
                    <FileText size={14} color={themeColors.textMuted} />
                    <span
                      style={{
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </span>
                    <button
                      onClick={() =>
                        setAttachedFiles((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      style={{
                        background: 'rgba(255,255,255,0.15)', // More visible bg
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme === 'dark' ? '#e5e5e5' : '#444', // Higher contrast
                        borderRadius: '50%',
                        marginLeft: '6px',
                        transition: 'all 0.2s',
                        height: '20px',
                        width: '20px',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#ef4444'; // Full red
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.15)';
                        e.currentTarget.style.color =
                          theme === 'dark' ? '#e5e5e5' : '#444';
                      }}
                      title="Remove file"
                    >
                      <XIcon size={12} strokeWidth={3} /> {/* Thicker stroke */}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Inject dynamic placeholder style */}
            <style jsx global>{`
              textarea::placeholder {
                color: ${themeColors.textMuted} !important;
                opacity: 0.7;
              }
            `}</style>
            <textarea
              className={styles.input}
              placeholder={
                searchMode === 'deep-research'
                  ? 'Ask for deep research...'
                  : searchMode === 'search'
                    ? 'Search the web...'
                    : 'Ask anything...'
              }
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isGenerating}
              style={{
                minHeight: '24px',
                opacity: isGenerating ? 0.5 : 1,
                width: '100%',
                background: 'transparent',
                color: themeColors.text,
                caretColor: themeColors.text,
              }}
            />
            {/* Actions Bar - Toggle Thinking, Mic, Send */}
            <div className={styles.actionsBar}>
              <div className={styles.leftActions}>
                {/* Web Search and Deep Research buttons removed for now */}
                {/* TODO: Re-enable when Google API configuration is complete */}

                {/* Thinking Toggle */}
                <button
                  onClick={handleThinkingToggle}
                  title="Thinking Mode"
                  style={{
                    background: thinkingEnabled
                      ? 'rgba(236, 72, 153, 0.15)'
                      : 'transparent',
                    border: thinkingEnabled
                      ? '1px solid rgba(236, 72, 153, 0.4)'
                      : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: thinkingEnabled ? '#ec4899' : '#707070',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  <Sparkles size={16} strokeWidth={2} />
                  {thinkingEnabled && <span>Think</span>}
                </button>

                {/* Local Memory Toggle */}
                <button
                  onClick={() => setLocalMemoryEnabled(!localMemoryEnabled)}
                  title="Local Memory"
                  style={{
                    background: localMemoryEnabled
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'transparent',
                    border: localMemoryEnabled
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: localMemoryEnabled ? '#10b981' : '#707070',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  <Database size={16} strokeWidth={2} />
                  {localMemoryEnabled && <span>Memory</span>}
                </button>

                {/* Attach */}
                <button
                  title="Attach file"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#707070',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  {...getRootProps()}
                >
                  <Paperclip size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Send/Stop Button */}
              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  title="Stop generating"
                  className={styles.sendButton}
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    flexShrink: 0,
                    background: '#1a1a1a', // Black background for stop
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 12px rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.background = '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow =
                      '0 2px 8px rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.background = '#1a1a1a';
                  }}
                >
                  <Square size={12} fill="white" strokeWidth={0} />
                </button>
              ) : (
                <button
                  className={clsx(
                    styles.sendButton,
                    inputValue.trim() && styles.active
                  )}
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    flexShrink: 0,
                    background: inputValue.trim()
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : '#333',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    color: 'white',
                    transition: 'all 0.2s',
                    boxShadow: inputValue.trim()
                      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                      : 'none',
                    opacity: inputValue.trim() ? 1 : 0.7,
                  }}
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mode Indicators */}
        {(searchMode !== 'none' || thinkingEnabled || localMemoryEnabled) && (
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {searchMode !== 'none' && (
              <span
                style={{
                  fontSize: '11px',
                  color: searchMode === 'deep-research' ? '#8b5cf6' : '#6366f1',
                  background:
                    searchMode === 'deep-research'
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(99, 102, 241, 0.1)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    searchMode === 'deep-research'
                      ? 'rgba(139, 92, 246, 0.25)'
                      : 'rgba(99, 102, 241, 0.25)'
                  }`,
                  fontWeight: 500,
                }}
              >
                {searchMode === 'deep-research'
                  ? 'Deep Research'
                  : 'Web Search'}
              </span>
            )}
            {thinkingEnabled && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#ec4899',
                  background: 'rgba(236, 72, 153, 0.1)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  fontWeight: 500,
                }}
              >
                Thinking
              </span>
            )}
            {localMemoryEnabled && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 500,
                }}
              >
                Local Memory
              </span>
            )}
          </div>
        )}
        {/* Tech Stats Modal */}
        {techStatsModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => setTechStatsModal(null)}
          >
            <div
              style={{
                width: '450px',
                background: theme === 'dark' ? '#111' : '#fff',
                border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                transform: 'translateY(0)',
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                    }}
                  >
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: theme === 'dark' ? '#fff' : '#000',
                      }}
                    >
                      Technical Analysis
                    </h3>
                    <div
                      style={{
                        fontSize: '12px',
                        color: theme === 'dark' ? '#888' : '#666',
                      }}
                    >
                      Engine Performance Stats
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setTechStatsModal(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                  }}
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#888' : '#666',
                      marginBottom: '6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <Zap size={12} /> Speed (TPS)
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#fbbf24',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {techStatsModal.tps}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#10b981',
                      marginTop: '4px',
                    }}
                  >
                    High Performance
                  </div>
                </div>

                <div
                  style={{
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#888' : '#666',
                      marginBottom: '6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <Clock size={12} /> Latency
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#8b5cf6',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {techStatsModal.timeToFirstTokenMs || 0}
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      ms
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: theme === 'dark' ? '#888' : '#666',
                      marginTop: '4px',
                    }}
                  >
                    Time to first token
                  </div>
                </div>

                <div
                  style={{
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#888' : '#666',
                      marginBottom: '6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <FileText size={12} /> Tokens
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: theme === 'dark' ? '#fff' : '#000',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {techStatsModal.totalTokens}
                  </div>
                </div>

                <div
                  style={{
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#888' : '#666',
                      marginBottom: '6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <Activity size={12} /> Total Time
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: theme === 'dark' ? '#fff' : '#000',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {(techStatsModal.timeMs / 1000).toFixed(2)}s
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Cpu size={14} color={theme === 'dark' ? '#fff' : '#000'} />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme === 'dark' ? '#fff' : '#000',
                      }}
                    >
                      NPU Utilization (Neural Engine)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#10b981',
                    }}
                  >
                    94%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: theme === 'dark' ? '#333' : '#e5e5e5',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '94%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #fbbf24)',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '10px',
                    color: theme === 'dark' ? '#666' : '#999',
                  }}
                >
                  <span>Compute</span>
                  <span>Memory Bandwidth</span>
                  <span>Thermal State</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
