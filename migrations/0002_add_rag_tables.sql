-- Add RAG support tables

CREATE TABLE IF NOT EXISTS attachments_metadata (
  id TEXT PRIMARY KEY,
  messageId TEXT, -- Can be null initially (before message is created)
  userId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  r2Key TEXT NOT NULL,
  chunkCount INTEGER DEFAULT 0,
  processingStatus TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments_metadata(messageId);

CREATE TABLE IF NOT EXISTS file_chunks (
  id TEXT PRIMARY KEY,
  attachmentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  chunkIndex INTEGER NOT NULL,
  content TEXT NOT NULL,
  vector TEXT NOT NULL, -- JSON stringified number[]
  metadata TEXT, -- JSON: { pageNumber, totalPages, fileName }
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (attachmentId) REFERENCES attachments_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_chunks_attachment ON file_chunks(attachmentId);
CREATE INDEX IF NOT EXISTS idx_file_chunks_user ON file_chunks(userId);
