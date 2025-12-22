-- ============================================================================
-- Migration: Education Machine v2 - Project-Based Learning
-- Description: Adds tables for project-based learning model
-- Created: 2024-12-21
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

-- ============================================================================
-- Indexes for Education Machine v2
-- ============================================================================

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
