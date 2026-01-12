/**
 * Chunk text into overlapping segments
 */
export function chunkText(text: string, options: { chunkSize?: number, overlap?: number } = {}): string[] {
  const chunkSize = options.chunkSize || 2000;
  const overlap = options.overlap || 200;
  
  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // If we're at the end, just take the rest
    if (endIndex >= text.length) {
      chunks.push(text.slice(startIndex));
      break;
    }
    
    // Try to find a natural break point within the last 10% of the chunk
    // to avoid cutting words or sentences in half
    const lookbackWindow = Math.min(chunkSize * 0.1, 100);
    const searchEnd = endIndex;
    const searchStart = endIndex - lookbackWindow;
    
    const slice = text.slice(searchStart, searchEnd);
    
    // Priority 1: Paragraph break
    let breakIndex = slice.lastIndexOf('\n\n');
    
    // Priority 2: Line break
    if (breakIndex === -1) {
      breakIndex = slice.lastIndexOf('\n');
    }
    
    // Priority 3: Sentence end
    if (breakIndex === -1) {
      breakIndex = slice.lastIndexOf('. ');
    }
    
    // Priority 4: Word break
    if (breakIndex === -1) {
      breakIndex = slice.lastIndexOf(' ');
    }
    
    // If we found a break point, adjust endIndex
    if (breakIndex !== -1) {
      endIndex = searchStart + breakIndex + 1; // Include the delimiter
    }
    
    chunks.push(text.slice(startIndex, endIndex));
    
    // Move start index for next chunk, accounting for overlap
    // But ensure we always move forward at least a bit
    const nextStart = endIndex - overlap;
    startIndex = Math.max(nextStart, startIndex + 1);
  }
  
  return chunks;
}

/**
 * SMALL-TO-BIG: Split text into sentences for precise embedding
 * Uses regex that handles common sentence endings while being robust
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.length === 0) return [];
  
  // Pattern: Match sentence endings (.!?) followed by space or end
  // Handles: Mr. Mrs. Dr. etc. by requiring capital letter after
  const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/g;
  
  const sentences = text
    .replace(/\n+/g, ' ')  // Normalize newlines to spaces
    .split(sentencePattern)
    .map(s => s.trim())
    .filter(s => s.length > 10);  // Filter out very short fragments
  
  // If splitting failed (e.g., no proper sentence endings), fallback to paragraph chunks
  if (sentences.length === 0 && text.length > 10) {
    return [text.trim()];
  }
  
  return sentences;
}

/**
 * SMALL-TO-BIG: Create sentence windows for context-aware retrieval
 * Returns the original sentence plus surrounding context
 */
export interface SentenceWindow {
  sentence: string;      // The single sentence (for embedding)
  window: string;        // Expanded context (for LLM)
  sentenceIndex: number;
}

export function createSentenceWindows(
  text: string, 
  windowSize: number = 2  // Sentences before/after
): SentenceWindow[] {
  const sentences = splitIntoSentences(text);
  
  return sentences.map((sentence, i) => {
    const windowStart = Math.max(0, i - windowSize);
    const windowEnd = Math.min(sentences.length, i + windowSize + 1);
    const window = sentences.slice(windowStart, windowEnd).join(' ');
    
    return {
      sentence,
      window,
      sentenceIndex: i
    };
  });
}

/**
 * SMALL-TO-BIG: Parent-Child chunking for documents
 * Creates large parent chunks (~2000 chars) for LLM context
 * and small child chunks (~300 chars) for precise embedding
 */
export interface ParentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  metadata?: any;
}

export interface ChildChunk {
  id: string;
  parentId: string;
  content: string;
  chunkIndex: number;
}

export interface ParentChildResult {
  parents: ParentChunk[];
  children: ChildChunk[];
}

/**
 * Split text into parent-child chunks for Small-to-Big retrieval
 * @param text The full document text
 * @param parentSize Target size for parent chunks (~2000 chars)
 * @param childSize Target size for child chunks (~300 chars)
 */
export function chunkWithParentChild(
  text: string,
  options: { parentSize?: number; childSize?: number } = {}
): ParentChildResult {
  const { parentSize = 2000, childSize = 300 } = options;
  
  if (!text || text.length === 0) {
    return { parents: [], children: [] };
  }

  // Step 1: Create parent chunks using existing chunkText logic
  const parentContents = chunkText(text, { chunkSize: parentSize, overlap: 100 });
  
  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];
  
  parentContents.forEach((parentContent, parentIndex) => {
    const parentId = `parent-${parentIndex}`;
    
    parents.push({
      id: parentId,
      content: parentContent,
      chunkIndex: parentIndex
    });
    
    // Step 2: Split each parent into child chunks
    // Use sentences first, then fall back to character-based if sentences are too long
    const sentences = splitIntoSentences(parentContent);
    
    if (sentences.length > 0) {
      // Group sentences into ~childSize chunks
      let currentChild = '';
      let childIndex = 0;
      
      sentences.forEach((sentence) => {
        if (currentChild.length + sentence.length > childSize && currentChild.length > 0) {
          // Save current child
          children.push({
            id: `${parentId}-child-${childIndex}`,
            parentId,
            content: currentChild.trim(),
            chunkIndex: childIndex
          });
          childIndex++;
          currentChild = sentence;
        } else {
          currentChild += (currentChild ? ' ' : '') + sentence;
        }
      });
      
      // Save remaining content
      if (currentChild.trim().length > 0) {
        children.push({
          id: `${parentId}-child-${childIndex}`,
          parentId,
          content: currentChild.trim(),
          chunkIndex: childIndex
        });
      }
    } else {
      // Fallback: character-based chunking
      const childContents = chunkText(parentContent, { chunkSize: childSize, overlap: 50 });
      childContents.forEach((childContent, childIndex) => {
        children.push({
          id: `${parentId}-child-${childIndex}`,
          parentId,
          content: childContent,
          chunkIndex: childIndex
        });
      });
    }
  });
  
  return { parents, children };
}
