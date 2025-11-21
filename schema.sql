-- Auth.js Tables
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

-- Application Tables

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_conversation ON Message(conversationId);
CREATE INDEX IF NOT EXISTS idx_conversation_user ON Conversation(userId);
CREATE INDEX IF NOT EXISTS idx_conversation_project ON Conversation(projectId);
CREATE INDEX IF NOT EXISTS idx_folder_user ON Folder(userId);
CREATE INDEX IF NOT EXISTS idx_project_user ON Project(userId);
