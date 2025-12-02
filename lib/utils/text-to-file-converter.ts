/**
 * Utility for converting text strings into .txt File objects
 * Used when users paste long text content into the chat input
 */

/**
 * Converts a text string into a .txt File object
 * 
 * @param text - The text content to convert
 * @param filename - Optional custom filename (without extension)
 * @returns File object with text/plain MIME type
 */
export function textToFile(text: string, filename?: string): File {
  // Generate filename with timestamp if not provided
  const timestamp = Date.now();
  const finalFilename = filename 
    ? `${filename}.txt` 
    : `pasted-text-${timestamp}.txt`;
  
  // Create a Blob from the text
  const blob = new Blob([text], { type: 'text/plain' });
  
  // Convert Blob to File
  const file = new File([blob], finalFilename, {
    type: 'text/plain',
    lastModified: timestamp,
  });
  
  return file;
}

/**
 * Constant defining the character threshold for auto-converting pasted text
 */
export const LONG_TEXT_THRESHOLD = 1000;
