PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified DATETIME,
  image TEXT,
  credits INTEGER DEFAULT 10,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);
CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS VerificationToken (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires DATETIME NOT NULL,
  UNIQUE(identifier, token)
);
CREATE TABLE IF NOT EXISTS Project (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  attachments TEXT, -- JSON array of file metadata
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Conversation (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  projectId TEXT,
  title TEXT,
  path TEXT, -- JSON array of message IDs
  tags TEXT, -- JSON array of strings
  isPinned BOOLEAN DEFAULT 0,
  activeBranchId TEXT,
  branches TEXT, -- JSON array of Branch objects
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS Folder (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS FolderConversation (
  folderId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  PRIMARY KEY (folderId, conversationId),
  FOREIGN KEY (folderId) REFERENCES Folder(id) ON DELETE CASCADE,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  attachments TEXT, -- JSON array of file metadata/URLs
  parentMessageId TEXT,
  versionOf TEXT,
  versionNumber INTEGER DEFAULT 1,
  branchId TEXT,
  referencedConversations TEXT, -- JSON
  referencedFolders TEXT, -- JSON
  timestamp INTEGER, -- Store original timestamp if needed, or use createdAt
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified DATETIME,
  image TEXT,
  credits INTEGER DEFAULT 10,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  oauth_token_secret TEXT,
  oauth_token TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires DATETIME NOT NULL,
  UNIQUE(identifier, token)
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  attachments TEXT, -- JSON array of file metadata
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  projectId TEXT,
  title TEXT,
  path TEXT, -- JSON array of message IDs
  tags TEXT, -- JSON array of strings
  isPinned BOOLEAN DEFAULT 0,
  activeBranchId TEXT,
  branches TEXT, -- JSON array of Branch objects
  activeReferencedConversations TEXT, -- JSON array for persistent context
  activeReferencedFolders TEXT, -- JSON array for persistent context
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS folder_conversations (
  folderId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  PRIMARY KEY (folderId, conversationId),
  FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  attachments TEXT, -- JSON array of file metadata/URLs
  parentMessageId TEXT,
  versionOf TEXT,
  versionNumber INTEGER DEFAULT 1,
  branchId TEXT,
  referencedConversations TEXT, -- JSON
  referencedFolders TEXT, -- JSON
  timestamp INTEGER, -- Store original timestamp if needed, or use createdAt
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);
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

-- Sub-chats for contextual side conversations
CREATE TABLE IF NOT EXISTS sub_chats (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  sourceMessageId TEXT NOT NULL,
  quotedText TEXT NOT NULL,
  sourceMessageContent TEXT, -- Full content of the source message for context
  messages TEXT DEFAULT '[]', -- JSON array of {id, role, content, createdAt}
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sourceMessageId) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS attachments_metadata (
  id TEXT PRIMARY KEY,
  messageId TEXT, 
  userId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  r2Key TEXT NOT NULL,
  chunkCount INTEGER DEFAULT 0,
  processingStatus TEXT DEFAULT 'pending', 
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS file_chunks (
  id TEXT PRIMARY KEY,
  attachmentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  chunkIndex INTEGER NOT NULL,
  content TEXT NOT NULL,
  vector TEXT NOT NULL, 
  metadata TEXT, 
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (attachmentId) REFERENCES attachments_metadata(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE, 
  type TEXT NOT NULL, 
  name TEXT, 
  metadata TEXT, 
  createdAt INTEGER
);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  content TEXT NOT NULL,
  chunkIndex INTEGER,
  metadata TEXT, 
  FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS conversation_sources (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  messageId TEXT, 
  createdAt INTEGER, projectId TEXT,
  FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
  
  
);
DELETE FROM sqlite_sequence;
CREATE INDEX IF NOT EXISTS idx_message_conversation ON Message(conversationId);
CREATE INDEX IF NOT EXISTS idx_conversation_user ON Conversation(userId);
CREATE INDEX IF NOT EXISTS idx_conversation_project ON Conversation(projectId);
CREATE INDEX IF NOT EXISTS idx_folder_user ON Folder(userId);
CREATE INDEX IF NOT EXISTS idx_project_user ON Project(userId);
CREATE INDEX IF NOT EXISTS idx_embedding_message ON embeddings(messageId);
CREATE INDEX IF NOT EXISTS idx_embedding_conversation ON embeddings(conversationId);
CREATE INDEX IF NOT EXISTS idx_embedding_user ON embeddings(userId);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments_metadata(messageId);
CREATE INDEX IF NOT EXISTS idx_file_chunks_attachment ON file_chunks(attachmentId);
CREATE INDEX IF NOT EXISTS idx_file_chunks_user ON file_chunks(userId);
CREATE INDEX IF NOT EXISTS idx_sources_hash ON sources(hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_sourceId ON knowledge_chunks(sourceId);
CREATE INDEX IF NOT EXISTS idx_conversation_sources_conversationId ON conversation_sources(conversationId);
CREATE INDEX IF NOT EXISTS idx_conversation_sources_messageId ON conversation_sources(messageId);
CREATE INDEX idx_conversation_sources_projectId
  ON conversation_sources(projectId) WHERE projectId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subchat_conversation ON sub_chats(conversationId);
CREATE INDEX IF NOT EXISTS idx_subchat_source_message ON sub_chats(sourceMessageId);
