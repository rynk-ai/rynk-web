-- Migration: Add shared_conversations table
-- Purpose: Enable public sharing of conversations

CREATE TABLE IF NOT EXISTS shared_conversations (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  title TEXT,
  isActive INTEGER DEFAULT 1,
  viewCount INTEGER DEFAULT 0,
  cloneCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shared_conv_user ON shared_conversations(userId);
CREATE INDEX IF NOT EXISTS idx_shared_conv_conversation ON shared_conversations(conversationId);
CREATE INDEX IF NOT EXISTS idx_shared_conv_active ON shared_conversations(isActive);
