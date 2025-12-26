/**
 * Stream parser for handling server-sent events from the chat API.
 * Extracts status pills, search results, context cards, and content from the stream.
 */

export interface StatusMetadata {
  sourceCount?: number
  sourcesRead?: number
  currentSource?: string
  contextChunks?: number
  filesProcessed?: number
  totalFiles?: number
}

export interface StatusPill {
  status: "analyzing" | "building_context" | "searching" | "reading_sources" | "synthesizing" | "complete";
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
 * Parse a chunk of streamed text into structured events.
 * Handles JSON status messages and plain text content.
 *
 * @param chunk - Raw text chunk from the stream
 * @returns Array of parsed events
 */
export function parseStreamChunk(chunk: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const lines = chunk.split("\n");
  let contentBuffer = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    try {
      // Check for JSON status messages
      if (line.startsWith('{"type":"status"')) {
        const parsed = JSON.parse(line);
        events.push({
          type: "status",
          data: {
            status: parsed.status,
            message: parsed.message,
            timestamp: parsed.timestamp,
            ...(parsed.metadata && { metadata: parsed.metadata }),
          },
        });
        continue;
      }

      // Check for search results
      if (line.startsWith('{"type":"search_results"')) {
        const parsed = JSON.parse(line);
        events.push({
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

      // Check for context cards
      if (line.startsWith('{"type":"context_cards"')) {
        const parsed = JSON.parse(line);
        events.push({
          type: "context_cards",
          data: parsed.cards || [],
        });
        continue;
      }
    } catch (e) {
      // Not a valid JSON object, treat as content
    }

    // If not a special message, it's content
    if (line.trim()) {
      contentBuffer += line;
    }

    // Preserve newlines between content lines
    if (i < lines.length - 1) {
      contentBuffer += "\n";
    }
  }

  // Emit content if we accumulated any
  if (contentBuffer) {
    events.push({ type: "content", text: contentBuffer });
  }

  return events;
}

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

export function processStreamChunk(
  chunk: string,
  handlers: StreamProcessor
): void {
  const events = parseStreamChunk(chunk);

  for (const event of events) {
    switch (event.type) {
      case "status":
        handlers.onStatus?.(event.data);
        break;
      case "search_results":
        handlers.onSearchResults?.(event.data);
        break;
      case "context_cards":
        handlers.onContextCards?.(event.data);
        break;
      case "content":
        handlers.onContent?.(event.text);
        break;
    }
  }
}

/**
 * Create a TransformStream that parses stream chunks.
 * Useful for wrapping fetch response bodies.
 */
export function createStreamParserTransform(): TransformStream<
  Uint8Array,
  StreamEvent
> {
  const decoder = new TextDecoder();

  return new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const events = parseStreamChunk(text);

      for (const event of events) {
        controller.enqueue(event);
      }
    },
  });
}
