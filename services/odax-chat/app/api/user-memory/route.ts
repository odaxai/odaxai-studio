/**
 * User Memory API - Local to odax-chat
 * Stores documents (PDFs), facts, and conversation history
 * Uses LanceDB for vector storage and semantic search (per patent spec)
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  addFact,
  addConversation,
  searchMemory,
  getAllFacts,
  clearVectorMemory,
} from '../../lib/vectorMemoryService';

export const dynamic = 'force-dynamic';

const MEMORY_FILE = path.join(os.homedir(), '.odax', 'user-memory.json');

interface UserMemory {
  facts: Array<{
    key: string;
    value: string;
    timestamp: number;
  }>;
  conversations: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
  documents: Array<{
    name: string;
    content: string;
    timestamp: number;
  }>;
}

function loadMemory(): UserMemory {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading memory:', e);
  }
  return { facts: [], conversations: [], documents: [] };
}

function saveMemory(memory: UserMemory): void {
  try {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch (e) {
    console.error('Error saving memory:', e);
  }
}

// Extract personal facts from user message
function extractFacts(content: string): Array<{ key: string; value: string }> {
  const facts: Array<{ key: string; value: string }> = [];
  const lowerContent = content.toLowerCase();

  // Name patterns (multiple languages)
  const namePatterns = [
    /(?:my name is|i'm|i am|mi chiamo|sono|je m'appelle|ich bin|me llamo)\s+([A-Z][a-zA-Zàèéìòù'-]+(?:\s+[A-Z][a-zA-Zàèéìòù'-]+)?)/i,
    /(?:call me|chiamami)\s+([A-Z][a-zA-Zàèéìòù'-]+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 50) {
      facts.push({ key: 'name', value: match[1].trim() });
      break;
    }
  }

  // Profession patterns
  const professionPatterns = [
    /(?:i work as|i'm a|i am a|lavoro come|sono un|sono una|je suis|ich bin ein)\s+([a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
    /(?:my job is|my profession is|il mio lavoro è)\s+([a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
  ];
  for (const pattern of professionPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
      // Avoid saving just "a" or common words
      if (!['a', 'an', 'un', 'una'].includes(match[1].toLowerCase().trim())) {
        facts.push({ key: 'profession', value: match[1].trim() });
        break;
      }
    }
  }

  // Location patterns
  const locationPatterns = [
    /(?:i live in|i'm from|i am from|vivo a|abito a|vengo da|sono di|je vis à|ich wohne in)\s+([A-Z][a-zA-Zàèéìòù\s'-]+?)(?:\.|,|$)/i,
  ];
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 50) {
      facts.push({ key: 'location', value: match[1].trim() });
      break;
    }
  }

  // Age pattern
  const ageMatch = content.match(
    /(?:i'm|i am|ho|sono|j'ai)\s+(\d{1,3})\s*(?:years old|anni|ans|jahre)/i
  );
  if (ageMatch && ageMatch[1]) {
    const age = parseInt(ageMatch[1]);
    if (age > 0 && age < 150) {
      facts.push({ key: 'age', value: ageMatch[1] });
    }
  }

  return facts;
}

// GET - Retrieve memory context (uses vector search for semantic retrieval)
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || '';
  const memory = loadMemory();
  let context = '';

  // Use vector search for semantic memory retrieval if query provided
  if (query) {
    try {
      const vectorContext = await searchMemory(query, 5);
      if (vectorContext) {
        context += vectorContext + '\n\n';
      }
    } catch (e) {
      console.warn('Vector memory search failed, falling back to JSON:', e);
    }
  }

  // Fallback: Add facts from JSON store
  if (memory.facts.length > 0 && !context.includes('Known facts')) {
    context += 'Known facts about the user:\n';
    for (const fact of memory.facts) {
      context += `- ${fact.key}: ${fact.value}\n`;
    }
  }

  // Add documents
  if (memory.documents && memory.documents.length > 0) {
    context += '\nPreviously analyzed documents:\n';
    for (const doc of memory.documents) {
      context += `\n--- Document: ${doc.name} ---\n`;
      context += doc.content.slice(0, 3000);
      if (doc.content.length > 3000) {
        context += '\n[... content truncated]';
      }
      context += '\n';
    }
  }

  // Get facts from vector memory
  let vectorFacts: Array<{ key: string; value: string; timestamp: number }> =
    [];
  try {
    vectorFacts = await getAllFacts();
  } catch {
    // Fallback to JSON facts
  }

  return NextResponse.json({
    context,
    facts: vectorFacts.length > 0 ? vectorFacts : memory.facts,
    documents: memory.documents || [],
    conversationCount: memory.conversations.length,
  });
}

// POST - Save to memory
export async function POST(req: NextRequest) {
  const { role, content } = await req.json();

  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const memory = loadMemory();
  if (!memory.documents) memory.documents = [];

  // Handle document storage
  if (role === 'document') {
    const match = content.match(/^Document:\s*(.+?)\n/);
    const docName = match ? match[1] : `document-${Date.now()}.pdf`;
    const docContent = match ? content.slice(match[0].length) : content;

    const existingIndex = memory.documents.findIndex((d) => d.name === docName);
    if (existingIndex >= 0) {
      memory.documents[existingIndex] = {
        name: docName,
        content: docContent,
        timestamp: Date.now(),
      };
    } else {
      memory.documents.push({
        name: docName,
        content: docContent,
        timestamp: Date.now(),
      });
    }

    if (memory.documents.length > 10) {
      memory.documents = memory.documents.slice(-10);
    }

    saveMemory(memory);

    return NextResponse.json({
      success: true,
      message: `Document "${docName}" saved to memory`,
      documentsCount: memory.documents.length,
    });
  }

  // Extract facts from user messages and save to vector memory
  let extractedFacts: string[] = [];
  if (role === 'user') {
    const newFacts = extractFacts(content);
    for (const fact of newFacts) {
      // Save to vector memory
      try {
        await addFact(fact.key, fact.value);
        extractedFacts.push(`${fact.key}: ${fact.value}`);
      } catch (e) {
        console.error('Failed to save fact to vector memory:', e);
      }

      // Also save to JSON for backward compatibility
      const existingIndex = memory.facts.findIndex((f) => f.key === fact.key);
      if (existingIndex >= 0) {
        if (memory.facts[existingIndex].value !== fact.value) {
          memory.facts[existingIndex] = {
            key: fact.key,
            value: fact.value,
            timestamp: Date.now(),
          };
        }
      } else {
        memory.facts.push({
          key: fact.key,
          value: fact.value,
          timestamp: Date.now(),
        });
      }
    }

    // Save conversation to vector memory for semantic search
    try {
      await addConversation(role, content);
    } catch (e) {
      console.error('Failed to save conversation to vector memory:', e);
    }
  }

  // Save conversation to JSON
  memory.conversations.push({
    role: role || 'user',
    content,
    timestamp: Date.now(),
  });

  if (memory.conversations.length > 100) {
    memory.conversations = memory.conversations.slice(-100);
  }

  saveMemory(memory);

  return NextResponse.json({
    success: true,
    documentsCount: memory.documents.length,
    conversationsCount: memory.conversations.length,
    factsCount: memory.facts.length,
    extractedFacts: extractedFacts.length > 0 ? extractedFacts : undefined,
    vectorMemory: true,
  });
}

// DELETE - Clear memory (both vector and JSON)
export async function DELETE() {
  // Clear vector memory
  try {
    await clearVectorMemory();
  } catch (e) {
    console.error('Failed to clear vector memory:', e);
  }

  // Clear JSON memory
  saveMemory({ facts: [], conversations: [], documents: [] });
  return NextResponse.json({
    success: true,
    message: 'Memory cleared (vector + JSON)',
  });
}
