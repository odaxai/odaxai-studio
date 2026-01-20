// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import jsPDF from 'jspdf';

// AI Server configuration - supports multiple backends
const AI_SERVERS = [
  {
    name: 'llama-server',
    url: 'http://localhost:8081',
    healthEndpoint: '/health',
  },
  {
    name: 'Ollama',
    url: 'http://localhost:11434',
    healthEndpoint: '/api/tags',
  },
];

let cachedAIServer: string | null = null;

// Check if an AI server is available
async function checkAIServer(
  serverUrl: string,
  healthEndpoint: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${serverUrl}${healthEndpoint}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Find the first available AI server
async function findAvailableAIServer(): Promise<string | null> {
  if (cachedAIServer) {
    const server = AI_SERVERS.find((s) => s.url === cachedAIServer);
    if (server) {
      const isAvailable = await checkAIServer(
        server.url,
        server.healthEndpoint
      );
      if (isAvailable) return cachedAIServer;
    }
  }

  for (const server of AI_SERVERS) {
    const isAvailable = await checkAIServer(server.url, server.healthEndpoint);
    if (isAvailable) {
      cachedAIServer = server.url;
      return server.url;
    }
  }

  return null;
}

// Language mapping
const LANG_MAP: Record<string, { code: string; name: string }> = {
  // Italian
  italiano: { code: 'it', name: 'Italiano' },
  italian: { code: 'it', name: 'Italian' },
  ita: { code: 'it', name: 'Italiano' },
  it: { code: 'it', name: 'Italiano' },
  // English
  inglese: { code: 'en', name: 'English' },
  english: { code: 'en', name: 'English' },
  eng: { code: 'en', name: 'English' },
  en: { code: 'en', name: 'English' },
  // French
  francese: { code: 'fr', name: 'Français' },
  french: { code: 'fr', name: 'French' },
  fr: { code: 'fr', name: 'Français' },
  // German
  tedesco: { code: 'de', name: 'Deutsch' },
  german: { code: 'de', name: 'German' },
  de: { code: 'de', name: 'Deutsch' },
  // Spanish
  spagnolo: { code: 'es', name: 'Español' },
  spanish: { code: 'es', name: 'Spanish' },
  es: { code: 'es', name: 'Español' },
  // Portuguese
  portoghese: { code: 'pt', name: 'Português' },
  portuguese: { code: 'pt', name: 'Portuguese' },
  pt: { code: 'pt', name: 'Português' },
  // Japanese
  giapponese: { code: 'ja', name: '日本語' },
  japanese: { code: 'ja', name: 'Japanese' },
  ja: { code: 'ja', name: '日本語' },
  // Chinese
  cinese: { code: 'zh', name: '中文' },
  chinese: { code: 'zh', name: 'Chinese' },
  zh: { code: 'zh', name: '中文' },
};

// Detect if user is asking for translation and extract target language
export function detectTranslationRequest(userMessage: string): {
  isTranslation: boolean;
  targetLang: string;
  targetLangName: string;
} {
  const lowerMsg = userMessage.toLowerCase().trim();

  // Translation trigger words (including common typos)
  const translationTriggers = [
    'traduci',
    'tradurre',
    'traduzione',
    'treaduci',
    'traduici',
    'tradici',
    'translate',
    'translation',
    'traslate',
    'converti',
    'convertire',
    'converti in',
  ];

  const hasTranslationTrigger = translationTriggers.some((trigger) =>
    lowerMsg.includes(trigger)
  );

  if (!hasTranslationTrigger) {
    return { isTranslation: false, targetLang: '', targetLangName: '' };
  }

  // Try to extract target language
  // Look for language after "in", "to", "into", "al", "a"
  const langPatterns = [
    /(?:in|to|into|al|a)\s+(\w+)/i,
    /(\w+)$/i, // Last word as fallback
  ];

  for (const pattern of langPatterns) {
    const match = lowerMsg.match(pattern);
    if (match && match[1]) {
      const potentialLang = match[1].toLowerCase();
      const langInfo = LANG_MAP[potentialLang];
      if (langInfo) {
        console.log(`🌍 Detected translation request to: ${langInfo.name}`);
        return {
          isTranslation: true,
          targetLang: langInfo.code,
          targetLangName: langInfo.name,
        };
      }
    }
  }

  // If translation trigger found but no language, default to English
  console.log('🌍 Detected translation request, defaulting to English');
  return {
    isTranslation: true,
    targetLang: 'en',
    targetLangName: 'English',
  };
}

// Translate document content with progress callback
export async function translateDocument(
  content: string,
  targetLang: string,
  targetLangName: string,
  onProgress: (progress: number, status: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  // Split content into chunks for progress tracking
  const MAX_CHUNK_SIZE = 3000; // ~750 tokens per chunk
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > MAX_CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If only one chunk or no splits, use single translation
  if (chunks.length <= 1) {
    chunks.length = 0;
    chunks.push(content);
  }

  const totalChunks = chunks.length;
  const translatedChunks: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Translation cancelled');
    }

    const progress = Math.round(((i + 0.5) / totalChunks) * 100);
    onProgress(progress, `Translating part ${i + 1}/${totalChunks}...`);

    const chunk = chunks[i];
    const translatedChunk = await translateChunk(
      chunk,
      targetLang,
      targetLangName,
      abortSignal
    );
    translatedChunks.push(translatedChunk);

    const completeProgress = Math.round(((i + 1) / totalChunks) * 100);
    onProgress(completeProgress, `Completed ${i + 1}/${totalChunks}`);
  }

  return translatedChunks.join('\n\n');
}

