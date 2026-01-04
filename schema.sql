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

-- Surface Sub-Chats: For subchat in surfaces (Wiki, Research, etc.) and learning pages
CREATE TABLE surface_sub_chats (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  
  -- Context identification (polymorphic)
  sourceType TEXT NOT NULL,           -- 'surface' | 'learning'
  sourceId TEXT NOT NULL,             -- surfaceId or courseId  
  sectionId TEXT,                     -- Specific section within source (e.g., 'section-1', 'chapter-0')
  
  -- The selected content
  quotedText TEXT NOT NULL,
  sourceContent TEXT,                 -- Full section content for context
  
  -- Subchat messages (same format as sub_chats)
  messages TEXT DEFAULT '[]',         -- JSON array of {id, role, content, createdAt}
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_surface_subchat_source ON surface_sub_chats(sourceType, sourceId);
CREATE INDEX idx_surface_subchat_user ON surface_sub_chats(userId);
CREATE INDEX idx_surface_subchat_section ON surface_sub_chats(sourceId, sectionId);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified DATETIME,
  image TEXT,
  credits INTEGER DEFAULT 100,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
, subscriptionTier TEXT DEFAULT 'free', polarCustomerId TEXT, polarSubscriptionId TEXT, subscriptionStatus TEXT DEFAULT 'none', creditsResetAt DATETIME, carryoverCredits INTEGER DEFAULT 0);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires DATETIME NOT NULL,
  UNIQUE(identifier, token)
);

CREATE TABLE shared_conversations (
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

-- Learning/Courses tables (Education Machine)
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  metadata TEXT NOT NULL, -- JSON: Full CourseMetadata object
  progress TEXT, -- JSON: CourseProgress object
  difficulty TEXT DEFAULT 'intermediate',
  totalEstimatedTime INTEGER DEFAULT 0,
  totalUnits INTEGER DEFAULT 0,
  totalChapters INTEGER DEFAULT 0,
  totalSections INTEGER DEFAULT 0,
  completedSections INTEGER DEFAULT 0,
  currentStreak INTEGER DEFAULT 0,
  longestStreak INTEGER DEFAULT 0,
  lastStreakDate TEXT,
  xp INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastAccessedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_courses_user ON courses(userId);
CREATE INDEX idx_courses_last_accessed ON courses(userId, lastAccessedAt DESC);

-- ============================================================================
-- Education Machine v2: Project-Based Learning
-- ============================================================================

-- Course Projects (replaces chapter/section model)
CREATE TABLE IF NOT EXISTS course_projects (
  id TEXT PRIMARY KEY,
  courseId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'intermediate',
  deliverable TEXT,              -- What you'll build
  technologies TEXT,             -- JSON array
  objectives TEXT,               -- JSON array
  prerequisites TEXT,            -- JSON array of project IDs
  estimatedHours INTEGER DEFAULT 2,
  orderIndex INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
);

-- Tasks within projects
CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,            -- 'coding' | 'design' | 'writing' | 'quiz' | 'reflection' | 'research'
  instructions TEXT,             -- Detailed requirements (markdown)
  starterCode TEXT,
  resources TEXT,                -- JSON array of URLs/references
  hints TEXT,                    -- JSON array of progressive hints
  rubric TEXT NOT NULL,          -- JSON: TaskRubric object
  passingScore INTEGER DEFAULT 70,
  estimatedMinutes INTEGER DEFAULT 30,
  orderIndex INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES course_projects(id) ON DELETE CASCADE
);

-- User task submissions
CREATE TABLE IF NOT EXISTS task_submissions (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  userId TEXT NOT NULL,
  content TEXT NOT NULL,         -- Code, essay, or file URL
  submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- AI Evaluation results
  score INTEGER,
  passed INTEGER DEFAULT 0,
  feedback TEXT,
  criteriaScores TEXT,           -- JSON: Record<string, number>
  strengths TEXT,                -- JSON array
  improvements TEXT,             -- JSON array
  suggestions TEXT,              -- JSON array
  evaluatedAt DATETIME,
  
  FOREIGN KEY (taskId) REFERENCES project_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- User progress per project
CREATE TABLE IF NOT EXISTS user_project_progress (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  projectId TEXT NOT NULL,
  status TEXT DEFAULT 'locked',  -- 'locked' | 'available' | 'in_progress' | 'completed'
  startedAt DATETIME,
  completedAt DATETIME,
  
  UNIQUE(userId, projectId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES course_projects(id) ON DELETE CASCADE
);

-- Cohorts for community features (Phase 3)
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  courseId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  startDate TEXT NOT NULL,
  endDate TEXT,
  maxMembers INTEGER DEFAULT 50,
  memberCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
);

-- Cohort members
CREATE TABLE IF NOT EXISTS cohort_members (
  id TEXT PRIMARY KEY,
  cohortId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT DEFAULT 'learner',   -- 'learner' | 'mentor' | 'admin'
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(cohortId, userId),
  FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Peer reviews
CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY,
  submissionId TEXT NOT NULL,
  reviewerId TEXT NOT NULL,
  score INTEGER,
  feedback TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (submissionId) REFERENCES task_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE CASCADE
);

-- Completion certificates (Phase 4)
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  courseId TEXT NOT NULL,
  title TEXT NOT NULL,
  recipientName TEXT NOT NULL,
  issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  verificationCode TEXT UNIQUE,
  publicUrl TEXT,
  projectsCompleted INTEGER DEFAULT 0,
  totalHours INTEGER DEFAULT 0,
  finalScore INTEGER DEFAULT 0,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
);

-- Indexes for Education Machine v2
CREATE INDEX IF NOT EXISTS idx_course_projects_course ON course_projects(courseId);
CREATE INDEX IF NOT EXISTS idx_course_projects_order ON course_projects(courseId, orderIndex);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(projectId);
CREATE INDEX IF NOT EXISTS idx_project_tasks_order ON project_tasks(projectId, orderIndex);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON task_submissions(taskId);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user ON task_submissions(userId);
CREATE INDEX IF NOT EXISTS idx_user_project_progress_user ON user_project_progress(userId);
CREATE INDEX IF NOT EXISTS idx_user_project_progress_project ON user_project_progress(projectId);
CREATE INDEX IF NOT EXISTS idx_cohorts_course ON cohorts(courseId);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohortId);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members(userId);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON peer_reviews(submissionId);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(userId);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(courseId);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON certificates(verificationCode);

-- Mobile Sessions (Sliding Refresh Token)
CREATE TABLE IF NOT EXISTS mobile_sessions (
  access_token TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  access_token_expires_at TEXT NOT NULL,
  refresh_token_expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mobile_sessions_user_id ON mobile_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_refresh_token ON mobile_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_access_expires ON mobile_sessions(access_token_expires_at);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_refresh_expires ON mobile_sessions(refresh_token_expires_at);
