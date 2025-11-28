-- Migration: Unified Knowledge Base Tables

-- 1. Sources Table (Deduplicated Content)
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE, -- SHA-256 hash for deduplication
  type TEXT NOT NULL, -- 'pdf', 'text', 'web', etc.
  name TEXT, -- Original filename or title
  metadata TEXT, -- JSON: { size, mimeType, etc. }
  createdAt INTEGER
);

-- 2. Knowledge Chunks Table (The actual vectors)
-- Replaces the old 'file_chunks' table concept
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  content TEXT NOT NULL,
  vector TEXT NOT NULL, -- JSON array of numbers
  chunkIndex INTEGER,
  metadata TEXT, -- JSON: { pageNumber, etc. }
  FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
);

-- 3. Conversation Source Links (The Many-to-Many link)
-- Links a source to a conversation (and optionally a specific message for versioning)
CREATE TABLE conversation_sources (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  messageId TEXT, -- If linked to a specific message (for branching/versioning)
  createdAt INTEGER,
  FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
  -- We don't enforce FK on conversationId/messageId strictly to avoid complex cascades, 
  -- but application logic should handle cleanup.
);

-- Indexes for performance
CREATE INDEX idx_sources_hash ON sources(hash);
CREATE INDEX idx_knowledge_chunks_sourceId ON knowledge_chunks(sourceId);
CREATE INDEX idx_conversation_sources_conversationId ON conversation_sources(conversationId);
CREATE INDEX idx_conversation_sources_messageId ON conversation_sources(messageId);
