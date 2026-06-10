/**
 * Extract text from PDF using pdfjs-dist with CDN worker.
 */

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log(`📄 Starting PDF extraction...`);
    
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // CRITICAL FIX: Use the correct worker path for pdfjs-dist v6
    // The worker needs to be from the same package build
    if (typeof window === 'undefined') {
      // Server-side: Use the local worker from node_modules
      pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
    } else {
      // Client-side fallback (shouldn't hit this in API routes)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;
    }
    
    // Load the PDF document with better error handling
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      standardFontDataUrl: undefined,
      verbosity: 0, // Reduce console noise
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`📄 Processing PDF with ${numPages} pages...`);
    
    if (numPages === 0) {
      throw new Error('PDF has 0 pages. The file may be corrupted or invalid.');
    }
    
    // Extract text from all pages
    const textPages: string[] = [];
    let successfulPages = 0;
    let failedPages = 0;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract and join text items
        const pageText = textContent.items
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'str' in item) {
              return item.str;
            }
            return '';
          })
          .filter((text: string) => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          textPages.push(pageText.trim());
          successfulPages++;
        }
      } catch (pageError) {
        failedPages++;
        console.warn(`⚠️  Failed to extract text from page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log(`📊 Extraction stats: ${successfulPages}/${numPages} pages successful, ${failedPages} failed`);

    // Combine all pages
    const fullText = textPages.join('\n\n').trim();

    if (!fullText || fullText.length === 0) {
      if (successfulPages === 0) {
        throw new Error('Could not extract any text from the PDF. The PDF might be scanned images (requires OCR), corrupted, or password protected.');
      } else {
        throw new Error(`Extracted text from ${successfulPages} pages but all pages appear to be empty. The PDF might contain only images or non-text content.`);
      }
    }

    console.log(`✅ Successfully extracted ${fullText.length} characters from ${successfulPages} pages`);
    return fullText;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ PDF extraction error:', message);
    
    // Provide more specific error messages
    if (message.includes('Invalid PDF structure') || message.includes('PDF header')) {
      throw new Error('Invalid PDF file structure. The file may be corrupted or not a valid PDF.');
    }
    if (message.includes('password') || message.includes('encrypted')) {
      throw new Error('This PDF is password protected or encrypted. Please provide an unprotected version.');
    }
    if (message.includes('worker')) {
      throw new Error('PDF worker initialization failed. This is a server configuration issue.');
    }
    
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}
