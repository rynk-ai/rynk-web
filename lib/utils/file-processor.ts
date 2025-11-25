/**
 * File processing utilities for extracting content from various file types
 * Used by chat service to prepare files for AI consumption
 */

import { cloudStorage } from '@/lib/services/cloud-storage'
import { 
  isTextFile, 
  isCodeFile, 
  isDataFile,
  isPDFFile,
  fileToText,
  formatFileSize,
} from '@/lib/utils/file-converter'
import { getFileExtension } from '@/lib/constants/file-config'

/**
 * Extracts text content from a text-based file
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const text = await fileToText(file)
    
    // Limit text length to prevent token overflow (100k chars ≈ 25k tokens)
    const MAX_CHARS = 100000
    if (text.length > MAX_CHARS) {
      return text.substring(0, MAX_CHARS) + '\n\n[... text truncated due to length ...]'
    }
    
    return text
  } catch (error) {
    console.error('Failed to extract text from file:', error)
    throw new Error(`Failed to read file: ${file.name}`)
  }
}

/**
 * Formats text content based on file type
 */
export function formatFileContent(file: File, content: string): string {
  const ext = getFileExtension(file.name)
  
  // Code files - wrap in code block with language
  if (isCodeFile(file)) {
    const language = getLanguageFromExtension(ext)
    return `**File: ${file.name}**\n\`\`\`${language}\n${content}\n\`\`\``
  }
  
  // Data files - format based on type
  if (isDataFile(file)) {
    if (ext === '.json') {
      try {
        // Pretty print JSON
        const parsed = JSON.parse(content)
        const formatted = JSON.stringify(parsed, null, 2)
        return `**File: ${file.name}** (JSON)\n\`\`\`json\n${formatted}\n\`\`\``
      } catch {
        // If JSON parsing fails, treat as text
        return `**File: ${file.name}**\n\`\`\`\n${content}\n\`\`\``
      }
    }
    
    if (ext === '.csv') {
      return `**File: ${file.name}** (CSV)\n\`\`\`csv\n${content}\n\`\`\``
    }
    
    if (ext === '.xml') {
      return `**File: ${file.name}** (XML)\n\`\`\`xml\n${content}\n\`\`\``
    }
  }
  
  // Text files - simple formatting
  if (isTextFile(file)) {
    if (ext === '.md' || ext === '.markdown') {
      return `**File: ${file.name}** (Markdown)\n\n${content}`
    }
    return `**File: ${file.name}**\n\`\`\`\n${content}\n\`\`\``
  }
  
  // Fallback
  return `**File: ${file.name}**\n\n${content}`
}

/**
 * Maps file extension to code language identifier
 */
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.xml': 'xml',
    '.md': 'markdown',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
  }
  
  return languageMap[ext] || ''
}

/**
 * Fetches a file from R2 storage and extracts text content
 * Used by chat service when preparing messages for AI
 */
export async function fetchAndExtractText(url: string, filename: string): Promise<string> {
  try {
    // Extract key from URL
    let key = url
    
    // Handle /api/files/KEY
    if (url.includes('/api/files/')) {
      key = url.split('/api/files/')[1]
    } 
    // Handle R2 public URL
    else if (url.startsWith('http')) {
      const urlObj = new URL(url)
      key = urlObj.pathname.substring(1)
    }
    
    // Decode URI component in case of spaces/special chars
    key = decodeURIComponent(key)
    
    console.log('🔍 [fetchAndExtractText] Fetching key:', key)
    const object = await cloudStorage.getFile(key)
    
    if (!object) {
      console.warn('⚠️ [fetchAndExtractText] File not found in R2:', key)
      return `[File not found: ${filename}]`
    }
    
    // Read as text
    const arrayBuffer = await object.arrayBuffer()
    const text = new TextDecoder('utf-8').decode(arrayBuffer)
    
    // Limit length
    const MAX_CHARS = 100000
    if (text.length > MAX_CHARS) {
      return text.substring(0, MAX_CHARS) + '\n\n[... text truncated due to length ...]'
    }
    
    return text
  } catch (error) {
    console.error('❌ [fetchAndExtractText] Error:', error)
    return `[Error reading file: ${filename}]`
  }
}

/**
 * Generates metadata description for unsupported file types
 */
export function generateFileMetadata(attachment: { name: string; type: string; size: number; url: string }): string {
  return `📎 **Attachment**: ${attachment.name}\n` +
         `**Type**: ${attachment.type}\n` +
         `**Size**: ${formatFileSize(attachment.size)}\n` +
         `*(File content cannot be extracted, but metadata is provided for reference)*`
}
