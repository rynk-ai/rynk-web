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
  PiArrowCounterClockwise, 
  PiShuffle, 
  PiCaretLeft, 
  PiCaretRight,
  PiCheck,
  PiX,
  PiLightbulb,
  PiSpinner,
  PiSparkle,
  PiBrain,
  PiTrophy,
  PiLightning,
  PiStack,
  PiKeyboard,
} from "react-icons/pi";
import type { FlashcardMetadata, SurfaceState } from "@/lib/services/domain-types";
import { FlashcardCardSkeleton } from "@/components/surfaces/surface-skeletons";

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
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

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
  
  // Loading state - detect skeleton content or pending status (progressive loading)
  const isCardLoading = !currentCard || 
    isGenerating || 
    currentCard.back === 'Loading...' ||
    (currentCard as any).status === 'pending';  // Progressive loading - card not ready yet
  
  if (isCardLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <FlashcardCardSkeleton />
      </div>
    );
  }
  
  // Completion state
  if (reviewedCount >= totalCards && flashcardState?.completed) {
    const knownPercent = Math.round((knownCards.length / totalCards) * 100);
    
    return (
      <div className="max-w-lg mx-auto py-8">
        {/* Celebration Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-6 bg-card rounded-full border border-border/40 shadow-xl shadow-primary/5 mb-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 ring-4 ring-offset-4 ring-offset-card ring-primary/20">
              <PiTrophy className="h-10 w-10 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-3 font-display">Deck Complete!</h1>
          <p className="text-muted-foreground text-lg">{metadata.topic}</p>
        </div>
        
        {/* Stats Card */}
        <div className="bg-card border border-border/30 rounded-2xl p-8 mb-8 shadow-sm">
          {/* Score Ring */}
          <div className="flex justify-center mb-8">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  className="text-muted/20"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-out"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 64}`,
                    strokeDashoffset: `${2 * Math.PI * 64 * (1 - knownPercent / 100)}`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter">{knownPercent}%</span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-1">Mastered</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-5 rounded-xl bg-green-500/10 text-center border border-green-500/10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <PiCheck className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{knownCards.length}</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Known</div>
            </div>
            <div className="p-5 rounded-xl bg-red-500/10 text-center border border-red-500/10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <PiX className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{unknownCards.length}</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Need Review</div>
            </div>
          </div>
          
          {/* Performance Message */}
          <div className={cn(
            "text-center py-4 px-6 rounded-xl text-sm font-medium border",
            knownPercent >= 80 ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" : 
            knownPercent >= 60 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" : 
            "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
          )}>
            {knownPercent >= 80 ? "🌟 Excellent mastery! You've got this!" : 
             knownPercent >= 60 ? "👍 Good progress! Keep practicing." : 
             "📚 Keep studying! You're learning."}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={onRestartDeck} variant="outline" size="lg" className="gap-2 rounded-xl h-12 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95">
            <PiArrowCounterClockwise className="h-4 w-4" />
            Start Over
          </Button>
          {unknownCards.length > 0 && (
            <Button onClick={onShuffleCards} size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              <PiLightning className="h-4 w-4" />
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <PiBrain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{metadata.topic}</h1>
              <p className="text-xs text-muted-foreground font-medium">{metadata.description}</p>
            </div>
          </div>
          
          {/* Card Counter with Stack Visual */}
          <div className="flex items-center gap-2">
            <div className="relative scale-105 mr-1">
              {/* Stacked card effect */}
              <div className="absolute -top-0.5 -left-0.5 w-full h-full bg-muted/60 rounded border border-border/60" />
              <div className="absolute -top-1 -left-1 w-full h-full bg-muted/40 rounded border border-border/40" />
              <div className="relative flex items-center gap-1.5 bg-card border border-border/60 shadow-sm rounded-md px-2.5 py-1.5">
                <PiStack className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span className="text-sm font-bold">{currentIndex + 1}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">/ {totalCards}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted/60 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-6">
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 font-bold uppercase tracking-wide">
              <PiCheck className="h-3.5 w-3.5" /> {knownCards.length} known
            </span>
            <span className="text-xs text-red-500 flex items-center gap-1.5 font-bold uppercase tracking-wide">
              <PiX className="h-3.5 w-3.5" /> {unknownCards.length} reviewing
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            {remainingCards} remaining
          </span>
        </div>
      </div>
      
      {/* Flashcard with 3D Flip */}
      <div 
        className="perspective-1000 cursor-pointer mb-10 group"
        onClick={handleFlip}
        style={{ perspective: '1000px' }}
      >
        <div 
          className={cn(
            "relative w-full transition-all duration-500 ease-out",
            "aspect-[3/2]", // Better ratio for text content
            isFlipped && "[transform:rotateY(180deg)]",
            animatingMark === 'known' && "scale-95 opacity-50 translate-x-10 rotate-3",
            animatingMark === 'unknown' && "scale-95 opacity-50 -translate-x-10 -rotate-3",
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front of card */}
          <div 
            className={cn(
              "absolute inset-0 rounded-2xl p-8 md:p-12",
              "bg-card/80 backdrop-blur-sm",
              "border border-border/40 shadow-xl",
              "flex flex-col items-center justify-center",
              "group-hover:shadow-2xl group-hover:border-primary/20 transition-all group-hover:-translate-y-1",
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Difficulty Badge */}
            <div className={cn(
              "absolute top-6 right-6 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
              currentCard.difficulty === 'easy' && "bg-green-500/10 text-green-600 dark:text-green-400",
              currentCard.difficulty === 'hard' && "bg-red-500/10 text-red-500",
              currentCard.difficulty === 'medium' && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
            )}>
              {currentCard.difficulty}
            </div>
            
            {/* Card Number */}
            <div className="absolute top-6 left-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Card {currentIndex + 1}
            </div>
            
            <p className="text-2xl md:text-3xl font-medium text-center leading-relaxed px-4 font-display text-foreground selection:bg-primary/20">
              {currentCard.front}
            </p>
            
            <div className="absolute bottom-6 flex items-center gap-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
              <PiSparkle className="h-3.5 w-3.5" />
              <span>Tap or Space to flip</span>
            </div>
          </div>
          
          {/* Back of card */}
          <div 
            className={cn(
              "absolute inset-0 rounded-2xl p-8 md:p-12",
              "bg-primary/5 backdrop-blur-sm",
              "border border-primary/20 shadow-xl",
              "flex flex-col items-center justify-center",
            )}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-xl md:text-2xl font-medium text-center leading-relaxed px-4 text-foreground/90 font-display">
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>
      
      {/* Hint */}
      {currentCard.hints && currentCard.hints.length > 0 && !isFlipped && (
        <div className="mb-8 text-center min-h-[40px]">
          {showHint ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
              <PiLightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{currentCard.hints[0]}</span>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
              className="gap-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 rounded-lg group transition-all"
            >
              <PiLightbulb className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Show Hint
            </Button>
          )}
        </div>
      )}
      
      {/* Controls */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-border/40 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-12 w-12 rounded-xl border-border/50 hover:bg-muted"
            >
              <PiCaretLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= totalCards - 1}
              className="h-12 w-12 rounded-xl border-border/50 hover:bg-muted"
            >
              <PiCaretRight className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Know/Don't Know - Only show when flipped */}
          {isFlipped ? (
            <div className="flex gap-3 animate-in fade-in zoom-in duration-300">
              <Button 
                variant="outline" 
                onClick={() => handleMark(false)}
                className="gap-2 h-12 px-6 rounded-xl border-2 border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-600 transition-all active:scale-95 font-medium"
              >
                <PiX className="h-5 w-5" />
                <span>Missed</span>
                <kbd className="hidden sm:inline-flex ml-1.5 text-[10px] uppercase font-bold bg-background/50 px-1.5 py-0.5 rounded border border-red-500/20 opacity-70">1</kbd>
              </Button>
              <Button 
                onClick={() => handleMark(true)}
                className="gap-2 h-12 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 transition-all active:scale-95 font-medium border-0"
              >
                <PiCheck className="h-5 w-5" />
                <span>Got It!</span>
                <kbd className="hidden sm:inline-flex ml-1.5 text-[10px] uppercase font-bold bg-black/20 px-1.5 py-0.5 rounded opacity-70 border border-white/10">2</kbd>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground/60 italic font-medium px-4">
               Flip to rate
            </div>
          )}
          
          {/* Shuffle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onShuffleCards} 
            className="h-12 w-12 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
            title="Shuffle cards"
          >
            <PiShuffle className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 uppercase font-bold tracking-wide">
            <PiKeyboard className="h-3.5 w-3.5" />
            <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">←</kbd>
            <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">→</kbd>
            Navigate
          </span>
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 uppercase font-bold tracking-wide">
            <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">Space</kbd>
            Flip
          </span>
        </div>
      </div>
    </div>
  );
});

export default FlashcardSurface;