// Translate a single chunk of text
async function translateChunk(
  text: string,
  targetLang: string,
  targetLangName: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const modelPath = localStorage.getItem('odax-active-model') || 'default';

  // Find available AI server
  const serverUrl = await findAvailableAIServer();
  if (!serverUrl) {
    throw new Error(
      'No AI server available. Please start Ollama or llama-server.'
    );
  }

  // Determine endpoint and request format based on server
  const isOllama = serverUrl.includes('11434');
  const endpoint = isOllama
    ? `${serverUrl}/api/chat`
    : `${serverUrl}/v1/chat/completions`;

  const messages = [
    {
      role: 'system',
      content: `You are a professional translator. Translate the following text to ${targetLangName}. 
RULES:
- Output ONLY the translated text, nothing else.
- Maintain all formatting (paragraphs, bullet points, etc.)
- Do NOT add any explanations or notes.
- Translate ALL text provided.`,
    },
    {
      role: 'user',
      content: text,
    },
  ];

  const requestBody = isOllama
    ? {
        model: modelPath || 'qwen2.5:3b',
        messages,
        stream: false,
        options: { temperature: 0.3 },
      }
    : {
        model: modelPath,
        messages,
        stream: false,
        temperature: 0.3,
        max_tokens: 8000,
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status}`);
  }

  const data = await response.json();
  // Handle both llama-server (OpenAI format) and Ollama response formats
  return data.choices?.[0]?.message?.content || data.message?.content || text;
}

// Generate PDF from translated text
export function generateTranslatedPDF(
  originalFileName: string,
  translatedText: string,
  targetLangName: string
): void {
  console.log('📄 Generating PDF for:', originalFileName, 'in', targetLangName);
  console.log('📝 Text length:', translatedText?.length || 0);

  if (!translatedText || translatedText.length === 0) {
    console.error('❌ No translated text to generate PDF');
    alert('Error: No translated text available');
    return;
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set up PDF styling
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    const maxWidth = pageWidth - margin * 2;

    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const title = `Translation (${targetLangName})`;
    pdf.text(title, pageWidth / 2, margin, { align: 'center' });

    // Add original filename
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100);
    pdf.text(`Source: ${originalFileName}`, pageWidth / 2, margin + 8, {
      align: 'center',
    });

    // Reset for body text
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);

    // Split text into lines that fit the page width
    let yPosition = margin + 20;
    const lines = pdf.splitTextToSize(translatedText, maxWidth);

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition + lineHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    // Generate filename
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_${targetLangName}.pdf`;

    // Try multiple download methods for compatibility
    try {
      // Method 1: Create blob and use anchor element (works in most browsers)
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = outputFileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup after delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log('✅ PDF download triggered:', outputFileName);
    } catch (downloadError) {
      console.warn(
        '⚠️ Download method 1 failed, trying fallback:',
        downloadError
      );

      // Method 2: Open in new window/tab (fallback for WKWebView)
      const dataUri = pdf.output('datauristring');
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${outputFileName}</title></head>
            <body style="margin:0;">
              <embed width="100%" height="100%" src="${dataUri}" type="application/pdf" />
            </body>
          </html>
        `);
      } else {
        // Final fallback: direct save
        pdf.save(outputFileName);
      }
    }
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    alert(
      'Error generating PDF: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }
}
