"use client";

import { useCallback } from "react";
import {
  uploadFile as uploadFileAction,
  initiateMultipartUpload as initiateMultipartUploadAction,
  uploadPart as uploadPartAction,
  completeMultipartUpload as completeMultipartUploadAction,
} from "@/app/actions";
import { toast } from "sonner";

// Threshold for using PDF async indexing (5MB)
const LARGE_PDF_THRESHOLD = 5 * 1024 * 1024;

// Chunk size for multipart upload (6MB - Min 5MB for R2, Max 100MB for Worker)
const CHUNK_SIZE = 6 * 1024 * 1024;

export interface UploadedFile {
  file: File;
  url: string;
  name: string;
  type: string;
  size: number;
  isLargePDF: boolean;
}

/**
 * Check if a PDF file is large enough to require async indexing
 */
export function isPDFLarge(file: File): boolean {
  return file.type === "application/pdf" && file.size > LARGE_PDF_THRESHOLD;
}

/**
 * Hook for handling file uploads with automatic multipart support for large files.
 * Consolidates duplicate upload logic from app/chat/page.tsx and lib/hooks/use-chat.ts.
 */
export function useFileUpload() {
  /**
   * Upload a single file to R2, using multipart upload for large files.
   */
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (file.size <= CHUNK_SIZE) {
      // Small file: Use simple upload
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFileAction(formData);
      return result.url;
    } else {
      // Large file: Use Multipart Upload
      console.log(
        `[useFileUpload] Starting multipart upload for ${file.name} (${file.size} bytes)`
      );
      const { uploadId, key } = await initiateMultipartUploadAction(
        file.name,
        file.type
      );
      const parts = [];
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);

        console.log(`[useFileUpload] Uploading part ${i + 1}/${totalChunks}`);
        const part = await uploadPartAction(key, uploadId, i + 1, formData);
        parts.push(part);
      }

      return completeMultipartUploadAction(key, uploadId, parts);
    }
  }, []);

  /**
   * Process and upload multiple files, returning metadata for each.
   */
  const processAttachments = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      if (files.length === 0) return [];

      console.log("[useFileUpload] Processing files:", files.length);

      const uploadPromises = files.map(async (file): Promise<UploadedFile | null> => {
        try {
          const isLarge = isPDFLarge(file);

          if (isLarge) {
            console.log(
              `[useFileUpload] Large PDF detected (${file.size} bytes):`,
              file.name
            );
          }

          const publicUrl = await uploadFile(file);
          console.log("[useFileUpload] ✅ File uploaded:", publicUrl);

          return {
            file, // Keep original File for background indexing
            url: publicUrl,
            name: file.name,
            type: file.type,
            size: file.size,
            isLargePDF: isLarge,
          };
        } catch (error) {
          console.error(
            "[useFileUpload] Failed to upload file:",
            file.name,
            error
          );
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      return results.filter((r): r is UploadedFile => r !== null);
    },
    [uploadFile]
  );

  /**
   * Convenience wrapper for uploading files to R2.
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      if (!files || files.length === 0) return [];
      console.log("[useFileUpload] Uploading files to R2...");
      const uploaded = await processAttachments(files);
      console.log("[useFileUpload] ✅ Files uploaded to R2");
      return uploaded;
    },
    [processAttachments]
  );

  return {
    uploadFile,
    uploadFiles,
    processAttachments,
    isPDFLarge,
  };
}
