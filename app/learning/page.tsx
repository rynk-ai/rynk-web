"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  PiGraduationCap, 
  PiPlus, 
  PiBookOpenText, 
  PiClock, 
  PiFire, 
  PiTrophy,
  PiCaretRight,
  PiSparkle,
  PiArrowRight,
  PiSpinner
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

/**
 * Learning Page - Education Machine
 * 
 * A dedicated section for structured learning, separate from chat surfaces.
 * Features:
 * - Create new courses from prompts
 * - View and continue existing courses
 * - Streak tracking and gamification
 */

interface UserCourse {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalChapters: number;
  completedChapters: number;
  lastAccessedAt: number;
  createdAt: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isV2?: boolean;  // Project-based course
  streak?: {
    currentStreak: number;
    lastActivityDate: string;
  };
}
// Featured course examples for empty state preview
const FEATURED_COURSES = [
  {
    title: "Master TypeScript",
    description: "From basics to advanced type systems",
    difficulty: "intermediate" as const,
    chapters: 8,
    icon: "💻",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Intro to Machine Learning",
    description: "Neural networks, training, and real-world applications",
    difficulty: "beginner" as const,
    chapters: 10,
    icon: "🤖",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Philosophy of Mind",
    description: "Consciousness, free will, and what makes us human",
    difficulty: "advanced" as const,
    chapters: 6,
    icon: "🧠",
    color: "from-amber-500/20 to-orange-500/20",
  },
];

