CREATE TABLE accounts (
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

CREATE TABLE attachments_metadata (
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

CREATE TABLE "conversation_sources" (
  id TEXT PRIMARY KEY,
  conversationId TEXT, 
  sourceId TEXT NOT NULL,
  messageId TEXT,
  projectId TEXT,
  createdAt INTEGER DEFAULT (unixepoch())
);

CREATE TABLE conversations (
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
  surfaceStates TEXT, -- JSON object for adaptive surface states
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE embeddings (
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

CREATE TABLE file_chunks (
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

CREATE TABLE folder_conversations (
  folderId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  PRIMARY KEY (folderId, conversationId),
  FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE guest_attachments_metadata (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  guest_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES guest_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

CREATE TABLE guest_conversations (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  title TEXT,
  path TEXT,
  tags TEXT,
  is_pinned BOOLEAN DEFAULT 0,
  active_branch_id TEXT,
  branches TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

CREATE TABLE guest_folder_conversations (
  folder_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  PRIMARY KEY (folder_id, conversation_id),
  FOREIGN KEY (folder_id) REFERENCES guest_folders(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES guest_conversations(id) ON DELETE CASCADE
);

CREATE TABLE guest_folders (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

CREATE TABLE guest_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  parent_message_id TEXT,
  version_of TEXT,
  version_number INTEGER DEFAULT 1,
  branch_id TEXT,
  referenced_conversations TEXT,
  referenced_folders TEXT,
  reasoning_metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES guest_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

CREATE TABLE guest_sessions (
  guest_id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  credits_remaining INTEGER DEFAULT 5,
  message_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guest_sub_chats (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  quoted_text TEXT NOT NULL,
  source_message_content TEXT,
  messages TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES guest_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (source_message_id) REFERENCES guest_messages(id) ON DELETE CASCADE
);

CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  content TEXT NOT NULL,
  chunkIndex INTEGER,
  metadata TEXT, 
  FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE TABLE messages (
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
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, reasoning_content TEXT, reasoning_metadata TEXT, web_annotations TEXT, model_used TEXT,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE projects (
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

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE, 
  type TEXT NOT NULL, 
  name TEXT, 
  metadata TEXT, 
  createdAt INTEGER
);

CREATE TABLE sub_chats (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  sourceMessageId TEXT NOT NULL,
  quotedText TEXT NOT NULL,
  sourceMessageContent TEXT, -- Full content of the source message for context
  messages TEXT DEFAULT '[]', -- JSON array of {id, role, content, createdAt}
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, fullMessageContent TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sourceMessageId) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified DATETIME,
  image TEXT,
  credits INTEGER DEFAULT 10,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, subscriptionTier TEXT DEFAULT 'free', polarCustomerId TEXT, polarSubscriptionId TEXT, subscriptionStatus TEXT DEFAULT 'none', creditsResetAt DATETIME, carryoverCredits INTEGER DEFAULT 0);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires DATETIME NOT NULL,
  UNIQUE(identifier, token)
);

CREATE INDEX idx_attachments_message ON attachments_metadata(messageId);

CREATE INDEX idx_conversation_sources_conversationId ON conversation_sources(conversationId);

CREATE INDEX idx_conversation_sources_projectId ON conversation_sources(projectId);

CREATE INDEX idx_conversation_sources_sourceId ON conversation_sources(sourceId);

CREATE INDEX idx_embedding_conversation ON embeddings(conversationId);

CREATE INDEX idx_embedding_message ON embeddings(messageId);

CREATE INDEX idx_embedding_user ON embeddings(userId);

CREATE INDEX idx_file_chunks_attachment ON file_chunks(attachmentId);

CREATE INDEX idx_file_chunks_user ON file_chunks(userId);

CREATE INDEX idx_guest_attachments_guest ON guest_attachments_metadata(guest_id);

CREATE INDEX idx_guest_attachments_message ON guest_attachments_metadata(message_id);

CREATE INDEX idx_guest_conversation_guest ON guest_conversations(guest_id);

CREATE INDEX idx_guest_folder_conv ON guest_folder_conversations(folder_id);

CREATE INDEX idx_guest_folder_conv_conversation ON guest_folder_conversations(conversation_id);

CREATE INDEX idx_guest_folder_guest ON guest_folders(guest_id);

CREATE INDEX idx_guest_message_conversation ON guest_messages(conversation_id);

CREATE INDEX idx_guest_message_guest ON guest_messages(guest_id);

CREATE INDEX idx_guest_session_ip ON guest_sessions(ip_hash);

CREATE INDEX idx_guest_subchat_conversation ON guest_sub_chats(conversation_id);

CREATE INDEX idx_guest_subchat_source_message ON guest_sub_chats(source_message_id);

CREATE INDEX idx_knowledge_chunks_sourceId ON knowledge_chunks(sourceId);

CREATE INDEX idx_sources_hash ON sources(hash);

CREATE INDEX idx_subchat_conversation ON sub_chats(conversationId);

CREATE INDEX idx_subchat_source_message ON sub_chats(sourceMessageId);

