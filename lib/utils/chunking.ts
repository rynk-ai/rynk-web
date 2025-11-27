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
