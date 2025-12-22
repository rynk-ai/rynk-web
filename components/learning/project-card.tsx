"use client";

import { 
  CheckCircle2, 
  Lock, 
  Play, 
  Clock,
  Target,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/lib/services/project-types";

/**
 * ProjectCard - Displays a project in the course view
 * 
 * Shows:
 * - Project title and deliverable
 * - Progress indicator
 * - Lock/unlock status
 * - Time estimate
 */

interface ProjectCardProps {
  project: Project;
  status: ProjectStatus;
  progress: number;  // 0-100
  onClick: () => void;
  isActive?: boolean;
}

export function ProjectCard({ 
  project, 
  status, 
  progress, 
  onClick,
  isActive 
}: ProjectCardProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "w-full text-left p-5 rounded-xl border-2 transition-all duration-200",
        isLocked && "opacity-60 cursor-not-allowed",
        isCompleted && "border-green-500/30 bg-green-500/5",
        isActive && !isCompleted && "border-primary bg-primary/5 shadow-lg",
        !isActive && !isCompleted && !isLocked && "border-border/40 hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
          isCompleted && "bg-green-500/20",
          isInProgress && "bg-primary/20",
          isLocked && "bg-secondary",
          !isCompleted && !isInProgress && !isLocked && "bg-secondary"
        )}>
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : isLocked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : isInProgress ? (
            <Play className="h-5 w-5 text-primary" />
          ) : (
            <Target className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-semibold line-clamp-1",
              isCompleted && "text-green-600 dark:text-green-400"
            )}>
              {project.title}
            </h3>
            {isCompleted && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                Completed
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            🎯 {project.deliverable}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {project.estimatedHours}h
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full capitalize",
              project.difficulty === "beginner" && "bg-green-500/10 text-green-600 dark:text-green-400",
              project.difficulty === "intermediate" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              project.difficulty === "advanced" && "bg-purple-500/10 text-purple-600 dark:text-purple-400"
            )}>
              {project.difficulty}
            </span>
            {project.tasks && (
              <span>
                {project.tasks.filter(t => t.status === "passed").length}/{project.tasks.length} tasks
              </span>
            )}
          </div>
        </div>
        
        {/* Arrow */}
        {!isLocked && (
          <ChevronRight className={cn(
            "h-5 w-5 text-muted-foreground shrink-0",
            isActive && "text-primary"
          )} />
        )}
      </div>
      
      {/* Progress Bar */}
      {(isInProgress || isCompleted) && (
        <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              isCompleted ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}

/**
 * ProjectList - List of projects in a course
 */

interface ProjectListProps {
  projects: Project[];
  projectProgress: Record<string, { status: ProjectStatus; progress: number }>;
  currentProjectId?: string;
  onSelectProject: (projectId: string) => void;
}

export function ProjectList({ 
  projects, 
  projectProgress, 
  currentProjectId,
  onSelectProject 
}: ProjectListProps) {
  return (
    <div className="space-y-3">
      {projects.map((project, idx) => {
        const progress = projectProgress[project.id] || { status: "locked" as ProjectStatus, progress: 0 };
        
        // First project should be available if no progress
        const status: ProjectStatus = idx === 0 && !projectProgress[project.id] 
          ? "available" 
          : progress.status;
        
        return (
          <ProjectCard
            key={project.id}
            project={project}
            status={status}
            progress={progress.progress}
            isActive={project.id === currentProjectId}
            onClick={() => onSelectProject(project.id)}
          />
        );
      })}
    </div>
  );
}
