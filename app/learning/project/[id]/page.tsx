"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Flame, 
  Zap, 
  Target,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/learning/project-card";
import { TaskEditor } from "@/components/learning/task-editor";
import { cn } from "@/lib/utils";
import type { Project, ProjectTask, TaskEvaluation, ProjectStatus } from "@/lib/services/project-types";

/**
 * ProjectCoursePage - New project-based learning experience
 * 
 * Features:
 * - Project list sidebar
 * - Task-by-task progression
 * - Real AI evaluation
 * - Progress tracking
 */

interface CourseV2Data {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  difficulty: string;
  projects: (Project & { 
    status: ProjectStatus;
    progress: number;
    completedTasks: number;
    totalTasks: number;
  })[];
  stats: {
    totalProjects: number;
    completedProjects: number;
    currentStreak: number;
    xp: number;
  };
}

export default function ProjectCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  // Load course data
  useEffect(() => {
    async function loadCourse() {
      try {
        const res = await fetch(`/api/learning/course-v2/${courseId}`);
        if (!res.ok) throw new Error('Failed to load course');
        const data: CourseV2Data = await res.json();
        setCourse(data);
        
        // Auto-select first available project
        if (data.projects.length > 0) {
          const firstAvailable = data.projects.find(
            (p: any) => p.status === 'available' || p.status === 'in_progress'
          ) || data.projects[0];
          setCurrentProjectId(firstAvailable.id);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  // Generate tasks when selecting a project that has no tasks
  const currentProject = course?.projects.find(p => p.id === currentProjectId);
  
  useEffect(() => {
    async function generateTasksIfNeeded() {
      if (!currentProject || !currentProjectId) return;
      if (currentProject.tasks && currentProject.tasks.length > 0) return;
      if (generatingTasks) return;
      
      setGeneratingTasks(true);
      try {
        const res = await fetch('/api/learning/generate-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: currentProjectId })
        });
        
        if (res.ok) {
          // Refresh course data to get new tasks
          const refreshRes = await fetch(`/api/learning/course-v2/${courseId}`);
          if (refreshRes.ok) {
            setCourse(await refreshRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to generate tasks:', err);
      } finally {
        setGeneratingTasks(false);
      }
    }
    
    generateTasksIfNeeded();
  }, [currentProjectId, currentProject?.tasks?.length]);

  const currentTask = currentProject?.tasks?.[currentTaskIndex] as ProjectTask | undefined;

  const handleSubmitTask = async (content: string) => {
    if (!currentTask) throw new Error('No task selected');
    
    const res = await fetch('/api/learning/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: currentTask.id,
        submission: content
      })
    });
    
    if (!res.ok) throw new Error('Evaluation failed');
    const result = await res.json();
    
    // Refresh course data to get updated progress
    const refreshRes = await fetch(`/api/learning/course-v2/${courseId}`);
    if (refreshRes.ok) {
      setCourse(await refreshRes.json());
    }
    
    return result as { evaluation: TaskEvaluation; xpEarned: number; passed: boolean };
  };

  const goToNextTask = () => {
    if (!currentProject?.tasks) return;
    if (currentTaskIndex < currentProject.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      // Move to next project
      const currentProjIdx = course?.projects.findIndex(p => p.id === currentProjectId) || 0;
      if (course && currentProjIdx < course.projects.length - 1) {
        setCurrentProjectId(course.projects[currentProjIdx + 1].id);
        setCurrentTaskIndex(0);
      }
    }
  };

  const goToPrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error || 'Course not found'}</p>
        <Button variant="outline" onClick={() => router.push('/learning')}>
          Back to Learning
        </Button>
      </div>
    );
  }

  // Build project progress map
  const projectProgress: Record<string, { status: ProjectStatus; progress: number }> = {};
  for (const p of course.projects) {
    projectProgress[p.id] = { status: p.status, progress: p.progress };
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "border-r border-border/40 bg-secondary/20 transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-80"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/learning')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="font-bold truncate">{course.title}</h1>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-border/40 grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Flame className="h-4 w-4" />
                <span className="font-bold">{course.stats.currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <Zap className="h-4 w-4" />
                <span className="font-bold">{course.stats.xp}</span>
              </div>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-bold">{course.stats.completedProjects}/{course.stats.totalProjects}</span>
              </div>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
          </div>
        )}

        {/* Project List */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            <ProjectList
              projects={course.projects}
              projectProgress={projectProgress}
              currentProjectId={currentProjectId || undefined}
              onSelectProject={(id) => {
                setCurrentProjectId(id);
                setCurrentTaskIndex(0);
              }}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentProject && (
          <>
            {/* Project Header */}
            <div className="p-6 border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Target className="h-4 w-4" />
                  Project {(course.projects.findIndex(p => p.id === currentProjectId) || 0) + 1} of {course.projects.length}
                </div>
                <h2 className="text-2xl font-bold mb-2">{currentProject.title}</h2>
                <p className="text-muted-foreground">{currentProject.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span>🎯 {currentProject.deliverable}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{currentProject.completedTasks}/{currentProject.totalTasks} tasks complete</span>
                </div>
              </div>
            </div>

            {/* Task Navigation */}
            {currentProject.tasks && currentProject.tasks.length > 0 && (
              <div className="border-b border-border/40 bg-secondary/20">
                <div className="max-w-3xl mx-auto px-6 flex items-center gap-2 py-3 overflow-x-auto">
                  {currentProject.tasks.map((task: any, idx: number) => (
                    <button
                      key={task.id}
                      onClick={() => setCurrentTaskIndex(idx)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                        idx === currentTaskIndex 
                          ? "bg-primary text-primary-foreground" 
                          : task.status === 'passed'
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {task.status === 'passed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Task {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Task Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6">
                {generatingTasks ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-lg font-medium">Preparing your tasks...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Creating hands-on challenges with rubrics and hints
                    </p>
                  </div>
                ) : currentTask ? (
                  <TaskEditor
                    task={currentTask}
                    onSubmit={handleSubmitTask}
                    initialContent={currentTask.submission?.content}
                    previousEvaluation={currentTask.submission as TaskEvaluation | undefined}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a task to get started</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                {currentTask && (
                  <div className="flex justify-between mt-8 pt-6 border-t border-border/40">
                    <Button
                      variant="outline"
                      onClick={goToPrevTask}
                      disabled={currentTaskIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous Task
                    </Button>
                    <Button
                      onClick={goToNextTask}
                      disabled={
                        currentTaskIndex === (currentProject.tasks?.length || 0) - 1 &&
                        (course.projects.findIndex(p => p.id === currentProjectId) || 0) === course.projects.length - 1
                      }
                    >
                      Next Task
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!currentProject && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a project to start learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
