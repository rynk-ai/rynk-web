"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export interface UsePendingQueryOptions {
  /** Current conversation ID - used to clear conversation if needed */
  currentConversationId: string | null;
  /** Whether currently sending a message - prevents processing if true */
  isSending: boolean;
  /** Callback to submit the pending query */
  onSubmit: (query: string, files: File[]) => void;
  /** Callback to clear/select conversation */
  onSelectConversation: (id: string | null) => void;
  /** Base path to redirect to after processing (e.g., "/chat", "/guest-chat", "/project/xxx") */
  basePath: string;
}

/**
 * usePendingQuery - Handles pending queries from URL params (?q=...) or localStorage.
 * 
 * Used by: chat page, guest-chat page, project page
 * 
 * Behavior:
 * 1. Checks URL query param first, then localStorage
 * 2. If pending query exists, clears current conversation
 * 3. Auto-submits the query after a short delay
 * 4. Cleans up URL/localStorage after submission
 */
export function usePendingQuery({
  currentConversationId,
  isSending,
  onSubmit,
  onSelectConversation,
  basePath,
}: UsePendingQueryOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    // CRITICAL: Don't process if already sending - prevents duplicate submissions
    if (isSending) {
      return;
    }

    // Check if we've already processed in this session
    const alreadyProcessed =
      sessionStorage.getItem("pendingQueryProcessed") === "true";
    if (alreadyProcessed || processedRef.current) {
      return;
    }

    // First check URL query parameter
    const urlQuery = searchParams.get("q");

    // Then check localStorage
    const localStorageQuery = localStorage.getItem("pendingChatQuery");

    // Use URL param if available, otherwise fall back to localStorage
    const pendingQuery = urlQuery || localStorageQuery;

    // Early return if no pending query
    if (!pendingQuery || !pendingQuery.trim()) {
      return;
    }

    // If there's a pending query, clear the current conversation to start fresh
    if (currentConversationId) {
      onSelectConversation(null);
    }

    // Mark as processed
    processedRef.current = true;
    sessionStorage.setItem("pendingQueryProcessed", "true");

    // Use a shorter delay to avoid Fast Refresh cancellation
    const timer = setTimeout(() => {
      // Auto-submit the pending query
      onSubmit(pendingQuery, []);

      // Clear localStorage AFTER submit
      if (localStorageQuery) {
        localStorage.removeItem("pendingChatQuery");
        localStorage.removeItem("pendingChatFilesCount");
      }

      // Clear URL param AFTER submit
      if (urlQuery) {
        router.replace(basePath);
      }

      // Clear the session flag after successful submission
      sessionStorage.removeItem("pendingQueryProcessed");
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [
    currentConversationId,
    searchParams,
    router,
    isSending,
    onSubmit,
    onSelectConversation,
    basePath,
  ]);
}
