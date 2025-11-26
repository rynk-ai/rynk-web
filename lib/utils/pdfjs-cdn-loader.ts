/**
 * Utility to load PDF.js from CDN
 * This avoids bundling the entire pdfjs-dist library (~7.5 MB)
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_VERSION = '4.0.379'; // Stable version compatible with your use case
const PDFJS_CDN_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsLoadPromise: Promise<any> | null = null;

/**
 * Loads PDF.js library from CDN
 * Uses a singleton pattern to ensure it's only loaded once
 */
export async function loadPdfJsFromCDN(): Promise<any> {
  // Return existing promise if already loading
  if (pdfjsLoadPromise) {
    return pdfjsLoadPromise;
  }

  // Return immediately if already loaded
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  pdfjsLoadPromise = new Promise(async (resolve, reject) => {
    try {
      // Dynamically import PDF.js as ES module
      const pdfjsModule = await import(/* webpackIgnore: true */ PDFJS_CDN_URL);
      
      // Configure worker
      if (pdfjsModule.GlobalWorkerOptions) {
        pdfjsModule.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }

      // Store in window for reuse
      window.pdfjsLib = pdfjsModule;

      console.log('✅ PDF.js loaded from CDN');
      resolve(pdfjsModule);
    } catch (error) {
      console.error('❌ Failed to load PDF.js from CDN:', error);
      pdfjsLoadPromise = null; // Reset so it can be retried
      reject(new Error('Failed to load PDF.js library. Please check your internet connection.'));
    }
  });

  return pdfjsLoadPromise;
}

/**
 * Gets the PDF.js library, loading from CDN if needed
 */
export async function getPdfJs(): Promise<any> {
  if (!window.pdfjsLib) {
    await loadPdfJsFromCDN();
  }
  return window.pdfjsLib;
}
