/**
 * Extract raw text from a PDF buffer using pdfjs-dist.
 * Simple, direct approach without require.resolve issues.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-dist
    const pdfJs = await import('pdfjs-dist');
    
    // Import worker and set it globally
    try {
      // @ts-ignore - pdfjs-dist worker module doesn't have types
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs');
      if (typeof workerModule === 'object' && workerModule.default) {
        pdfJs.GlobalWorkerOptions.workerSrc = workerModule.default;
      }
    } catch {
      // Worker setup is not critical, continue anyway
      console.warn('Could not set PDF worker, will attempt direct parsing');
    }

    // Load and parse PDF
    const pdf = await pdfJs.getDocument(buffer).promise;
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => {
            return typeof item.str === 'string' ? item.str : '';
          })
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n';
        }
      } catch (pageErr) {
        console.warn(`Error extracting page ${pageNum}:`, pageErr);
        // Continue with next page
      }
    }

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('PDF file is empty or contains no extractable text.');
    }

    return fullText.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error parsing PDF content:', message);
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}
