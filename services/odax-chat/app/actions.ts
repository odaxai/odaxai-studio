'use server';

import { extractText } from 'unpdf';
import mammoth from 'mammoth';

export async function parsePdf(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { text: '[PDF: No file provided]' };
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { text: `[PDF: ${file.name} - File is empty or invalid]` };
    }

    console.log(
      `📄 Processing PDF: ${file.name}, size: ${arrayBuffer.byteLength} bytes`
    );

    // METHOD 1: pdf-parse (loaded dynamically to avoid webpack bundling issues)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse');
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse(buffer);
      const text = data.text;

      console.log(`✅ Extracted (pdf-parse) ${text.length} characters`);

      if (text && text.trim().length > 20) {
        return { text: text.trim() };
      }
      throw new Error('Empty text from pdf-parse');
    } catch (pdfParseError) {
      console.warn(
        '⚠️ pdf-parse failed, trying unpdf fallback...',
        pdfParseError
      );

      // METHOD 2: unpdf (Modern fallback)
      try {
        const { text, totalPages } = await extractText(arrayBuffer, {
          mergePages: true,
        });
        console.log(
          `✅ Extracted (unpdf) from ${totalPages} pages: ${text.length} chars`
        );

        if (text && text.trim().length > 20) {
          return { text: text.trim() };
        }
        throw new Error('Empty text from unpdf');
      } catch (unpdfError) {
        console.error('❌ unpdf fallback failed:', unpdfError);

        // Return Detailed Error for Debugging in Chat
        const err1 =
          pdfParseError instanceof Error
            ? pdfParseError.message
            : String(pdfParseError);
        const err2 =
          unpdfError instanceof Error ? unpdfError.message : String(unpdfError);

        return {
          text: `[PDF: ${file.name} - Text extraction failed.\nDetails:\n1. pdf-parse: ${err1}\n2. unpdf: ${err2}\n\nPlease use Image Upload for OCR.]`,
        };
      }
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ PDF parsing error:', error);
    return { text: `[PDF parsing error: ${errorMessage}]` };
  }
}

export async function parseWord(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { text: '[Word: No file provided]' };
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { text: `[Word: ${file.name} - File is empty or invalid]` };
    }

    console.log(
      `📄 Processing Word doc: ${file.name}, size: ${arrayBuffer.byteLength} bytes`
    );

    try {
      // Use mammoth to extract text from Word documents
      const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer,
      });

      const text = result.value;
      console.log(`✅ Extracted ${text.length} characters from Word doc`);

      if (!text || text.trim().length === 0) {
        return {
          text: `[Word: ${file.name} - No text could be extracted. The document may be empty or contain only images.]`,
        };
      }

      return { text: text.trim() };
    } catch (extractError) {
      console.error('❌ Word extraction error:', extractError);
      return {
        text: `[Word: ${file.name} - Text extraction failed. Please try converting to PDF or copy-pasting the text.]`,
      };
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Word parsing error:', error);
    return { text: `[Word parsing error: ${errorMessage}]` };
  }
}
