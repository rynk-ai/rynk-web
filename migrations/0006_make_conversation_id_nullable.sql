-- Make conversationId nullable in conversation_sources
CREATE TABLE conversation_sources_new (
  id TEXT PRIMARY KEY,
  conversationId TEXT, -- Now nullable
  sourceId TEXT NOT NULL,
  messageId TEXT,
  projectId TEXT,
  createdAt INTEGER DEFAULT (unixepoch())
);

INSERT INTO conversation_sources_new (id, conversationId, sourceId, messageId, projectId, createdAt)
SELECT id, conversationId, sourceId, messageId, projectId, createdAt FROM conversation_sources;

DROP TABLE conversation_sources;
ALTER TABLE conversation_sources_new RENAME TO conversation_sources;

-- Recreate indexes
CREATE INDEX idx_conversation_sources_conversationId ON conversation_sources(conversationId);
CREATE INDEX idx_conversation_sources_sourceId ON conversation_sources(sourceId);
CREATE INDEX idx_conversation_sources_projectId ON conversation_sources(projectId);
