/**
 * File upload configuration and constants
 * Defines supported file types, size limits, and processing strategies
 */

export type FileCategory = 'image' | 'pdf' | 'text' | 'code' | 'data' | 'office' | 'other'

export interface FileSizeLimit {
  bytes: number
  label: string
}

export const FILE_SIZE_LIMITS: Record<FileCategory, FileSizeLimit> = {
  image: { bytes: 10 * 1024 * 1024, label: '10MB' },
  pdf: { bytes: 150 * 1024 * 1024, label: '150MB' },
  text: { bytes: 5 * 1024 * 1024, label: '5MB' },
  code: { bytes: 5 * 1024 * 1024, label: '5MB' },
  data: { bytes: 5 * 1024 * 1024, label: '5MB' },
  office: { bytes: 15 * 1024 * 1024, label: '15MB' },
  other: { bytes: 10 * 1024 * 1024, label: '10MB' },
}

// MIME type mappings
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
]

export const PDF_MIME_TYPE = 'application/pdf'

export const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
]

export const CODE_MIME_TYPES = [
  'text/javascript',
  'text/typescript',
  'text/html',
  'text/css',
  'text/x-python',
  'text/x-java',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-php',
  'text/x-ruby',
  'text/x-go',
  'text/x-rust',
  'text/x-sql',
  'text/x-sh',
  'application/javascript',
  'application/typescript',
  'application/x-python',
  'application/x-sh',
]

export const DATA_MIME_TYPES = [
  'application/json',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/x-yaml',
  'text/yaml',
]

export const OFFICE_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

// File extensions for accept attribute
export const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.go', '.rs', '.rb', '.php',
  '.html', '.css', '.scss', '.sass',
  '.sql', '.sh', '.bash',
  '.yaml', '.yml', '.toml',
  '.swift', '.kt', '.scala',
]

export const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown',
]

export const DATA_EXTENSIONS = [
  '.json', '.csv', '.xml',
]

export const OFFICE_EXTENSIONS = [
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
]

// Combined accept string for file inputs
export const ACCEPTED_FILE_TYPES = [
  'image/*',
  PDF_MIME_TYPE,
  ...TEXT_EXTENSIONS,
  ...CODE_EXTENSIONS,
  ...DATA_EXTENSIONS,
  ...OFFICE_EXTENSIONS,
].join(',')

// Helper to get file extension
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ''
}

// Map extension to potential MIME type (browser doesn't always provide correct MIME)
export function inferMimeTypeFromExtension(filename: string): string | null {
  const ext = getFileExtension(filename)
  
  // Code files
  const codeMap: Record<string, string> = {
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.py': 'text/x-python',
    '.java': 'text/x-java',
    '.cpp': 'text/x-c++',
    '.c': 'text/x-c',
    '.cs': 'text/x-csharp',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.rb': 'text/x-ruby',
    '.php': 'text/x-php',
    '.sh': 'text/x-sh',
    '.sql': 'text/x-sql',
  }
  
  if (codeMap[ext]) return codeMap[ext]
  
  // Data files
  if (ext === '.json') return 'application/json'
  if (ext === '.csv') return 'text/csv'
  if (ext === '.xml') return 'application/xml'
  if (ext === '.yaml' || ext === '.yml') return 'application/x-yaml'
  
  // Text files
  if (ext === '.txt') return 'text/plain'
  if (ext === '.md' || ext === '.markdown') return 'text/markdown'
  
  return null
}
