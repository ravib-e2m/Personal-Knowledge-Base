interface Chunk {
  content: string;
  metadata: {
    headings: string[];
    sectionPath: string;
    charCount: number;
    startIndex: number;
  };
}

interface ChunkingOptions {
  chunkSize?: number; // In characters
  chunkOverlap?: number; // In characters
}

/**
 * Splits text into chunks, preserving headings context and structure.
 */
export function chunkText(text: string, options: ChunkingOptions = {}): Chunk[] {
  const chunkSize = options.chunkSize || 1000;
  const chunkOverlap = options.chunkOverlap || 200;

  if (text.length <= chunkSize) {
    return [
      {
        content: text,
        metadata: {
          headings: [],
          sectionPath: '',
          charCount: text.length,
          startIndex: 0,
        },
      },
    ];
  }

  // Split text by lines, keeping track of indexes
  const lines = text.split('\n');
  const chunks: Chunk[] = [];
  
  let currentHeadings: string[] = [];
  let currentChunkText = '';
  let currentChunkHeadings = [...currentHeadings];
  let currentStartIndex = 0;
  
  // Track heading levels (e.g., H1, H2, H3)
  const headingStack: { [key: number]: string } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      currentChunkText += '\n';
      continue;
    }

    // Detect markdown headings (e.g. # H1, ## H2)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      // Update heading stack
      headingStack[level] = title;
      
      // Remove lower-level headings from stack
      for (let l = level + 1; l <= 6; l++) {
        delete headingStack[l];
      }
      
      // Build current list of active headings
      currentHeadings = Object.keys(headingStack)
        .map(Number)
        .sort((a, b) => a - b)
        .map(l => headingStack[l]);

      // If we already have some chunk text, complete it before starting new heading chunk
      if (currentChunkText.trim().length > 0) {
        // Prepend current headings list context for model comprehension
        const contextHeader = currentChunkHeadings.length > 0 
          ? `[Section: ${currentChunkHeadings.join(' > ')}]\n`
          : '';
          
        chunks.push({
          content: contextHeader + currentChunkText.trim(),
          metadata: {
            headings: [...currentChunkHeadings],
            sectionPath: currentChunkHeadings.join(' > '),
            charCount: currentChunkText.length,
            startIndex: currentStartIndex,
          },
        });
        
        // Handle overlap: prepend a portion of previous text to keep context
        const overlapText = currentChunkText.slice(-chunkOverlap);
        currentChunkText = overlapText + '\n' + line + '\n';
        currentStartIndex = Math.max(0, currentStartIndex + currentChunkText.length - chunkOverlap);
      } else {
        currentChunkText += line + '\n';
      }
      
      currentChunkHeadings = [...currentHeadings];
      continue;
    }

    // Append regular line
    currentChunkText += line + '\n';

    // If chunk exceeds size, create a new one
    if (currentChunkText.length >= chunkSize) {
      const contextHeader = currentChunkHeadings.length > 0 
        ? `[Section: ${currentChunkHeadings.join(' > ')}]\n`
        : '';

      chunks.push({
        content: contextHeader + currentChunkText.trim(),
        metadata: {
          headings: [...currentChunkHeadings],
          sectionPath: currentChunkHeadings.join(' > '),
          charCount: currentChunkText.length,
          startIndex: currentStartIndex,
        },
      });

      // Keep overlap text
      const overlapStart = Math.max(0, currentChunkText.length - chunkOverlap);
      currentChunkText = currentChunkText.slice(overlapStart);
      currentStartIndex = currentStartIndex + overlapStart;
      currentChunkHeadings = [...currentHeadings];
    }
  }

  // Push final chunk if any remains
  if (currentChunkText.trim().length > 0) {
    const contextHeader = currentChunkHeadings.length > 0 
      ? `[Section: ${currentChunkHeadings.join(' > ')}]\n`
      : '';
      
    chunks.push({
      content: contextHeader + currentChunkText.trim(),
      metadata: {
        headings: [...currentChunkHeadings],
        sectionPath: currentChunkHeadings.join(' > '),
        charCount: currentChunkText.length,
        startIndex: currentStartIndex,
      },
    });
  }

  return chunks;
}
