/**
 * Guest Surface Page - Simplified Surface View for Guests
 * 
 * Route: /guest-surface/[type]/[id]
 * - type: 'wiki' or 'quiz' only (guest-allowed surfaces)
 * - id: conversationId
 * 
 * Simplified version without state persistence (guests use single session)
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  BookOpen, 
  Target,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizSurface } from "@/components/surfaces/quiz-surface";
import { WikiSurface } from "@/components/surfaces/wiki-surface";
import type { 
  SurfaceState, 
  SurfaceType,
  QuizMetadata,
  WikiMetadata 
} from "@/lib/services/domain-types";

// Only wiki and quiz are allowed for guests
const GUEST_ALLOWED_SURFACES = ['wiki', 'quiz'];

// Helper to get icon and label for surface type
const getSurfaceInfo = (type: string) => {
  switch (type) {
    case 'quiz': return { icon: Target, label: 'Quiz', color: 'text-pink-500' };
    case 'wiki': return { icon: BookOpen, label: 'Wiki', color: 'text-orange-500' };
    default: return { icon: BookOpen, label: 'Surface', color: 'text-primary' };
  }
};

export default function GuestSurfacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const surfaceType = params.type as SurfaceType;
  const conversationId = params.id as string;
  const queryFromUrl = searchParams.get('q') || "";

  const [surfaceState, setSurfaceState] = useState<SurfaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if surface type is allowed for guests
  useEffect(() => {
    if (!GUEST_ALLOWED_SURFACES.includes(surfaceType)) {
      setError(`${surfaceType} surfaces require signing in. Guests can only use Wiki and Quiz surfaces.`);
      setIsLoading(false);
    }
  }, [surfaceType]);

  // Load or generate surface on mount
  useEffect(() => {
    async function loadSurface() {
      if (!GUEST_ALLOWED_SURFACES.includes(surfaceType)) return;
      if (!queryFromUrl) {
        setError("No query provided");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`[GuestSurfacePage] Generating ${surfaceType} for: "${queryFromUrl.substring(0, 50)}..."`);
        
        // Call guest surface generate API
        const response = await fetch('/api/guest/surface/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryFromUrl,
            surfaceType,
            messageId: conversationId,
            conversationId,
          }),
        });

        if (response.status === 401) {
          throw new Error("Guest session expired. Please return to chat and try again.");
        }

        if (response.status === 402) {
          throw new Error("No credits remaining. Sign up for a free account to continue.");
        }

        if (response.status === 403) {
          const data = await response.json() as { message?: string };
          throw new Error(data.message || "This surface type is not available for guests.");
        }

        if (!response.ok) {
          throw new Error("Failed to generate surface");
        }
        
        const data = await response.json() as { 
          surfaceState?: SurfaceState;
          creditsRemaining?: number;
        };
        
        if (data.surfaceState) {
          setSurfaceState(data.surfaceState);
          // Clear URL param to prevent re-generation on refresh
          router.replace(`/guest-surface/${surfaceType}/${conversationId}`, { scroll: false });
        }
      } catch (err) {
        console.error('[GuestSurfacePage] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (conversationId && surfaceType && queryFromUrl) {
      loadSurface();
    }
  }, [conversationId, surfaceType, queryFromUrl, router]);

  // Back to guest chat
  const handleBackToChat = useCallback(() => {
    router.push(`/guest-chat?id=${conversationId}`);
  }, [router, conversationId]);

  // Quiz handlers (simplified - no persistence)
  const handleAnswerQuestion = useCallback((questionIndex: number, answer: string | number) => {
    if (!surfaceState?.metadata) return;

    const metadata = surfaceState.metadata as QuizMetadata;
    const question = metadata.questions[questionIndex];
    const isCorrect = question && answer === question.correctAnswer;

    const currentAnswers = surfaceState.quiz?.answers ?? {};
    const currentCorrect = surfaceState.quiz?.correctCount ?? 0;
    const currentIncorrect = surfaceState.quiz?.incorrectCount ?? 0;

    setSurfaceState(prev => ({
      ...prev!,
      quiz: {
        ...prev!.quiz!,
        currentQuestion: questionIndex,
        answers: { ...currentAnswers, [questionIndex]: answer },
        correctCount: isCorrect ? currentCorrect + 1 : currentCorrect,
        incorrectCount: !isCorrect ? currentIncorrect + 1 : currentIncorrect,
        startedAt: prev?.quiz?.startedAt ?? Date.now(),
      },
    }));
  }, [surfaceState]);

  const handleNextQuestion = useCallback(() => {
    if (!surfaceState?.quiz || !surfaceState.metadata) return;
    
    const metadata = surfaceState.metadata as QuizMetadata;
    const nextQuestion = (surfaceState.quiz.currentQuestion ?? 0) + 1;
    const isCompleted = nextQuestion >= metadata.questions.length;

    setSurfaceState(prev => ({
      ...prev!,
      quiz: {
        ...prev!.quiz!,
        currentQuestion: isCompleted ? prev!.quiz!.currentQuestion : nextQuestion,
        completed: isCompleted,
        completedAt: isCompleted ? Date.now() : undefined,
      },
    }));
  }, [surfaceState]);

  const handleRestartQuiz = useCallback(() => {
    if (!surfaceState) return;

    setSurfaceState(prev => ({
      ...prev!,
      quiz: {
        currentQuestion: 0,
        answers: {},
        correctCount: 0,
        incorrectCount: 0,
        completed: false,
        startedAt: Date.now(),
      },
    }));
  }, [surfaceState]);

  // Get Surface Info
  const surfaceInfo = getSurfaceInfo(surfaceType);
  const SurfaceIcon = surfaceInfo.icon;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
             <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">
            {surfaceType === 'quiz' ? 'Generating your quiz...' : 'Building wiki article...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="bg-card border rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-md shadow-lg">
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={handleBackToChat} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  // No surface state
  if (!surfaceState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No surface data found</p>
          <Button onClick={handleBackToChat} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-card/80 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToChat}
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Chat</span>
            </Button>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <SurfaceIcon className={`h-4 w-4 ${surfaceInfo.color}`} />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                {surfaceInfo.label}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-6 hidden md:block text-center">
             <h1 className="text-sm font-medium truncate opacity-90">
               {(surfaceState.metadata as any).title || (surfaceState.metadata as any).topic}
             </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Guest badge */}
            <div className="px-2.5 py-1 bg-secondary/50 rounded-full">
              <span className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">
                Guest
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Surface Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6 md:px-6">
        {surfaceType === 'wiki' && (
          <WikiSurface
            metadata={surfaceState.metadata as WikiMetadata}
          />
        )}

        {surfaceType === 'quiz' && (
          <QuizSurface
            metadata={surfaceState.metadata as QuizMetadata}
            surfaceState={surfaceState}
            onAnswerQuestion={handleAnswerQuestion}
            onNextQuestion={handleNextQuestion}
            onRestartQuiz={handleRestartQuiz}
          />
        )}
      </main>
    </div>
  );
}
