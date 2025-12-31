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
 * Returns a function that should be called with each new chunk of text.
 */
export function createStreamProcessor(handlers: StreamProcessor) {
  let buffer = "";

  return function processChunk(chunk: string) {
    buffer += chunk;
    const lines = buffer.split("\n");

    // Process all complete lines (everything except the last one)
    // The last line might be incomplete, so we keep it in the buffer
    // UNLESS the chunk ended with a newline, in which case the last line is empty
    const lastLineDisplay = buffer.endsWith("\n") ? undefined : lines.pop();

    // If buffer ended with newline, lines contains all complete lines including the one before the final newline
    // If buffer didn't end with newline, we popped the incomplete line, so lines contains only complete ones

    for (const line of lines) {
      if (!line.trim()) continue;

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
        
        // If it's not a known JSON type, treat as content
        // BUT verify it's not a malformed/partial JSON of our types
        // This is a heuristic: our event JSONs start with {"type":
        if (line.startsWith('{"type":')) {
             // Try to parse generic to see if we missed a type or failed above
             try {
                 const parsed = JSON.parse(line);
                 // If we parsed it but didn't handle it above, it's an unknown event type. 
                 // We should probably ignore it or treat as content? 
                 // Treating as content is safer to avoid losing data, 
                 // but might leak JSON to UI. For now, let's treat as content 
                 // if it's not one of our known types.
             } catch(e) {
                 // It wasn't valid JSON, so definitely content
             }
        }

      } catch (e) {
        // Not a valid JSON object, treat as content
      }

      handlers.onContent?.(line + "\n");
    }

    // Reset buffer to the incomplete line
    buffer = lastLineDisplay !== undefined ? lastLineDisplay : "";
  };
}

/**
 * Legacy stateless parser for backward compatibility or simple one-off chunks.
 * WARNING: Does not handle split JSON lines correctly. Use createStreamProcessor for streams.
 */
export function processStreamChunk(
  chunk: string,
  handlers: StreamProcessor
): void {
  const processor = createStreamProcessor(handlers);
  processor(chunk);
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
