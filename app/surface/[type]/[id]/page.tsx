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
import { ArrowLeft, Loader2, CheckCircle, MoreVertical, Trash2 } from "lucide-react";
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
import type { 
  SurfaceState, 
  SurfaceType, 
  LearningMetadata, 
  GuideMetadata, 
  QuizMetadata,
  ComparisonMetadata,
  FlashcardMetadata,
  TimelineMetadata 
} from "@/lib/services/domain-types";

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
      console.log('[SurfacePage] State saved');
    } catch (err) {
      console.error('[SurfacePage] Failed to save state:', err);
    } finally {
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {surfaceType === 'learning' ? 'Preparing your course...' : 
             surfaceType === 'quiz' ? 'Generating your quiz...' : 'Building your guide...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <p className="text-destructive font-medium">Something went wrong</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={handleBackToChat} variant="outline">
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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToChat}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>

          {/* Title and Progress */}
          <div className="flex-1 text-center">
            <h1 className="text-sm font-medium">
              {surfaceType === 'learning' ? '📚 Course' : 
               surfaceType === 'quiz' ? '🎯 Quiz' : '✅ Guide'}
            </h1>
            {isSaving && (
              <span className="text-[10px] text-muted-foreground">Saving...</span>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Surface
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Invalid surface type</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this surface?</DialogTitle>
            <DialogDescription>
              This will permanently delete your progress on this {surfaceType === 'learning' ? 'course' : 'guide'}. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSurface}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
