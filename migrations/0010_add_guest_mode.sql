-- Migration: Add Guest Mode Tables
-- Migration Number: 0010
-- Date: 2025-12-08
-- Description: Adds guest mode support with 5 free messages for anonymous users

-- Guest mode tables for anonymous users
CREATE TABLE IF NOT EXISTS guest_sessions (
  guest_id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  credits_remaining INTEGER DEFAULT 5,
  message_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guest_conversations (
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

CREATE TABLE IF NOT EXISTS guest_messages (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES guest_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

-- Extended guest tables for full feature parity
CREATE TABLE IF NOT EXISTS guest_folders (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(guest_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guest_folder_conversations (
  folder_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  PRIMARY KEY (folder_id, conversation_id),
  FOREIGN KEY (folder_id) REFERENCES guest_folders(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES guest_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guest_sub_chats (
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

CREATE TABLE IF NOT EXISTS guest_attachments_metadata (
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

-- Indexes for guest tables
CREATE INDEX IF NOT EXISTS idx_guest_session_ip ON guest_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_guest_conversation_guest ON guest_conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_message_conversation ON guest_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_guest_message_guest ON guest_messages(guest_id);

-- Indexes for extended guest tables
CREATE INDEX IF NOT EXISTS idx_guest_folder_guest ON guest_folders(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_folder_conv ON guest_folder_conversations(folder_id);
CREATE INDEX IF NOT EXISTS idx_guest_folder_conv_conversation ON guest_folder_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_guest_subchat_conversation ON guest_sub_chats(conversation_id);
CREATE INDEX IF NOT EXISTS idx_guest_subchat_source_message ON guest_sub_chats(source_message_id);
CREATE INDEX IF NOT EXISTS idx_guest_attachments_message ON guest_attachments_metadata(message_id);
CREATE INDEX IF NOT EXISTS idx_guest_attachments_guest ON guest_attachments_metadata(guest_id);
