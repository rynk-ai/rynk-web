-- ============================================================================
-- Migration: Surface Sub-Chats
-- Description: Adds table for subchat/deep-dive functionality in surfaces and learning pages
-- Created: 2024-12-22
-- ============================================================================

-- Surface Sub-Chats: For subchat in surfaces (Wiki, Research, etc.) and learning pages
-- This enables users to select text in surface content and start focused AI conversations
CREATE TABLE IF NOT EXISTS surface_sub_chats (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  
  -- Context identification (polymorphic)
  sourceType TEXT NOT NULL,           -- 'surface' | 'learning'
  sourceId TEXT NOT NULL,             -- surfaceId or courseId  
  sectionId TEXT,                     -- Specific section within source (e.g., 'section-1', 'chapter-0')
  
  -- The selected content
  quotedText TEXT NOT NULL,
  sourceContent TEXT,                 -- Full section content for context
  
  -- Subchat messages (same format as sub_chats table)
  messages TEXT DEFAULT '[]',         -- JSON array of {id, role, content, createdAt}
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Surface Sub-Chats
-- ============================================================================

-- Index for fetching all subchats for a given surface (sourceType + sourceId)
CREATE INDEX IF NOT EXISTS idx_surface_subchat_source ON surface_sub_chats(sourceType, sourceId);

-- Index for fetching all subchats by user
CREATE INDEX IF NOT EXISTS idx_surface_subchat_user ON surface_sub_chats(userId);

-- Index for fetching subchats within a specific section of a surface
CREATE INDEX IF NOT EXISTS idx_surface_subchat_section ON surface_sub_chats(sourceId, sectionId);
