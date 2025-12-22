/**
 * Project-Based Learning Types
 * 
 * Core content model for Education Machine v2:
 * Course → Projects → Tasks → Submissions
 * 
 * Key principle: Every course is a sequence of PROJECTS with tangible deliverables,
 * not a textbook to read.
 */

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Types of tasks learners can complete
 */
export type TaskType = 
  | 'coding'      // Write code, run tests
  | 'design'      // Create mockups, wireframes (image upload)
  | 'writing'     // Write essays, documentation
  | 'quiz'        // Knowledge check (multiple choice)
  | 'reflection'  // Self-assessment prompts
  | 'research'    // Find and analyze sources

/**
 * Status of a task for a learner
 */
export type TaskStatus = 
  | 'locked'        // Prerequisites not met
  | 'available'     // Ready to start
  | 'in_progress'   // Started but not submitted
  | 'submitted'     // Awaiting evaluation
  | 'needs_revision'// Failed, can retry
  | 'passed'        // Successfully completed

/**
 * Status of a project for a learner
 */
export type ProjectStatus = 
  | 'locked'      // Prerequisites not met
  | 'available'   // Ready to start
  | 'in_progress' // At least one task started
  | 'completed'   // All tasks passed

// ============================================================================
// RUBRIC SYSTEM
// ============================================================================

/**
 * A single level within a rubric criterion
 */
export interface RubricLevel {
  score: number        // 0, 25, 50, 75, 100
  label: string        // "Needs Work", "Good", "Excellent"
  description: string  // Specific criteria for this level
}

/**
 * A criterion for evaluation
 */
export interface RubricCriterion {
  name: string           // e.g., "Code Quality"
  description: string    // What we're looking for
  weight: number         // 0-100, must sum to 100 across all criteria
  levels: RubricLevel[]  // Scoring levels
}

/**
 * Complete rubric for a task
 */
export interface TaskRubric {
  criteria: RubricCriterion[]
}

// ============================================================================
// TASK SUBMISSION & EVALUATION
// ============================================================================

/**
 * AI evaluation of a submission
 */
export interface TaskEvaluation {
  score: number                        // Overall score 0-100
  passed: boolean                      // Met passing threshold
  feedback: string                     // 2-3 sentence summary
  criteriaScores: Record<string, number>  // Per-criterion scores
  strengths: string[]                  // What they did well
  improvements: string[]               // What to fix
  suggestions: string[]                // Actionable next steps
  evaluatedAt: number                  // Timestamp
}

/**
 * A learner's submission for a task
 */
export interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  content: string          // Code, text, or file URL
  submittedAt: number
  evaluation?: TaskEvaluation
}

// ============================================================================
// TASK DEFINITION
// ============================================================================

/**
 * A single task within a project
 */
export interface ProjectTask {
  id: string
  projectId: string
  title: string
  description: string
  type: TaskType
  orderIndex: number
  estimatedMinutes: number
  
  // Task content
  instructions: string        // Detailed requirements (markdown)
  starterCode?: string        // For coding tasks
  resources?: string[]        // Links, references
  hints?: string[]            // Progressive hints (revealed one at a time)
  
  // Evaluation
  rubric: TaskRubric
  passingScore: number        // 0-100, typically 70
  
  // Status (per-user, set at runtime)
  status?: TaskStatus
  submission?: TaskSubmission
}

// ============================================================================
// PROJECT DEFINITION
// ============================================================================

/**
 * A hands-on project with multiple tasks
 */
export interface Project {
  id: string
  courseId: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  orderIndex: number
  estimatedHours: number
  
  // What you'll build
  deliverable: string         // "A working todo app with user auth"
  technologies?: string[]     // ["React", "TypeScript", "Supabase"]
  
  // Learning objectives
  objectives: string[]
  prerequisites?: string[]    // Other project IDs that must be completed first
  
  // Project structure
  tasks: ProjectTask[]
  
