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
 * Checks if a file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Checks if a file type is supported by multimodal models (images only)
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Checks if file can be converted to base64 for multimodal models
 */
export function isSupportedForMultimodal(file: File): boolean {
  return isImageFile(file) || isPDFFile(file);
}

/**
 * Converts a PDF file to array of base64 images (one per page)
 * Note: This function only works in browser environments
 */
export async function pdfToBase64Images(file: File): Promise<string[]> {
  if (!isPDFFile(file)) {
    throw new Error('File must be a PDF');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF conversion is only available in browser environments');
  }

  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');

  // Configure PDF.js worker (required for pdfjs-dist)
  // Use local worker file instead of CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const images: string[] = [];

  // Render each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Set scale for rendering (1.5 = good quality/size balance)
    const scale = 1.5;
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

    // Convert canvas to base64
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    images.push(imageBase64);

    // Clean up
    canvas.remove();
  }

  return images;
}

/**
 * Validates if file can be processed by multimodal models
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!isImageFile(file) && !isPDFFile(file)) {
    return { valid: false, error: 'File must be an image or PDF' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
}
