/**
 * Flashcard Surface - Premium Spaced Repetition Study Cards
 * 
 * Features:
 * - Smooth 3D card flip animation with CSS transforms
 * - Glass-morphism card design
 * - Progress visualization with card stack
 * - Known/Unknown tracking with smooth transitions
 * - Keyboard navigation support
 */

"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  RotateCcw, 
  Shuffle, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X,
  Lightbulb,
  Loader2,
  Sparkles,
  Brain,
  Trophy,
  Zap,
  Layers,
  Keyboard,
} from "lucide-react";
import type { FlashcardMetadata, SurfaceState } from "@/lib/services/domain-types";

interface FlashcardSurfaceProps {
  metadata: FlashcardMetadata;
  surfaceState: SurfaceState;
  onMarkCard: (cardIndex: number, known: boolean) => void;
  onNextCard: () => void;
  onPrevCard: () => void;
  onShuffleCards: () => void;
  onRestartDeck: () => void;
  isGenerating?: boolean;
}

export const FlashcardSurface = memo(function FlashcardSurface({
  metadata,
  surfaceState,
  onMarkCard,
  onNextCard,
  onPrevCard,
  onShuffleCards,
  onRestartDeck,
  isGenerating = false,
}: FlashcardSurfaceProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [animatingMark, setAnimatingMark] = useState<'known' | 'unknown' | null>(null);
  
  const flashcardState = surfaceState.flashcard;
  const currentIndex = flashcardState?.currentCard ?? 0;
  const currentCard = metadata.cards[currentIndex];
  const knownCards = flashcardState?.knownCards ?? [];
  const unknownCards = flashcardState?.unknownCards ?? [];
  
  // Calculate progress
  const totalCards = metadata.cards.length;
  const reviewedCount = knownCards.length + unknownCards.length;
  const progressPercent = Math.round((reviewedCount / totalCards) * 100);
  const remainingCards = totalCards - reviewedCount;
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && currentIndex < totalCards - 1) {
        handleNext();
      } else if (e.key === '1' && isFlipped) {
        handleMark(false);
      } else if (e.key === '2' && isFlipped) {
        handleMark(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalCards, isFlipped]);
  
  // Handle flip
  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
    setShowHint(false);
  }, [isFlipped]);
  
  // Handle mark and advance with animation
  const handleMark = useCallback((known: boolean) => {
    setAnimatingMark(known ? 'known' : 'unknown');
    
    // Slight delay for visual feedback
    setTimeout(() => {
      onMarkCard(currentIndex, known);
      setIsFlipped(false);
      setShowHint(false);
      setAnimatingMark(null);
      onNextCard();
    }, 200);
  }, [currentIndex, onMarkCard, onNextCard]);
  
  // Handle navigation
  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    onPrevCard();
  }, [onPrevCard]);
  
  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    onNextCard();
  }, [onNextCard]);
  
  // Loading state
  if (!currentCard || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
        <p className="text-muted-foreground mt-6 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-500" />
          Generating flashcards...
        </p>
      </div>
    );
  }
  
  // Completion state
  if (reviewedCount >= totalCards && flashcardState?.completed) {
    const knownPercent = Math.round((knownCards.length / totalCards) * 100);
    
    return (
      <div className="max-w-lg mx-auto py-8">
        {/* Celebration Header */}
        <div className="relative text-center mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-cyan-500/20 to-teal-500/10 rounded-3xl blur-xl" />
          
          <div className="relative py-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 mb-6 shadow-xl shadow-teal-500/30">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Deck Complete!</h1>
            <p className="text-muted-foreground">{metadata.topic}</p>
          </div>
        </div>
        
        {/* Stats Card */}
        <div className="bg-card border-2 rounded-3xl p-8 mb-8 shadow-lg">
          {/* Score Ring */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  className="text-muted/20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  strokeLinecap="round"
                  className="text-green-500 transition-all duration-1000"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 56}`,
                    strokeDashoffset: `${2 * Math.PI * 56 * (1 - knownPercent / 100)}`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{knownPercent}%</span>
                <span className="text-xs text-muted-foreground">Mastered</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-green-500/10 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">{knownCards.length}</span>
              </div>
              <div className="text-sm text-muted-foreground">Known</div>
            </div>
            <div className="p-5 rounded-2xl bg-red-500/10 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <X className="h-5 w-5 text-red-500" />
                <span className="text-3xl font-bold text-red-600 dark:text-red-400">{unknownCards.length}</span>
              </div>
              <div className="text-sm text-muted-foreground">Need Review</div>
            </div>
          </div>
          
          {/* Performance Message */}
          <div className={cn(
            "text-center py-4 px-6 rounded-2xl text-sm font-medium",
            knownPercent >= 80 ? "bg-green-500/10 text-green-600 dark:text-green-400" : 
            knownPercent >= 60 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" : 
            "bg-orange-500/10 text-orange-600 dark:text-orange-400"
          )}>
            {knownPercent >= 80 ? "🌟 Excellent mastery! You've got this!" : 
             knownPercent >= 60 ? "👍 Good progress! Keep practicing." : 
             "📚 Keep studying! You're learning."}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onRestartDeck} variant="outline" size="lg" className="gap-2 rounded-xl h-12">
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
          {unknownCards.length > 0 && (
            <Button onClick={onShuffleCards} size="lg" className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl h-12 shadow-lg shadow-teal-500/30">
              <Zap className="h-4 w-4" />
              Review Missed ({unknownCards.length})
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-md">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{metadata.topic}</h1>
              <p className="text-xs text-muted-foreground">{metadata.description}</p>
            </div>
          </div>
          
          {/* Card Counter with Stack Visual */}
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* Stacked card effect */}
              <div className="absolute -top-0.5 -left-0.5 w-8 h-6 bg-muted/50 rounded border border-border/50" />
              <div className="absolute -top-1 -left-1 w-8 h-6 bg-muted/30 rounded border border-border/30" />
              <div className="relative flex items-center gap-1 bg-card border-2 rounded px-2 py-1">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-bold">{currentIndex + 1}</span>
                <span className="text-xs text-muted-foreground">/ {totalCards}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 font-medium">
              <Check className="h-4 w-4" /> {knownCards.length} known
            </span>
            <span className="text-sm text-red-500 flex items-center gap-1.5 font-medium">
              <X className="h-4 w-4" /> {unknownCards.length} reviewing
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {remainingCards} remaining
          </span>
        </div>
      </div>
      
      {/* Flashcard with 3D Flip */}
      <div 
        className="perspective-1000 cursor-pointer mb-8 group"
        onClick={handleFlip}
        style={{ perspective: '1000px' }}
      >
        <div 
          className={cn(
            "relative w-full transition-all duration-500 ease-out",
            "aspect-[3/2]", // Better ratio for text content
            isFlipped && "[transform:rotateY(180deg)]",
            animatingMark === 'known' && "scale-95 opacity-50",
            animatingMark === 'unknown' && "scale-95 opacity-50",
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front of card */}
          <div 
            className={cn(
              "absolute inset-0 rounded-3xl p-8",
              "bg-gradient-to-br from-card via-card to-muted/20",
              "border-2 border-border shadow-xl",
              "flex flex-col items-center justify-center",
              "group-hover:shadow-2xl group-hover:border-primary/20 transition-all",
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Difficulty Badge */}
            <div className={cn(
              "absolute top-5 right-5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide",
              currentCard.difficulty === 'easy' && "bg-green-500/15 text-green-600 dark:text-green-400",
              currentCard.difficulty === 'hard' && "bg-red-500/15 text-red-500",
              currentCard.difficulty === 'medium' && "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
            )}>
              {currentCard.difficulty}
            </div>
            
            {/* Card Number */}
            <div className="absolute top-5 left-5 text-xs text-muted-foreground font-medium">
              Card {currentIndex + 1}
            </div>
            
            <p className="text-2xl font-medium text-center leading-relaxed px-4">
              {currentCard.front}
            </p>
            
            <div className="absolute bottom-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tap or press Space to flip</span>
            </div>
          </div>
          
          {/* Back of card */}
          <div 
            className={cn(
              "absolute inset-0 rounded-3xl p-8",
              "bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-card",
              "border-2 border-teal-500/30 shadow-xl shadow-teal-500/10",
              "flex flex-col items-center justify-center",
            )}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-2xl font-medium text-center leading-relaxed px-4">
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>
      
      {/* Hint */}
      {currentCard.hints && currentCard.hints.length > 0 && !isFlipped && (
        <div className="mb-6 text-center">
          {showHint ? (
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">{currentCard.hints[0]}</span>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
              className="gap-2 text-muted-foreground hover:text-yellow-600"
            >
              <Lightbulb className="h-4 w-4" />
              Show Hint
            </Button>
          )}
        </div>
      )}
      
      {/* Controls */}
      <div className="bg-muted/30 rounded-2xl p-4 border">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-11 w-11 rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= totalCards - 1}
              className="h-11 w-11 rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Know/Don't Know - Only show when flipped */}
          {isFlipped && (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleMark(false)}
                className="gap-2 h-11 px-5 rounded-xl border-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/50"
              >
                <X className="h-4 w-4" />
                <span>Don&apos;t Know</span>
                <kbd className="hidden sm:inline-flex ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">1</kbd>
              </Button>
              <Button 
                onClick={() => handleMark(true)}
                className="gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md shadow-green-500/30"
              >
                <Check className="h-4 w-4" />
                <span>Got It!</span>
                <kbd className="hidden sm:inline-flex ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">2</kbd>
              </Button>
            </div>
          )}
          
          {/* Shuffle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onShuffleCards} 
            className="h-11 w-11 rounded-xl hover:bg-primary/10"
            title="Shuffle cards"
          >
            <Shuffle className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Keyboard className="h-3 w-3" />
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">←</kbd>
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">→</kbd>
            Navigate
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Space</kbd>
            Flip
          </span>
        </div>
      </div>
    </div>
  );
});

export default FlashcardSurface;