  // Status (per-user, set at runtime)
  status?: ProjectStatus
  progress?: number           // 0-100 based on passed tasks
  startedAt?: number
  completedAt?: number
}

// ============================================================================
// COURSE V2 DEFINITION
// ============================================================================

/**
 * Education Machine v2 Course
 * 
 * Key differences from v1:
 * - Projects instead of chapters
 * - Tangible deliverables
 * - Real evaluation
 * - Streak enforcement
 */
export interface CourseV2 {
  id: string
  userId: string
  title: string
  subtitle?: string
  description: string
  
  // Target outcome - the "2→6" promise
  outcome: string             // "Get hired as a junior frontend dev"
  skillLevel: {
    start: number             // Where learner starts (e.g., 2/10)
    target: number            // Where they'll be (e.g., 6/10)
  }
  
  // Project sequence
  projects: Project[]
  
  // Course metadata
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  totalHours: number
  technologies: string[]
  
  // Gamification that matters
  streakRequired: number      // Minimum days/week to stay on track (e.g., 5)
  
  // Community (Phase 3)
  cohortId?: string
  
  // Generation metadata
  createdAt: number
  updatedAt: number
}

// ============================================================================
// USER PROGRESS
// ============================================================================

/**
 * User's progress through a course
 */
export interface CourseV2Progress {
  courseId: string
  userId: string
  
  // Current position
  currentProjectId?: string
  currentTaskId?: string
  
  // Completion tracking
  projectProgress: Record<string, {
    status: ProjectStatus
    taskStatuses: Record<string, TaskStatus>
    startedAt?: number
    completedAt?: number
  }>
  
  // Submissions cache
  submissions: Record<string, TaskSubmission>  // taskId → submission
  
  // Streaks with enforcement
  streak: {
    currentStreak: number
    longestStreak: number
    lastActivityDate: string   // ISO date
    weeklyProgress: number[]   // Last 7 days activity [0,1,1,1,0,1,1]
  }
  
  // XP that matters (tied to real accomplishments)
  xp: number
  level: number
  
  // Badges (earned through actual achievements)
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    earnedAt: number
  }>
  
  // Time tracking
  totalTimeSpent: number      // minutes
  startedAt: number
  lastActivityAt: number
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to generate a new course
 */
export interface GenerateCourseRequest {
  prompt: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  targetOutcome?: string
  estimatedHours?: number
}

/**
 * Request to generate a project
 */
export interface GenerateProjectRequest {
  courseId: string
  courseTitle: string
  subject: string
  projectIndex: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  technologies?: string[]
}

/**
 * Request to evaluate a task submission
 */
export interface EvaluateTaskRequest {
  taskId: string
  taskTitle: string
  taskType: TaskType
  instructions: string
  rubric: TaskRubric
  submission: string
  passingScore: number
}

/**
 * Response from task evaluation
 */
export interface EvaluateTaskResponse {
  evaluation: TaskEvaluation
  xpEarned: number
  badgeEarned?: {
    id: string
    name: string
    description: string
    icon: string
  }
}

// ============================================================================
// COHORT TYPES (Phase 3)
// ============================================================================

/**
 * A cohort of learners taking a course together
 */
export interface Cohort {
  id: string
  courseId: string
  name: string
  startDate: string
  endDate?: string
  maxMembers: number
  memberCount: number
  createdAt: number
}

/**
 * A member of a cohort
 */
export interface CohortMember {
  id: string
  cohortId: string
  userId: string
  name: string
  image?: string
  role: 'learner' | 'mentor' | 'admin'
  progress: number
  streak: number
  xp: number
  joinedAt: number
}

// ============================================================================
// CERTIFICATE TYPES (Phase 4)
// ============================================================================

/**
 * A completion certificate
 */
export interface Certificate {
  id: string
  userId: string
  courseId: string
  title: string
  recipientName: string
  issuedAt: string
  verificationCode: string
  publicUrl: string
  
  // What was accomplished
  projectsCompleted: number
  totalHours: number
  finalScore: number
}
