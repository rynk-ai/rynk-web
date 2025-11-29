import { getPdfJs } from './pdfjs-cdn-loader'
import { chunkText } from './chunking'

export interface ProcessedChunk {
  content: string
  metadata: {
    pageStart: number
    pageEnd: number
    sectionTitle?: string
    chunkType: 'header' | 'body' | 'table' | 'list'
    charCount: number
  }
}

export interface ProcessedPDF {
  chunks: ProcessedChunk[]
  metadata: {
    pageCount: number
    extractedPages: number
    totalChunks: number
    hasStructure: boolean
  }
}

interface PageStructure {
  fullText: string
  sections: {
    title: string
    text: string
    type: 'header' | 'body'
  }[]
}

/**
 * Process a PDF file: extract text, detect structure, and chunk intelligently
 */
export async function processPDF(
  file: File, 
  onProgress?: (progress: { stage: string; current: number; total: number }) => void
): Promise<ProcessedPDF> {
  // Load PDF.js
  const pdfjsLib = await getPdfJs()
  
  // Load document
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const pages: PageStructure[] = []
  const chunks: ProcessedChunk[] = []
  
  // 1. Extract text and structure per page
  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) {
      onProgress({ 
        stage: 'parsing', 
        current: i, 
        total: pdf.numPages 
      })
    }
    
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    
    // Parse structure (headers vs body)
    const pageData = parsePageStructure(textContent)
    pages.push(pageData)
  }
  
  // 2. Smart chunking
  if (onProgress) {
    onProgress({ stage: 'chunking', current: 0, total: 100 })
  }
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const pageNum = i + 1
    
    // Strategy 1: Chunk by semantic sections if detected
    if (page.sections.length > 0) {
      for (const section of page.sections) {
        // If section is too large, sub-chunk it
        if (section.text.length > 1500) {
          const subChunks = chunkText(section.text, { chunkSize: 1000, overlap: 200 })
          
          subChunks.forEach(subChunk => {
            chunks.push({
              content: subChunk,
              metadata: {
                pageStart: pageNum,
                pageEnd: pageNum,
                sectionTitle: section.title,
                chunkType: 'body',
                charCount: subChunk.length
              }
            })
          })
        } else {
          // Keep section intact
          chunks.push({
            content: section.text,
            metadata: {
              pageStart: pageNum,
              pageEnd: pageNum,
              sectionTitle: section.title,
              chunkType: section.type === 'header' ? 'header' : 'body',
              charCount: section.text.length
            }
          })
        }
      }
    } else {
      // Strategy 2: Fallback to fixed-size chunks
      const pageChunks = chunkText(page.fullText, {
        chunkSize: 1000,
        overlap: 200
      })
      
      pageChunks.forEach((chunk, idx) => {
        chunks.push({
          content: chunk,
          metadata: {
            pageStart: pageNum,
            pageEnd: pageNum,
            chunkType: 'body',
            charCount: chunk.length
          }
        })
      })
    }
  }
  
  return {
    chunks,
    metadata: {
      pageCount: pdf.numPages,
      extractedPages: pages.length,
      totalChunks: chunks.length,
      hasStructure: pages.some(p => p.sections.length > 0)
    }
  }
}

/**
 * Helper to detect headers based on font size
 */
function parsePageStructure(textContent: any): PageStructure {
  const items = textContent.items
  const sections: { title: string; text: string; type: 'header' | 'body' }[] = []
  
  let currentSection: { title: string; text: string; type: 'header' | 'body' } | null = null
  let fullText = ''
  
  // Calculate average font height to detect headers
  // Filter out empty strings
  const fontHeights = items
    .filter((item: any) => item.str.trim().length > 0)
    .map((item: any) => Math.abs(item.transform[3])) // transform[3] is usually font height
    
  if (fontHeights.length === 0) {
    return { fullText: '', sections: [] }
  }
  
  // Simple mode/median calculation
  fontHeights.sort((a: number, b: number) => a - b)
  const medianHeight = fontHeights[Math.floor(fontHeights.length / 2)] || 10
  const headerThreshold = medianHeight * 1.2 // Headers are usually 20% larger
  
  for (const item of items) {
    const text = item.str
    // Skip empty items but keep spaces
    if (!text) continue
    
    fullText += text + (item.hasEOL ? '\n' : ' ')
    
    // Check if this item is a header
    const height = Math.abs(item.transform[3])
    const isHeader = height > headerThreshold && text.trim().length > 3
    
    if (isHeader) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection)
      }
      
      // Start new section
      currentSection = {
        title: text.trim(),
        text: text + (item.hasEOL ? '\n' : ' '),
        type: 'header'
      }
    } else {
      if (currentSection) {
        currentSection.text += text + (item.hasEOL ? '\n' : ' ')
      } else {
        // Create default section if none exists
        currentSection = {
          title: 'Page Content',
          text: text + (item.hasEOL ? '\n' : ' '),
          type: 'body'
        }
      }
    }
  }
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection)
  }
  
  return {
    fullText,
    sections
  }
}

/**
 * Quick text extraction for small PDFs (no chunking/indexing)
 * Used for PDFs < 500KB to provide instant inline content
 */
export async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n\n';
  }
  
  return fullText.trim();
}
