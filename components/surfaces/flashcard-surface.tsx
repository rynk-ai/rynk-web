/**
 * Flashcard Surface - Spaced Repetition Study Cards
 * 
 * Features:
 * - Flip cards to reveal answers
 * - Track known/unknown
 * - Progress through deck
 * - Shuffle and restart
 */

"use client";

import { memo, useState } from "react";
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
  Loader2
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
  
  const flashcardState = surfaceState.flashcard;
  const currentIndex = flashcardState?.currentCard ?? 0;
  const currentCard = metadata.cards[currentIndex];
  const knownCards = flashcardState?.knownCards ?? [];
  const unknownCards = flashcardState?.unknownCards ?? [];
  
  // Calculate progress
  const totalCards = metadata.cards.length;
  const reviewedCount = knownCards.length + unknownCards.length;
  const progressPercent = Math.round((reviewedCount / totalCards) * 100);
  
  // Handle flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setShowHint(false);
  };
  
  // Handle mark and advance
  const handleMark = (known: boolean) => {
    onMarkCard(currentIndex, known);
    setIsFlipped(false);
    setShowHint(false);
    onNextCard();
  };
  
  // Handle navigation
  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    onPrevCard();
  };
  
  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    onNextCard();
  };
  
  // Loading state
  if (!currentCard || isGenerating) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Completion state
  if (reviewedCount >= totalCards && flashcardState?.completed) {
    const knownPercent = Math.round((knownCards.length / totalCards) * 100);
    
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Deck Complete!</h2>
        <p className="text-muted-foreground mb-6">{metadata.topic}</p>
        
        <div className="bg-card border rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-500">{knownCards.length}</div>
              <div className="text-sm text-muted-foreground">Known</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-500">{unknownCards.length}</div>
              <div className="text-sm text-muted-foreground">Need Review</div>
            </div>
          </div>
          <div className="mt-4 text-lg">
            {knownPercent >= 80 ? "🌟 Excellent mastery!" : 
             knownPercent >= 60 ? "👍 Good progress!" : "📚 Keep studying!"}
          </div>
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button onClick={onRestartDeck} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
          {unknownCards.length > 0 && (
            <Button onClick={onShuffleCards} className="gap-2">
              Review Missed
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">🃏 {metadata.topic}</h1>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {totalCards}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="text-green-500">✓ {knownCards.length} known</span>
          <span className="text-red-500">✗ {unknownCards.length} reviewing</span>
        </div>
      </div>
      
      {/* Flashcard */}
      <div 
        className="perspective-1000 cursor-pointer mb-6"
        onClick={handleFlip}
      >
        <div className={cn(
          "relative w-full aspect-[3/2] transition-transform duration-500 transform-style-preserve-3d",
          isFlipped && "rotate-y-180"
        )}>
          {/* Front of card */}
          <div className={cn(
            "absolute inset-0 backface-hidden",
            "bg-card border-2 rounded-2xl p-8 flex flex-col items-center justify-center"
          )}>
            <div className={cn(
              "text-xs font-medium mb-4 px-2 py-1 rounded-full",
              currentCard.difficulty === 'easy' ? "bg-green-500/20 text-green-500" :
              currentCard.difficulty === 'hard' ? "bg-red-500/20 text-red-500" :
              "bg-yellow-500/20 text-yellow-500"
            )}>
              {currentCard.difficulty.toUpperCase()}
            </div>
            <p className="text-xl font-medium text-center">{currentCard.front}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
          </div>
          
          {/* Back of card */}
          <div className={cn(
            "absolute inset-0 backface-hidden rotate-y-180",
            "bg-primary/10 border-2 border-primary rounded-2xl p-8 flex flex-col items-center justify-center"
          )}>
            <p className="text-xl font-medium text-center">{currentCard.back}</p>
          </div>
        </div>
      </div>
      
      {/* Hint */}
      {currentCard.hints && currentCard.hints.length > 0 && !isFlipped && (
        <div className="mb-4 text-center">
          {showHint ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              💡 {currentCard.hints[0]}
            </p>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
              className="gap-1"
            >
              <Lightbulb className="h-4 w-4" />
              Show Hint
            </Button>
          )}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Navigation */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleNext}
            disabled={currentIndex >= totalCards - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Know/Don't Know */}
        {isFlipped && (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleMark(false)}
              className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
              Don&apos;t Know
            </Button>
            <Button 
              onClick={() => handleMark(true)}
              className="gap-2 bg-green-500 hover:bg-green-600"
            >
              <Check className="h-4 w-4" />
              Got It
            </Button>
          </div>
        )}
        
        {/* Shuffle */}
        <Button variant="ghost" size="icon" onClick={onShuffleCards}>
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default FlashcardSurface;
