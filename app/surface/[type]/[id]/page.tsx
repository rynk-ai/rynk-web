/**
 * Surface Page - Full Page Takeover for Learning/Guide Surfaces
 * 
 * Route: /surface/[type]/[id]
 * - type: 'learning' or 'guide'
 * - id: conversationId
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  BookOpen, 
  ListChecks, 
  Target, 
  Scale, 
  Layers, 
  Calendar,
  Cloud,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LearningSurface } from "@/components/surfaces/learning-surface";
import { GuideSurface } from "@/components/surfaces/guide-surface";
import { QuizSurface } from "@/components/surfaces/quiz-surface";
import { ComparisonSurface } from "@/components/surfaces/comparison-surface";
import { FlashcardSurface } from "@/components/surfaces/flashcard-surface";
import { TimelineSurface } from "@/components/surfaces/timeline-surface";
import { WikiSurface } from "@/components/surfaces/wiki-surface";
import { cn } from "@/lib/utils";
import type { 
  SurfaceState, 
  SurfaceType, 
  LearningMetadata, 
  GuideMetadata, 
  QuizMetadata,
  ComparisonMetadata,
  FlashcardMetadata,
  TimelineMetadata,
  WikiMetadata 
} from "@/lib/services/domain-types";

// Helper to get icon and label for surface type
const getSurfaceInfo = (type: string) => {
  switch (type) {
    case 'learning': return { icon: BookOpen, label: 'Course', color: 'text-blue-500' };
    case 'guide': return { icon: ListChecks, label: 'Guide', color: 'text-green-500' };
    case 'quiz': return { icon: Target, label: 'Quiz', color: 'text-pink-500' };
    case 'comparison': return { icon: Scale, label: 'Comparison', color: 'text-indigo-500' };
    case 'flashcard': return { icon: Layers, label: 'Flashcards', color: 'text-teal-500' };
    case 'timeline': return { icon: Calendar, label: 'Timeline', color: 'text-amber-500' };
    case 'wiki': return { icon: BookOpen, label: 'Wiki', color: 'text-orange-500' };
    default: return { icon: BookOpen, label: 'Surface', color: 'text-primary' };
  }
};

export default function SurfacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const surfaceType = params.type as SurfaceType;
  const conversationId = params.id as string;
  // Get query from URL param (passed from SurfaceTrigger)
  const queryFromUrl = searchParams.get('q') || "";

  const [surfaceState, setSurfaceState] = useState<SurfaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string>("");
  const [isRestoredFromSaved, setIsRestoredFromSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Track if we need to save (after state changes)
  const pendingSaveRef = useRef(false);

  // Save surface state to API
  const saveState = useCallback(async (stateToSave: SurfaceState) => {
    if (!conversationId || !surfaceType) return;
    
    setIsSaving(true);
    try {
      await fetch('/api/surface/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          surfaceType,
          surfaceState: stateToSave,
        }),
      });
      // Small delay just to show the optimistic UI state
      setTimeout(() => setIsSaving(false), 800);
    } catch (err) {
      console.error('[SurfacePage] Failed to save state:', err);
      setIsSaving(false);
    }
  }, [conversationId, surfaceType]);

  // Load or generate surface on mount
  useEffect(() => {
    async function loadSurface() {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Try to load persisted state first
        const stateResponse = await fetch(
          `/api/surface/state?conversationId=${conversationId}&type=${surfaceType}`
        );
        
        if (stateResponse.ok) {
          const { found, surfaceState: savedState } = await stateResponse.json() as { found: boolean; surfaceState: SurfaceState | null };
          
          if (found && savedState) {
            console.log('[SurfacePage] Loaded persisted state');
            setSurfaceState(savedState);
            setOriginalQuery(queryFromUrl || "Restored session");
            setIsRestoredFromSaved(true);
            setIsLoading(false);
            return;
          }
        }

        // Step 2: No saved state, generate new
        const query = queryFromUrl || "General topic";
        setOriginalQuery(query);

        const response = await fetch('/api/surface/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            surfaceType,
            messageId: conversationId,
          }),
        });

        if (!response.ok) throw new Error("Failed to generate surface");
        
        const data = await response.json() as { surfaceState: SurfaceState };
        setSurfaceState(data.surfaceState);
        
        // Save generated state immediately
        await saveState(data.surfaceState);
      } catch (err) {
        console.error('[SurfacePage] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (conversationId && surfaceType) {
      loadSurface();
    }
  }, [conversationId, surfaceType, queryFromUrl, saveState]);

  // Back to chat
  const handleBackToChat = useCallback(() => {
    router.push(`/chat?id=${conversationId}`);
  }, [router, conversationId]);

  // Generate chapter content
  const handleGenerateChapter = useCallback(async (chapterIndex: number) => {
    if (!surfaceState) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'learning',
          action: 'generate_chapter',
          targetIndex: chapterIndex,
          surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate chapter");
      
      const data = await response.json() as { updatedState: SurfaceState };
      setSurfaceState(data.updatedState);
      // Save after generating
      await saveState(data.updatedState);
    } catch (err) {
      console.error('[SurfacePage] Error generating chapter:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [surfaceState, originalQuery, saveState]);

  // Mark chapter complete
  const handleMarkChapterComplete = useCallback((chapterIndex: number) => {
    if (!surfaceState?.learning) return;
    
    const completedChapters = [...(surfaceState.learning.completedChapters || [])];
    if (!completedChapters.includes(chapterIndex)) {
      completedChapters.push(chapterIndex);
    }

    const updatedState = {
      ...surfaceState,
      learning: {
        ...surfaceState.learning,
        completedChapters,
      },
    };
    setSurfaceState(updatedState);
    // Save after marking complete
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Generate step content
  const handleGenerateStep = useCallback(async (stepIndex: number) => {
    if (!surfaceState) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'guide',
          action: 'generate_step',
          targetIndex: stepIndex,
          surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate step");
      
      const data = await response.json() as { updatedState: SurfaceState };
      setSurfaceState(data.updatedState);
      // Save after generating
      await saveState(data.updatedState);
    } catch (err) {
      console.error('[SurfacePage] Error generating step:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [surfaceState, originalQuery, saveState]);

  // Mark step complete
  const handleMarkStepComplete = useCallback((stepIndex: number) => {
    if (!surfaceState?.guide) return;
    
    const completedSteps = [...(surfaceState.guide.completedSteps || [])];
    if (!completedSteps.includes(stepIndex)) {
      completedSteps.push(stepIndex);
    }

    const updatedState = {
      ...surfaceState,
      guide: {
        ...surfaceState.guide,
        completedSteps,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Skip step
  const handleSkipStep = useCallback((stepIndex: number) => {
    if (!surfaceState?.guide) return;
    
    const skippedSteps = [...(surfaceState.guide.skippedSteps || [])];
    if (!skippedSteps.includes(stepIndex)) {
      skippedSteps.push(stepIndex);
    }

    const updatedState = {
      ...surfaceState,
      guide: {
        ...surfaceState.guide,
        skippedSteps,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Answer question
  const handleAnswerQuestion = useCallback((questionIndex: number, answer: string | number) => {
    if (!surfaceState?.quiz) {
      // Initialize quiz state if not present
      const initialQuizState = {
        currentQuestion: 0,
        answers: {},
        correctCount: 0,
        incorrectCount: 0,
        completed: false,
        startedAt: Date.now(),
      };
      const updatedState = {
        ...surfaceState!,
        quiz: initialQuizState,
      };
      setSurfaceState(updatedState);
    }

    const metadata = surfaceState?.metadata as QuizMetadata | undefined;
    const question = metadata?.questions[questionIndex];
    const isCorrect = question && (
      typeof question.correctAnswer === 'number' 
        ? answer === question.correctAnswer
        : answer === question.correctAnswer
    );

    const currentAnswers = surfaceState?.quiz?.answers ?? {};
    const currentCorrect = surfaceState?.quiz?.correctCount ?? 0;
    const currentIncorrect = surfaceState?.quiz?.incorrectCount ?? 0;

    const updatedState = {
      ...surfaceState!,
      quiz: {
        ...surfaceState!.quiz!,
        currentQuestion: questionIndex,
        answers: { ...currentAnswers, [questionIndex]: answer },
        correctCount: isCorrect ? currentCorrect + 1 : currentCorrect,
        incorrectCount: !isCorrect ? currentIncorrect + 1 : currentIncorrect,
        startedAt: surfaceState?.quiz?.startedAt ?? Date.now(),
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Next question
  const handleNextQuestion = useCallback(() => {
    if (!surfaceState?.quiz || !surfaceState.metadata) return;
    
    const metadata = surfaceState.metadata as QuizMetadata;
    const nextQuestion = (surfaceState.quiz.currentQuestion ?? 0) + 1;
    const isCompleted = nextQuestion >= metadata.questions.length;

    const updatedState = {
      ...surfaceState,
      quiz: {
        ...surfaceState.quiz,
        currentQuestion: isCompleted ? surfaceState.quiz.currentQuestion : nextQuestion,
        completed: isCompleted,
        completedAt: isCompleted ? Date.now() : undefined,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Restart
  const handleRestartQuiz = useCallback(() => {
    if (!surfaceState) return;

    const resetState = {
      ...surfaceState,
      quiz: {
        currentQuestion: 0,
        answers: {},
        correctCount: 0,
        incorrectCount: 0,
        completed: false,
        startedAt: Date.now(),
      },
    };
    setSurfaceState(resetState);
    saveState(resetState);
  }, [surfaceState, saveState]);

  // Flashcard: Mark card as known/unknown
  const handleMarkFlashcard = useCallback((cardIndex: number, known: boolean) => {
    if (!surfaceState) return;
    
    const flashcardState = surfaceState.flashcard ?? {
      currentCard: 0,
      knownCards: [],
      unknownCards: [],
      completed: false,
    };
    
    const knownCards = [...flashcardState.knownCards];
    const unknownCards = [...flashcardState.unknownCards];
    
    // Remove from both arrays first, then add to appropriate one
    const knownIdx = knownCards.indexOf(cardIndex);
    if (knownIdx > -1) knownCards.splice(knownIdx, 1);
    const unknownIdx = unknownCards.indexOf(cardIndex);
    if (unknownIdx > -1) unknownCards.splice(unknownIdx, 1);
    
    if (known) {
      knownCards.push(cardIndex);
    } else {
      unknownCards.push(cardIndex);
    }
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    const completed = (knownCards.length + unknownCards.length) >= totalCards;
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...flashcardState,
        knownCards,
        unknownCards,
        completed,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Flashcard: Next card
  const handleNextFlashcard = useCallback(() => {
    if (!surfaceState?.flashcard) return;
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    const nextCard = Math.min((surfaceState.flashcard.currentCard ?? 0) + 1, totalCards - 1);
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...surfaceState.flashcard,
        currentCard: nextCard,
      },
    };
    setSurfaceState(updatedState);
  }, [surfaceState]);

  // Flashcard: Previous card
  const handlePrevFlashcard = useCallback(() => {
    if (!surfaceState?.flashcard) return;
    
    const prevCard = Math.max((surfaceState.flashcard.currentCard ?? 0) - 1, 0);
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...surfaceState.flashcard,
        currentCard: prevCard,
      },
    };
    setSurfaceState(updatedState);
  }, [surfaceState]);

  // Flashcard: Shuffle cards
  const handleShuffleFlashcards = useCallback(() => {
    if (!surfaceState) return;
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    
    // Create shuffled order
    const order = Array.from({ length: totalCards }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        currentCard: 0,
        knownCards: surfaceState.flashcard?.knownCards ?? [],
        unknownCards: surfaceState.flashcard?.unknownCards ?? [],
        completed: surfaceState.flashcard?.completed ?? false,
        shuffleOrder: order,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Flashcard: Restart deck
  const handleRestartFlashcards = useCallback(() => {
    if (!surfaceState) return;
    
    const resetState = {
      ...surfaceState,
      flashcard: {
        currentCard: 0,
        knownCards: [],
        unknownCards: [],
        completed: false,
        shuffleOrder: undefined,
      },
    };
    setSurfaceState(resetState);
    saveState(resetState);
  }, [surfaceState, saveState]);

  // Delete surface
  const handleDeleteSurface = useCallback(async () => {
    if (!conversationId || !surfaceType) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/surface/state?conversationId=${conversationId}&type=${surfaceType}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) throw new Error('Failed to delete surface');
      
      // Navigate back to chat after deletion
      router.push(`/chat?id=${conversationId}`);
    } catch (err) {
      console.error('[SurfacePage] Error deleting surface:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [conversationId, surfaceType, router]);

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
            {surfaceType === 'learning' ? 'Preparing your course...' : 
             surfaceType === 'quiz' ? 'Generating your quiz...' : 
             surfaceType === 'flashcard' ? 'Shuffling deck...' : 'Building surface...'}
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
            <Trash2 className="h-6 w-6 text-red-500" />
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
      {/* Clean Header */}
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
              <SurfaceIcon className="h-4 w-4 text-muted-foreground" />
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
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 mr-2 px-2.5 py-1 bg-secondary/50 rounded-full">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">Saving</span>
                </>
              ) : (
                <>
                   <CheckCircle2 className="h-3 w-3 text-green-500" />
                   <span className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">Saved</span>
                </>
              )}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer group"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Delete Surface
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-6xl mx-auto px-4 md:px-6 py-8">
        {surfaceType === 'learning' && surfaceState.metadata?.type === 'learning' ? (
          <LearningSurface
            metadata={surfaceState.metadata as LearningMetadata}
            surfaceState={surfaceState}
            onGenerateChapter={handleGenerateChapter}
            onMarkComplete={handleMarkChapterComplete}
            isGenerating={isGenerating}
          />
        ) : surfaceType === 'guide' && surfaceState.metadata?.type === 'guide' ? (
          <GuideSurface
            metadata={surfaceState.metadata as GuideMetadata}
            surfaceState={surfaceState}
            onGenerateStep={handleGenerateStep}
            onMarkComplete={handleMarkStepComplete}
            onSkipStep={handleSkipStep}
            isGenerating={isGenerating}
          />
        ) : surfaceType === 'quiz' && surfaceState.metadata?.type === 'quiz' ? (
          <QuizSurface
            metadata={surfaceState.metadata as QuizMetadata}
            surfaceState={surfaceState}
            onAnswerQuestion={handleAnswerQuestion}
            onNextQuestion={handleNextQuestion}
            onRestartQuiz={handleRestartQuiz}
            isGenerating={isGenerating}
          />
        ) : surfaceType === 'comparison' && surfaceState.metadata?.type === 'comparison' ? (
          <ComparisonSurface
            metadata={surfaceState.metadata as ComparisonMetadata}
          />
        ) : surfaceType === 'flashcard' && surfaceState.metadata?.type === 'flashcard' ? (
          <FlashcardSurface
            metadata={surfaceState.metadata as FlashcardMetadata}
            surfaceState={surfaceState}
            onMarkCard={handleMarkFlashcard}
            onNextCard={handleNextFlashcard}
            onPrevCard={handlePrevFlashcard}
            onShuffleCards={handleShuffleFlashcards}
            onRestartDeck={handleRestartFlashcards}
            isGenerating={isGenerating}
          />
        ) : surfaceType === 'timeline' && surfaceState.metadata?.type === 'timeline' ? (
          <TimelineSurface
            metadata={surfaceState.metadata as TimelineMetadata}
          />
        ) : surfaceType === 'wiki' && surfaceState.metadata?.type === 'wiki' ? (
          <WikiSurface
            metadata={surfaceState.metadata as WikiMetadata}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Cloud className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Surface Not Found</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">
              This surface type doesn't exist or hasn't been implemented yet.
            </p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this surface?</DialogTitle>
            <DialogDescription className="pt-2">
              This will permanently delete your progress on this <strong className="text-foreground">{surfaceInfo.label.toLowerCase()}</strong>. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSurface}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
