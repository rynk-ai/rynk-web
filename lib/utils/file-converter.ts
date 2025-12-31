import {
  FileCategory,
  FILE_SIZE_LIMITS,
  IMAGE_MIME_TYPES,
  PDF_MIME_TYPE,
  TEXT_MIME_TYPES,
  CODE_MIME_TYPES,
  DATA_MIME_TYPES,
  OFFICE_MIME_TYPES,
  getFileExtension,
  inferMimeTypeFromExtension,
  CODE_EXTENSIONS,
  TEXT_EXTENSIONS,
  DATA_EXTENSIONS,
} from '@/lib/constants/file-config'

/**
 * Converts a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts multiple files to base64 data URLs
 */
export async function filesToBase64(files: File[]): Promise<string[]> {
  return Promise.all(files.map(fileToBase64));
}

/**
 * Reads a file as text
 */
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Checks if a file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === PDF_MIME_TYPE || getFileExtension(file.name) === '.pdf';
}

/**
 * Checks if a file type is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_MIME_TYPES.includes(file.type);
}

/**
 * Checks if a file is a text file
 */
export function isTextFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return TEXT_MIME_TYPES.includes(file.type) || TEXT_EXTENSIONS.includes(ext);
}

/**
 * Checks if a file is a code file
 */
export function isCodeFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return CODE_MIME_TYPES.includes(file.type) || CODE_EXTENSIONS.includes(ext);
}

/**
 * Checks if a file is a data file (JSON, CSV, XML)
 */
export function isDataFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return DATA_MIME_TYPES.includes(file.type) || DATA_EXTENSIONS.includes(ext);
}

/**
 * Checks if a file is an office document
 */
export function isOfficeDocument(file: File): boolean {
  return OFFICE_MIME_TYPES.includes(file.type);
}

/**
 * Checks if a file is text-based (can be read as text)
 */
export function isTextBasedFile(file: File): boolean {
  return isTextFile(file) || isCodeFile(file) || isDataFile(file);
}

/**
 * Checks if file can be converted to base64 for multimodal models
 */
export function isSupportedForMultimodal(file: File): boolean {
  return isImageFile(file) || isPDFFile(file);
}

/**
 * Gets the category of a file
 */
export function getFileCategory(file: File): FileCategory {
  if (isImageFile(file)) return 'image';
  if (isPDFFile(file)) return 'pdf';
  if (isTextFile(file)) return 'text';
  if (isCodeFile(file)) return 'code';
  if (isDataFile(file)) return 'data';
  if (isOfficeDocument(file)) return 'office';
  return 'other';
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validates a file against size limits and type restrictions
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  category?: FileCategory;
  sizeLimit?: string;
}

export function validateFile(file: File): ValidationResult {
  const category = getFileCategory(file);
  const sizeLimit = FILE_SIZE_LIMITS[category];

  // Check file size
  if (file.size > sizeLimit.bytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds ${sizeLimit.label} limit for ${category} files`,
      category,
      sizeLimit: sizeLimit.label,
    };
  }

  // Check if file size is 0
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
      category,
    };
  }

  return {
    valid: true,
    category,
    sizeLimit: sizeLimit.label,
  };
}

/**
 * Validates if file can be processed by multimodal models (legacy function)
 * @deprecated Use validateFile instead
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Use shared validation logic
  const validation = validateFile(file);
  
  // For backward compatibility restricted to image/pdf
  if (!isImageFile(file) && !isPDFFile(file)) {
    return { valid: false, error: 'File must be an image or PDF' };
  }

  // If validateFile failed (e.g. size limit), return that error
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true };
}

/**
 * Extracts text content from a PDF file
 * Note: This function only works in browser environments
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  if (!isPDFFile(file)) {
    throw new Error('File must be a PDF');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF text extraction is only available in browser environments');
  }

  try {
    // Load PDF.js from CDN
    const pdfjsLib = await import('@/lib/utils/pdfjs-cdn-loader').then(m => m.getPdfJs());

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Join all text items with spaces
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Options for PDF to image conversion
 */
export interface PdfToImageOptions {
  maxPages?: number;  // Maximum number of pages to convert (default: all)
  scale?: number;     // Rendering scale (default: 1.0)
  quality?: number;   // JPEG quality 0-1 (default: 0.6)
}

/**
 * Converts a PDF file to array of base64 images (one per page)
 * Note: This function only works in browser environments
 */
export async function pdfToBase64Images(
  file: File, 
  options: PdfToImageOptions = {}
): Promise<string[]> {
  if (!isPDFFile(file)) {
    throw new Error('File must be a PDF');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF conversion is only available in browser environments');
  }

  const { maxPages = Infinity, scale = 1.0, quality = 0.6 } = options;

  // Load PDF.js from CDN instead of bundling it
  const pdfjsLib = await import('@/lib/utils/pdfjs-cdn-loader').then(m => m.getPdfJs());

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const images: string[] = [];
  const pagesToRender = Math.min(pdf.numPages, maxPages);

  // Render each page
  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Convert canvas to base64 with specified quality
    const imageBase64 = canvas.toDataURL('image/jpeg', quality);
    images.push(imageBase64);

    // Clean up
    canvas.remove();
  }

  return images;
}
