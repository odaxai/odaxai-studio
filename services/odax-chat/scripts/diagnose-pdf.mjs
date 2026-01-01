import { extractText } from 'unpdf';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Percorso al PDF specifico dell'utente nella cartella public
const TEST_PDF_PATH = path.join(__dirname, '../public/2507.01738v2 (1).pdf');

async function testPdfParsing() {
  console.log('🚀 Starting PDF Parsing Test...');
  console.log(`📄 Target File: ${TEST_PDF_PATH}`);

  try {
    const fileBuffer = await fs.readFile(TEST_PDF_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    console.log(`📦 File loaded, size: ${fileBuffer.length} bytes`);

    // Test 1: unpdf
    console.log('\n--- Testing unpdf ---');
    try {
      const { text, totalPages } = await extractText(arrayBuffer, {
        mergePages: true,
      });
      console.log(`✅ unpdf Success!`);
      console.log(`📚 Pages: ${totalPages}`);
      console.log(`📝 Extracted Chars: ${text.length}`);
      console.log(`🔍 Preview: ${text.slice(0, 100).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error('❌ unpdf Failed:', e);
    }

    // Test 2: pdf-parse (fallback)
    console.log('\n--- Testing pdf-parse (fallback) ---');
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fileBuffer);
      console.log(`✅ pdf-parse Success!`);
      console.log(`📚 Pages: ${data.numpages}`);
      console.log(`📝 Extracted Chars: ${data.text.length}`);
      console.log(
        `🔍 Preview: ${data.text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (e) {
      console.error('❌ pdf-parse Failed:', e);
    }
  } catch (err) {
    console.error('🔥 Critical Error reading file:', err);
    if (err.code === 'ENOENT') {
      console.error('❌ File not found. Check the path.');
    }
  }
}

testPdfParsing();
