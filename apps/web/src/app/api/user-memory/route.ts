/**
 * User Memory API
 * Simple key-value memory for user facts (name, preferences, etc.)
 * Stored in ~/.odax/user-memory.json
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Extract potential facts from text (simple pattern matching)
function extractFacts(text: string): Array<{ key: string; value: string }> {
  const facts: Array<{ key: string; value: string }> = [];

  // Pattern: "mi chiamo X" / "my name is X"
  const nameMatch = text.match(
    /(?:mi chiamo|my name is|i am|sono|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  );
  if (nameMatch) {
    facts.push({ key: 'user_name', value: nameMatch[1] });
  }

  // Pattern: "I like X" / "mi piace X"
  const likeMatch = text.match(
    /(?:i like|mi piace|adoro|amo)\s+(.+?)(?:\.|,|$)/i
  );
  if (likeMatch) {
    facts.push({ key: 'preference', value: likeMatch[1] });
  }

  // Pattern: "I work as X" / "lavoro come X"
  const workMatch = text.match(
    /(?:i work as|lavoro come|sono un|i am a)\s+([^.,]+)/i
  );
  if (workMatch) {
    facts.push({ key: 'occupation', value: workMatch[1] });
  }

  // Pattern: "I live in X" / "vivo a X"
  const liveMatch = text.match(/(?:i live in|vivo a|abito a)\s+([^.,]+)/i);
  if (liveMatch) {
    facts.push({ key: 'location', value: liveMatch[1] });
  }

  return facts;
}

// GET - Retrieve relevant memory for a query
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || '';
  const memory = loadMemory();

  // Build context from facts
  let context = '';

  if (memory.facts.length > 0) {
    context += 'Known facts about the user:\n';
    for (const fact of memory.facts) {
      if (fact.key === 'user_name') {
        context += `- User's name: ${fact.value}\n`;
      } else if (fact.key === 'preference') {
        context += `- User likes: ${fact.value}\n`;
      } else if (fact.key === 'occupation') {
        context += `- User works as: ${fact.value}\n`;
      } else if (fact.key === 'location') {
        context += `- User lives in: ${fact.value}\n`;
      } else {
        context += `- ${fact.key}: ${fact.value}\n`;
      }
    }
  }

  // Add stored documents (PDFs, etc.)
  if (memory.documents && memory.documents.length > 0) {
    context += '\nPreviously analyzed documents:\n';
    for (const doc of memory.documents) {
      // Include document name and first 2000 chars of content
      context += `\n--- Document: ${doc.name} ---\n`;
      context += doc.content.slice(0, 2000);
      if (doc.content.length > 2000) {
        context += '\n[... content truncated]';
      }
      context += '\n';
    }
  }

  // Add recent conversations for context
  const recentConvos = memory.conversations.slice(-10);
  if (recentConvos.length > 0 && query) {
    context += '\nRecent conversation history:\n';
    for (const msg of recentConvos) {
      context += `${msg.role}: ${msg.content.slice(0, 200)}\n`;
    }
  }

  return NextResponse.json({
    context,
    facts: memory.facts,
    documents: memory.documents || [],
    conversationCount: memory.conversations.length,
  });
}

// POST - Save new information to memory
export async function POST(req: NextRequest) {
  const { role, content, extractFactsFromContent = true } = await req.json();

  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const memory = loadMemory();

  // Initialize documents array if it doesn't exist
  if (!memory.documents) {
    memory.documents = [];
  }

  // Handle document storage (PDFs, etc.)
  if (role === 'document') {
    // Extract document name from content if it starts with "Document:"
    const match = content.match(/^Document:\s*(.+?)\n/);
    const docName = match ? match[1] : `document-${Date.now()}.pdf`;
    const docContent = match ? content.slice(match[0].length) : content;

    // Check if document already exists, update if so
    const existingIndex = memory.documents.findIndex(
      (d: { name: string }) => d.name === docName
    );
    if (existingIndex >= 0) {
      memory.documents[existingIndex] = {
        name: docName,
        content: docContent,
        timestamp: Date.now(),
      };
      console.log(`📄 Updated document in memory: ${docName}`);
    } else {
      memory.documents.push({
        name: docName,
        content: docContent,
        timestamp: Date.now(),
      });
      console.log(`📄 Saved new document to memory: ${docName}`);
    }

    // Keep only last 10 documents
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

  // Save the conversation
  memory.conversations.push({
    role: role || 'user',
    content,
    timestamp: Date.now(),
  });

  // Keep only last 100 messages
  if (memory.conversations.length > 100) {
    memory.conversations = memory.conversations.slice(-100);
  }

  // Extract and save facts if it's a user message
  if (extractFactsFromContent && role === 'user') {
    const newFacts = extractFacts(content);
    for (const fact of newFacts) {
      // Update existing fact or add new one
      const existingIndex = memory.facts.findIndex((f) => f.key === fact.key);
      if (existingIndex >= 0) {
        memory.facts[existingIndex] = { ...fact, timestamp: Date.now() };
      } else {
        memory.facts.push({ ...fact, timestamp: Date.now() });
      }
    }
  }

  saveMemory(memory);

  return NextResponse.json({
    success: true,
    factsCount: memory.facts.length,
    conversationsCount: memory.conversations.length,
    documentsCount: memory.documents.length,
  });
}

// DELETE - Clear memory
export async function DELETE() {
  saveMemory({ facts: [], conversations: [], documents: [] });
  return NextResponse.json({ success: true, message: 'Memory cleared' });
}
