import { extractText } from 'unpdf';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lista di file da testare (percorsi relativi a services/odax-chat/scripts)
const TEST_FILES = [
  '../public/2507.01738v2 (1).pdf', // File utente
  '../app/components/NIPS-2012-imagenet-classification-with-deep-convolutional-neural-networks-Paper.pdf', // Paper classico
  '../../DeepResearch/Tech_Report.pdf', // Report tecnico
  '../../DeepResearch/Agent/AgentFounder/assets/tts.pdf', // Slide o altro
];

async function runSuite() {
  console.log('🚀 Starting PDF Extraction Test Suite (Cascade Mode)...');
  console.log('----------------------------------------------------');

  for (const relativePath of TEST_FILES) {
    const fullPath = path.resolve(__dirname, relativePath);
    console.log(`\n📄 Testing File: ${path.basename(fullPath)}`);

    try {
      const fileBuffer = await fs.readFile(fullPath);
      const fileSize = fileBuffer.length;
      console.log(`📦 Size: ${(fileSize / 1024).toFixed(2)} KB`);

      let extractedText = '';
      let methodUsed = '';

      // METHOD 1: pdf-parse
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fileBuffer);

        if (data.text && data.text.trim().length > 20) {
          extractedText = data.text.trim();
          methodUsed = 'pdf-parse';
          console.log(`✅ pdf-parse SUCCESS (${extractedText.length} chars)`);
        } else {
          console.warn(`⚠️ pdf-parse returned empty/short text`);
          throw new Error('Empty text');
        }
      } catch (e1) {
        console.warn(`⚠️ pdf-parse failed: ${e1.message}`);

        // METHOD 2: unpdf fallback
        try {
          const arrayBuffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength
          );
          const { text } = await extractText(arrayBuffer, { mergePages: true });

          if (text && text.trim().length > 20) {
            extractedText = text.trim();
            methodUsed = 'unpdf';
            console.log(`✅ unpdf SUCCESS (${extractedText.length} chars)`);
          } else {
            throw new Error('Empty text');
          }
        } catch (e2) {
          console.error(`❌ unpdf failed: ${e2.message}`);
        }
      }

      if (!extractedText) {
        console.error(
          `❌ FAILED: Could not extract text from ${path.basename(fullPath)}`
        );
        continue;
      }

      // TRUNCATION LOGIC TEST
      const MAX_CHARS = 15000;
      const HEAD = 10000;
      const TAIL = 5000;

      if (extractedText.length > MAX_CHARS) {
        console.log(
          `✂️ Truncating text (Original: ${extractedText.length} > Limit: ${MAX_CHARS})`
        );
        const headText = extractedText.slice(0, HEAD);
        const tailText = extractedText.slice(extractedText.length - TAIL);
        const truncated = `${headText}\n\n[... TRUNCATED ...]\n\n${tailText}`;
        console.log(`✅ Truncated successfully to ${truncated.length} chars`);
        console.log(
          `🔍 Head Preview: "${headText.slice(0, 50).replace(/\n/g, ' ')}..."`
        );
        console.log(
          `🔍 Tail Preview: "...${tailText.slice(-50).replace(/\n/g, ' ')}"`
        );
      } else {
        console.log(
          `✅ Text fits within limit (${extractedText.length} <= ${MAX_CHARS})`
        );
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`⛔️ File not found/skipped: ${path.basename(fullPath)}`);
      } else {
        console.error(`🔥 Critical Error: ${err.message}`);
      }
    }
  }
  console.log('\n✅ Test Suite Completed.');
}

runSuite();
