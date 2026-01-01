import { useState, useCallback, useRef } from "react";
import { createStreamProcessor, StatusPill, SearchResults, ContextCard } from "@/lib/utils/stream-parser";

interface StreamState {
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamingContent: string;
  // Volatile metadata state
  statusPills: StatusPill[];
  searchResults: SearchResults | null;
  contextCards: ContextCard[];
}

interface UseChatStreamOptions {
  onContentUpdate?: (content: string) => void;
  onStatusUpdate?: (pills: StatusPill[]) => void;
  onSearchResultsUpdate?: (results: SearchResults) => void;
  onContextCardsUpdate?: (cards: ContextCard[]) => void;
  onFinish?: (fullContent: string) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  // --- State ---
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  
  // Volatile state (kept in ref + state for rendering)
  // We expose these as state for UI consumption, but update them via refs/throttling if needed
  // For simplicity in this unification, we'll use state but rely on the parent to throttle if needed
  // However, to replace useStreaming, we should handle throttling here.
  
  const [statusPills, setStatusPills] = useState<StatusPill[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);

  // --- Refs ---
  const contentBufferRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusPillsRef = useRef<StatusPill[]>([]); // Track pills synchronously
  
  // Refs for callbacks to avoid dependency cycles
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Throttled Updates ---
  const updateStreamContent = useCallback((newContent: string) => {
    contentBufferRef.current = newContent;
    
    if (flushTimeoutRef.current) return;
    
    flushTimeoutRef.current = setTimeout(() => {
        setStreamingContent(contentBufferRef.current);
        optionsRef.current.onContentUpdate?.(contentBufferRef.current);
        flushTimeoutRef.current = null;
    }, 16); // ~60fps
  }, []);

  // --- Handlers ---
  
  const resetStreamState = useCallback(() => {
    setStreamingContent("");
    setStatusPills([]);
    statusPillsRef.current = []; // Reset ref
    setSearchResults(null);
    setContextCards([]);
    contentBufferRef.current = "";
    if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
    }
  }, []);

  const processStream = useCallback(async (
    streamReader: ReadableStreamDefaultReader<Uint8Array>,
    messageId: string
  ): Promise<string> => {
    setStreamingMessageId(messageId);
    resetStreamState();
    
    const decoder = new TextDecoder();
    let fullContent = "";
    
    // Create new abort controller for this stream
    abortControllerRef.current = new AbortController();

    try {
        const { processChunk, flush } = createStreamProcessor({
            onStatus: (pill) => {
                // Update ref first
                const next = [...statusPillsRef.current, pill];
                statusPillsRef.current = next;
                
                // Then update state and external callback safely (no functional update side-effect)
                setStatusPills(next);
                optionsRef.current.onStatusUpdate?.(next);
            },
            onSearchResults: (results) => {
                setSearchResults(results);
                optionsRef.current.onSearchResultsUpdate?.(results);
            },
            onContextCards: (cards) => {
                setContextCards(cards);
                optionsRef.current.onContextCardsUpdate?.(cards);
            },
            onContent: (text) => {
                fullContent += text;
                updateStreamContent(fullContent);
            }
        });

        while (true) {
            const { done, value } = await streamReader.read();
            if (done) break;
            
            // Check for manual abort
            if (abortControllerRef.current.signal.aborted) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            processChunk(chunk);
        }

        flush();
        
        // Final flush ensure exact content sync
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        setStreamingContent(fullContent);
        optionsRef.current.onContentUpdate?.(fullContent);

        // Add 'complete' status if not present (optional logic, kept from controller)
        const currentPills = statusPillsRef.current;
        const hasComplete = currentPills.some(p => p.status === 'complete');
        if (!hasComplete) {
             const completePill: StatusPill = { 
                 status: 'complete', 
                 message: 'Reasoning complete', 
                 timestamp: Date.now() 
             };
             const next = [...currentPills, completePill];
             statusPillsRef.current = next;
             setStatusPills(next);
             optionsRef.current.onStatusUpdate?.(next);
        }

        optionsRef.current.onFinish?.(fullContent);

    } catch (err) {
        console.error("Stream reading failed:", err);
        throw err;
    } finally {
        setStreamingMessageId(null);
        abortControllerRef.current = null;
    }
    
    return fullContent;
  }, [resetStreamState, updateStreamContent]);

  const abortStream = useCallback(() => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
  }, []);

  return {
    // State
    isStreaming: !!streamingMessageId,
    streamingMessageId,
    streamingContent,
    statusPills,
    searchResults,
    contextCards,
    
    // Actions
    processStream,
    abortStream,
    resetStreamState,
    
    // Manual Setters (if needed for external overrides)
    setStatusPills,
    setSearchResults,
    setContextCards
  };
}
