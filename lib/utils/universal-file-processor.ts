import { processPDF, type ProcessedChunk } from './pdf-processor'
import { fileToText, isPDFFile, isTextFile, isCodeFile, isDataFile } from './file-converter'
import { chunkText } from './chunking'

export interface ProcessedFile {
  chunks: {
    content: string
    metadata: any
  }[]
  metadata: {
    totalChunks: number
    fileType: string
    processingMethod: string
  }
}

/**
 * Universal file processor - handles PDFs, code files, markdown, text files, etc.
 * Extracts text and chunks it for vectorization
 */
export async function processFile(
  file: File,
  onProgress?: (progress: { stage: string; current: number; total: number }) => void
): Promise<ProcessedFile> {
  console.log(`[processFile] Processing ${file.name} (${file.type})`)
  
  // Handle PDFs with specialized processor
  if (isPDFFile(file)) {
    const result = await processPDF(file, onProgress)
    return {
      chunks: result.chunks.map(chunk => ({
        content: chunk.content,
        metadata: chunk.metadata
      })),
      metadata: {
        totalChunks: result.metadata.totalChunks,
        fileType: 'pdf',
        processingMethod: 'pdf-processor'
      }
    }
  }
  
  // Handle text-based files (code, markdown, txt, json, csv, xml, etc.)
  if (isTextFile(file) || isCodeFile(file) || isDataFile(file)) {
    const text = await fileToText(file)
    
    if (!text || text.trim().length === 0) {
      console.warn(`[processFile] File ${file.name} is empty`)
      return {
        chunks: [],
        metadata: {
          totalChunks: 0,
          fileType: 'text',
          processingMethod: 'text-extraction'
        }
      }
    }
    
    // Chunk the text
    const chunks = chunkText(text, { chunkSize: 1000, overlap: 200 })
    
    return {
      chunks: chunks.map((chunk, idx) => ({
        content: chunk,
        metadata: {
          chunkIndex: idx,
          fileType: file.type || 'text/plain',
          fileName: file.name,
          charCount: chunk.length
        }
      })),
      metadata: {
        totalChunks: chunks.length,
        fileType: file.type || 'text/plain',
        processingMethod: 'text-chunking'
      }
    }
  }
  
  // Handle office documents (docx, doc) - basic text extraction
  // Note: For full office document support, you'd need a library like mammoth.js
  if (file.type.includes('word') || file.type.includes('document')) {
    console.warn(`[processFile] Office document detected but not fully supported yet: ${file.name}`)
    // For now, just return empty (you can add mammoth.js integration later)
    return {
      chunks: [],
      metadata: {
        totalChunks: 0,
        fileType: file.type,
        processingMethod: 'unsupported'
      }
    }
  }
  
  // Unsupported file type
  console.warn(`[processFile] Unsupported file type: ${file.type} for ${file.name}`)
  return {
    chunks: [],
    metadata: {
      totalChunks: 0,
      fileType: file.type,
      processingMethod: 'unsupported'
    }
  }
}

/**
 * Process multiple files and return their combined chunks
 */
export async function processFiles(
  files: File[],
  onProgress?: (fileIndex: number, fileProgress: { stage: string; current: number; total: number }) => void
): Promise<Map<File, ProcessedFile>> {
  const results = new Map<File, ProcessedFile>()
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const result = await processFile(file, (progress) => {
      if (onProgress) {
        onProgress(i, progress)
      }
    })
    results.set(file, result)
  }
  
  return results
}
