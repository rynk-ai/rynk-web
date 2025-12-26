/**
 * TypeScript interfaces for streaming data structures.
 * These types replace `any` throughout the streaming code.
 */

/**
 * Status pill displayed during AI response processing.
 */
export interface StatusPill {
  status: "analyzing" | "building_context" | "searching" | "reading_sources" | "synthesizing" | "complete";
  message: string;
  timestamp: number;
  metadata?: {
    sourceCount?: number;
    sourcesRead?: number;
    currentSource?: string;
    contextChunks?: number;
    filesProcessed?: number;
    totalFiles?: number;
  };
}

/**
 * A source result from web search.
 */
export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
  favicon?: string;
  image?: string;       // Primary image URL from the source
  images?: string[];    // Additional images (from Exa imageLinks)
}

/**
 * Search results returned during agentic AI processing.
 */
export interface SearchResults {
  query: string;
  sources: SearchSource[];
  strategy?: string;
  totalResults?: number;
}

/**
 * Reasoning metadata stored with messages.
 */
export interface ReasoningMetadata {
  statusPills: StatusPill[];
  searchResults?: SearchResults;
}

/**
 * Stream message types received during AI response.
 */
export type StreamMessage =
  | { type: "status"; data: StatusPill }
  | { type: "search_results"; data: SearchResults }
  | { type: "content"; data: string };

/**
 * Sub-chat message structure.
 */
export interface SubChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/**
 * Attachment metadata for messages.
 */
export interface AttachmentMetadata {
  name: string;
  url: string;
  type: string;
  size: number;
  isLargePDF?: boolean;
}