// Empty state component  
function EmptyState({ onCreateCourse, onSelectSample }: { 
  onCreateCourse: () => void; 
  onSelectSample: (topic: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full" />
        <PiGraduationCap className="relative h-20 w-20 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Start Your Learning Journey</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Create AI-powered courses on any topic. Learn with structured content, 
        academic sources, quizzes, and track your progress.
      </p>
      
      <Button 
        size="lg" 
        onClick={onCreateCourse}
        className="gap-2"
      >
        <PiPlus className="h-5 w-5" />
        Create Your First Course
      </Button>
      
      {/* Featured Course Examples */}
      <div className="mt-12 w-full max-w-3xl">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Or try one of these examples
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_COURSES.map((course) => (
            <button
              key={course.title}
              onClick={() => onSelectSample(course.title)}
              className="group text-left p-4 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${course.color} flex items-center justify-center text-xl mb-3`}>
                {course.icon}
              </div>
              <h4 className="font-semibold group-hover:text-primary transition-colors mb-1">
                {course.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {course.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn(
                  "px-2 py-0.5 rounded-full capitalize",
                  course.difficulty === 'beginner' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  course.difficulty === 'intermediate' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  course.difficulty === 'advanced' && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                )}>
                  {course.difficulty}
                </span>
                <span className="flex items-center gap-1">
                  <PiBookOpenText className="h-3.5 w-3.5" />
                  ~{course.chapters} chapters
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl">
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
          <PiBookOpenText className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Academic Sources</h3>
          <p className="text-sm text-muted-foreground">
            Content backed by research from Semantic Scholar, Crossref, and more.
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
          <PiSparkle className="h-8 w-8 text-yellow-500 mb-3" />
          <h3 className="font-semibold mb-1">Interactive Learning</h3>
          <p className="text-sm text-muted-foreground">
            Quizzes, assignments, and hands-on exercises after each chapter.
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
          <PiFire className="h-8 w-8 text-orange-500 mb-3" />
          <h3 className="font-semibold mb-1">Streak Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Stay motivated with daily streaks and achievement badges.
          </p>
        </div>
      </div>
    </div>
  );
}

// Course card component
function CourseCard({ 
  course, 
  onClick 
}: { 
  course: UserCourse; 
  onClick: () => void;
}) {
  const difficultyColors = {
    beginner: 'bg-green-500/10 text-green-600 dark:text-green-400',
    intermediate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    advanced: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    expert: 'bg-red-500/10 text-red-600 dark:text-red-400'
  };
  
  return (
    <button
      onClick={onClick}
      className="group w-full text-left p-5 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {course.description}
          </p>
        </div>
        <PiCaretRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={cn("px-2 py-0.5 rounded-full capitalize", difficultyColors[course.difficulty])}>
          {course.difficulty}
        </span>
        <span className="flex items-center gap-1">
          <PiBookOpenText className="h-3.5 w-3.5" />
          {course.completedChapters}/{course.totalChapters} {course.isV2 ? 'projects' : 'chapters'}
        </span>
        {course.streak && course.streak.currentStreak > 0 && (
          <span className="flex items-center gap-1 text-orange-500">
            <PiFire className="h-3.5 w-3.5" />
            {course.streak.currentStreak} day streak
          </span>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
          style={{ width: `${course.progress}%` }}
        />
      </div>
    </button>
  );
}

// Create course input component
function CreateCourseInput({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };
  
  const suggestions = [
    "Learn Machine Learning from scratch",
    "Master TypeScript and React",
    "Introduction to Philosophy",
    "Understanding Quantum Physics",
    "History of Ancient Civilizations"
  ];
  
  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want to learn?"
            className="w-full px-5 py-4 pr-14 text-lg bg-secondary/50 border border-border/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!prompt.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
          >
            {isLoading ? (
              <PiSpinner className="h-5 w-5 animate-spin" />
            ) : (
              <PiArrowRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
      
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setPrompt(suggestion)}
            className="px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Learning Page Component
export default function LearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/learning");
    }
  }, [status, router]);
  
  // Load user's courses
  useEffect(() => {
    async function loadCourses() {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch("/api/learning/courses");
        if (response.ok) {
          const data = await response.json() as { courses?: UserCourse[] };
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error("Failed to load courses:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (session?.user?.id) {
      loadCourses();
    }
  }, [session?.user?.id]);
  
  // Handle course creation
  const handleCreateCourse = async (prompt: string) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/learning/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      
      if (response.ok) {
        const data = await response.json() as { 
          interpretations?: unknown[],
          analysis?: unknown 
        };
        // Navigate to interpretation selection page with analysis
        const params = new URLSearchParams({
          prompt,
          interpretations: JSON.stringify(data.interpretations),
          analysis: JSON.stringify(data.analysis)
        });
        router.push(`/learning/new?${params.toString()}`);
      }
    } catch (error) {
      console.error("Failed to interpret course:", error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle course selection - route to appropriate view based on course version
  const handleSelectCourse = (course: UserCourse) => {
    if (course.isV2) {
      router.push(`/learning/project/${course.id}`);
    } else {
      router.push(`/learning/${course.id}`);
    }
  };
  
  if (status === "loading" || isLoading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <PiSpinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SidebarInset>
      </>
    );
  }
  
  const hasActiveCourses = courses.length > 0;
  
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <PiGraduationCap className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">Learning</h1>
          </div>
          
          {hasActiveCourses && (
            <Button 
              onClick={() => setShowCreateInput(!showCreateInput)}
              variant={showCreateInput ? "secondary" : "default"}
              className="gap-2"
            >
              <PiPlus className="h-4 w-4" />
              New Course
            </Button>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Streak Banner (if active) */}
        {courses.some(c => c.streak && c.streak.currentStreak > 0) && (
          <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/20">
              <PiFire className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold">
                🔥 {Math.max(...courses.map(c => c.streak?.currentStreak || 0))} Day Streak!
              </p>
              <p className="text-sm text-muted-foreground">
                Keep learning daily to maintain your streak.
              </p>
            </div>
          </div>
        )}
        
        {/* Create Course Input (toggleable) */}
        {showCreateInput && (
          <div className="mb-8">
            <CreateCourseInput 
              onSubmit={handleCreateCourse} 
              isLoading={isCreating} 
            />
          </div>
        )}
        
        {/* Content */}
        {!hasActiveCourses ? (
          /* When user has no courses, show EmptyState or nothing (input is shown above via showCreateInput) */
          !showCreateInput && (
            <EmptyState 
              onCreateCourse={() => setShowCreateInput(true)} 
              onSelectSample={(topic) => {
                handleCreateCourse(topic);
              }}
            />
          )
        ) : (
          <>
            {/* In Progress Section */}
            {courses.filter(c => c.progress < 100).length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PiClock className="h-5 w-5 text-blue-500" />
                  In Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses
                    .filter(c => c.progress < 100)
                    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
                    .map(course => (
                      <CourseCard 
                        key={course.id} 
                        course={course} 
                        onClick={() => handleSelectCourse(course)}
                      />
                    ))}
                </div>
              </section>
            )}
            
            {/* Completed Section */}
            {courses.filter(c => c.progress === 100).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PiTrophy className="h-5 w-5 text-yellow-500" />
                  Completed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses
                    .filter(c => c.progress === 100)
                    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
                    .map(course => (
                      <CourseCard 
                        key={course.id} 
                        course={course} 
                        onClick={() => handleSelectCourse(course)}
                      />
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
        </div>
      </SidebarInset>
    </>
  );
}
