/**
 * Stream parser for handling server-sent events from the chat API.
 * Extracts status pills, search results, context cards, and content from the stream.
 */

export interface StatusMetadata {
  sourceCount?: number;
  sourcesRead?: number;
  currentSource?: string;
  contextChunks?: number;
  filesProcessed?: number;
  totalFiles?: number;
}

export interface StatusPill {
  status:
    | "analyzing"
    | "building_context"
    | "searching"
    | "reading_sources"
    | "synthesizing"
    | "complete";
  message: string;
  timestamp: number;
  metadata?: StatusMetadata;
}

export interface SearchSource {
  type: string;
  url: string;
  title: string;
  snippet: string;
  image?: string;
  images?: string[];
}

export interface SearchResults {
  query: string;
  sources: SearchSource[];
  strategy: string | string[];
  totalResults: number;
}

export interface ContextCard {
  source: string;
  snippet: string;
  score: number;
}

export type StreamEvent =
  | { type: "status"; data: StatusPill }
  | { type: "search_results"; data: SearchResults }
  | { type: "context_cards"; data: ContextCard[] }
  | { type: "content"; text: string };

/**
 * Process a stream and return handlers for each event type.
 * This is a higher-level abstraction for common use cases.
 */
export interface StreamProcessor {
  onStatus?: (pill: StatusPill) => void;
  onSearchResults?: (results: SearchResults) => void;
  onContextCards?: (cards: ContextCard[]) => void;
  onContent?: (text: string) => void;
}

/**
 * Creates a stateful stream processor that can handle chunks splitting across lines.
 * Returns an object with:
 * - processChunk: function to call with each new chunk of text
 * - flush: function to call at stream end to emit any remaining buffered content
 */
export function createStreamProcessor(handlers: StreamProcessor) {
  let buffer = "";

  function processChunk(chunk: string) {
    buffer += chunk;
    const lines = buffer.split("\n");
    
    // The last line is always incomplete (or empty if it ended with \n)
    // We keep it in the buffer for the next chunk
    const remainingBuffer = lines.pop(); // Mutates lines array
    buffer = remainingBuffer !== undefined ? remainingBuffer : "";

    for (const line of lines) {
      // Don't skip empty lines here - they are valid content (newlines)!
      // Only skip checking for JSON on empty lines
      
      const trimmedLine = line.trim();
      if (trimmedLine) {
        try {
          // Check for JSON status messages
          if (line.startsWith('{"type":"status"')) {
            const parsed = JSON.parse(line);
            handlers.onStatus?.({
              status: parsed.status,
              message: parsed.message,
              timestamp: parsed.timestamp,
              ...(parsed.metadata && { metadata: parsed.metadata }),
            });
            continue;
          }

          // Check for search results
          if (line.startsWith('{"type":"search_results"')) {
            const parsed = JSON.parse(line);
            handlers.onSearchResults?.({
              query: parsed.query,
              sources: parsed.sources,
              strategy: parsed.strategy,
              totalResults: parsed.totalResults,
            });
            continue;
          }

          // Check for context cards
          if (line.startsWith('{"type":"context_cards"')) {
            const parsed = JSON.parse(line);
            handlers.onContextCards?.(parsed.cards || []);
            continue;
          }
          
          // Heuristic to avoid emitting broken JSON as content
          if (line.startsWith('{"type":')) {
             try {
                // If it parses as JSON, but wasn't handled above, it's an unknown event.
                // We implicitly swallow it to match previous behavior/safety, 
                // effectively acting like "continue"
                 JSON.parse(line);
                 continue; 
             } catch(e) {
                 // Partial JSON line - skip it, the buffer will reassemble on next chunk
                 // DO NOT emit as content or raw JSON will clutter the UI
                 continue;
             }
          }

        } catch (e) {
          // Not a valid JSON object, process as content
        }
      }

      handlers.onContent?.(line + "\n");
    }
  }

  /** Flush any remaining content in the buffer (call at stream end) */
  function flush() {
    if (buffer.trim()) {
      // Don't emit if it looks like incomplete JSON
      if (!buffer.trim().startsWith('{"type":')) {
        handlers.onContent?.(buffer);
      }
    }
    buffer = "";
  }

  return { processChunk, flush };
}

/**
 * Legacy stateless parser for backward compatibility or simple one-off chunks.
 * WARNING: Does not handle split JSON lines correctly. Use createStreamProcessor for streams.
 */
export function processStreamChunk(
  chunk: string,
  handlers: StreamProcessor
): void {
  const { processChunk, flush } = createStreamProcessor(handlers);
  processChunk(chunk);
  flush(); // Flush immediately since this is stateless
  // Note: this stateless version loses the buffer, so any trailing text is lost/not processed if not terminated
  // This is why users should migrate to createStreamProcessor
}

/**
 * Create a TransformStream that parses stream chunks statefully.
 * Useful for wrapping fetch response bodies.
 */
export function createStreamParserTransform(): TransformStream<
  Uint8Array,
  StreamEvent
> {
  const decoder = new TextDecoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;
      const lines = buffer.split("\n");
      const lastLine = buffer.endsWith("\n") ? undefined : lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          if (line.startsWith('{"type":"status"')) {
            const parsed = JSON.parse(line);
            controller.enqueue({
              type: "status",
              data: {
                status: parsed.status,
                message: parsed.message,
                timestamp: parsed.timestamp,
                metadata: parsed.metadata,
              },
            });
            continue;
          }

          if (line.startsWith('{"type":"search_results"')) {
            const parsed = JSON.parse(line);
            controller.enqueue({
              type: "search_results",
              data: {
                query: parsed.query,
                sources: parsed.sources,
                strategy: parsed.strategy,
                totalResults: parsed.totalResults,
              },
            });
            continue;
          }

          if (line.startsWith('{"type":"context_cards"')) {
            const parsed = JSON.parse(line);
            controller.enqueue({
              type: "context_cards",
              data: parsed.cards || [],
            });
            continue;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        controller.enqueue({ type: "content", text: line + "\n" });
      }

      buffer = lastLine !== undefined ? lastLine : "";
    },
    flush(controller) {
      if (buffer.trim()) {
        controller.enqueue({ type: "content", text: buffer });
      }
    },
  });
}
