-- Add embeddings table for semantic search
-- Run: npx wrangler d1 execute simplychat --remote --file=./migrations/0001_add_embeddings.sql

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  messageId TEXT NOT NULL UNIQUE,
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  content TEXT NOT NULL,
  vector TEXT NOT NULL, -- JSON array of floats
  timestamp INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embedding_message ON embeddings(messageId);
CREATE INDEX IF NOT EXISTS idx_embedding_conversation ON embeddings(conversationId);
CREATE INDEX IF NOT EXISTS idx_embedding_user ON embeddings(userId);
