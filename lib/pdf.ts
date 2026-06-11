// IMPORTANT: import the internal implementation directly.
// The package entry point (`pdf-parse`) contains debug code that tries to read
// a local test PDF file (./test/data/05-versions-space.pdf) whenever
// `module.parent` is falsy. Under Next.js / Turbopack server bundling this
// triggers an ENOENT crash on import. Importing the lib file directly skips
// that debug block entirely.

type PdfParseFn = (
  dataBuffer: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number; info: unknown }>;

let pdfParsePromise: Promise<PdfParseFn> | null = null;

async function getPdfParse(): Promise<PdfParseFn> {
  pdfParsePromise ??= import('pdf-parse/lib/pdf-parse.js').then(
    (mod) => (mod.default ?? mod) as PdfParseFn
  );
  return pdfParsePromise;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log(`📄 Starting PDF extraction using pdf-parse (internal lib)...`);

    if (!buffer || buffer.length === 0) {
      throw new Error('PDF buffer is empty or undefined.');
    }

    const pdf = await getPdfParse();
    const result = await pdf(buffer);
    const fullText = (result.text || '').trim();

    if (!fullText) {
      throw new Error(
        'Could not extract any text from the PDF. The PDF might be scanned images (requires OCR), corrupted, or password protected.'
      );
    }

    console.log(`✅ Successfully extracted ${fullText.length} characters`);
    return fullText;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ PDF extraction error:', message);

    if (message.includes('Invalid PDF structure') || message.includes('PDF header')) {
      throw new Error('Invalid PDF file structure. The file may be corrupted or not a valid PDF.');
    }
    if (message.includes('password') || message.includes('encrypted')) {
      throw new Error('This PDF is password protected or encrypted. Please provide an unprotected version.');
    }

    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}
