
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
