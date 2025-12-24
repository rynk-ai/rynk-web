/**
 * Quiz Surface - Premium Interactive Q&A Component
 * 
 * Features:
 * - Modern card design with glassmorphism
 * - Keyboard shortcuts (1-4, Enter to submit)
 * - Animated feedback for correct/incorrect
 * - Segmented progress bar
 * - Detailed results dashboard
 */

"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  PiCheckCircle, 
  PiXCircle, 
  PiCaretRight, 
  PiTrophy,
  PiArrowCounterClockwise,
  PiSpinner,
  PiSparkle,
  PiTarget,
  PiLightning,
  PiBrain,
  PiClock,
  PiArrowRight,
  PiKeyboard,
  PiQuestion,
  PiShareNetwork,
  PiXLogo,
  PiCopy,
} from "react-icons/pi";
import { toast } from "sonner";
import type { QuizMetadata, SurfaceState } from "@/lib/services/domain-types";
import { QuestionSkeleton } from "@/components/surfaces/surface-skeletons";

interface QuizSurfaceProps {
  metadata: QuizMetadata;
  surfaceState: SurfaceState;
  onAnswerQuestion: (questionIndex: number, answer: string | number) => void;
  onNextQuestion: () => void;
  onRestartQuiz: () => void;
  isGenerating?: boolean;
}

export const QuizSurface = memo(function QuizSurface({
  metadata,
  surfaceState,
  onAnswerQuestion,
  onNextQuestion,
  onRestartQuiz,
  isGenerating = false,
}: QuizSurfaceProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isStreaking, setIsStreaking] = useState(false);
  
  const quizState = surfaceState.quiz;
  const currentQuestionIndex = quizState?.currentQuestion ?? 0;
  const currentQuestion = metadata.questions[currentQuestionIndex];
  const isCompleted = quizState?.completed ?? false;
  const answers = quizState?.answers ?? {};
  
  // Calculate progress
  const totalQuestions = metadata.questions.length;
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input (though there are no inputs here yet)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (!showFeedback && currentQuestion?.options) {
        const key = parseInt(e.key);
        if (key >= 1 && key <= currentQuestion.options.length) {
          handleSelectAnswer(key - 1);
        } else if ((e.key === 'Enter' || e.key === ' ') && selectedAnswer !== null) {
          e.preventDefault();
          handleSubmitAnswer();
        }
      } else if (showFeedback) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, selectedAnswer, showFeedback]);

  // Handle answer selection
  const handleSelectAnswer = useCallback((answer: string | number) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  }, [showFeedback]);
  
  // Handle answer submission
  const handleSubmitAnswer = useCallback(() => {
    if (selectedAnswer === null) return;
    setShowFeedback(true);
    
    const isCorrect = typeof currentQuestion?.correctAnswer === 'number' 
      ? selectedAnswer === currentQuestion.correctAnswer
      : selectedAnswer === currentQuestion?.correctAnswer;
    
    if (isCorrect) {
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak >= 3) setIsStreaking(true);
        return newStreak;
      });
    } else {
      setStreak(0);
      setIsStreaking(false);
    }
    
    onAnswerQuestion(currentQuestionIndex, selectedAnswer);
  }, [currentQuestionIndex, selectedAnswer, currentQuestion, onAnswerQuestion]);
  
  // Handle next question
  const handleNextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    onNextQuestion();
  }, [onNextQuestion]);
  
  // Check if answer is correct (for display)
  const isCorrect = selectedAnswer !== null && 
    (typeof currentQuestion?.correctAnswer === 'number' 
      ? selectedAnswer === currentQuestion.correctAnswer
      : selectedAnswer === currentQuestion?.correctAnswer);
  
  // Completed view
  if (isCompleted && quizState) {
    const score = quizState.correctCount;
    const total = totalQuestions;
    const percentage = Math.round((score / total) * 100);
    const timeSpent = quizState.completedAt && quizState.startedAt 
      ? Math.round((quizState.completedAt - quizState.startedAt) / 1000 / 60) 
      : 0;
    
    return (
      <div className="max-w-xl mx-auto py-8 text-center">
        {/* Celebration Header */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center p-6 bg-card rounded-full border border-border/40 shadow-xl shadow-primary/5 mb-6 animate-in zoom-in duration-500">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-offset-4 ring-offset-card",
              percentage >= 80 ? "bg-yellow-500/10 ring-yellow-500/20" : 
              percentage >= 60 ? "bg-primary/10 ring-primary/20" : "bg-orange-500/10 ring-orange-500/20"
            )}>
              <PiTrophy className={cn(
                "h-12 w-12",
                percentage >= 80 ? "text-yellow-500" : 
                percentage >= 60 ? "text-primary" : "text-orange-500"
              )} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-3 font-display">Quiz Complete!</h1>
          <p className="text-muted-foreground text-lg">{metadata.topic}</p>
        </div>
        
        {/* Score Card */}
        <div className="bg-card border border-border/30 rounded-2xl p-8 mb-8 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Final Score</span>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-7xl font-black tracking-tighter text-foreground">{score}</span>
              <span className="text-3xl text-muted-foreground font-medium">/ {total}</span>
            </div>
            
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-8 max-w-sm">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  percentage >= 80 ? "bg-yellow-500" :
                  percentage >= 60 ? "bg-primary" :
                  "bg-orange-500"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/30">
            <div className="p-5 rounded-xl bg-muted/20 flex flex-col items-center border border-border/20">
              <div className="flex items-center gap-2 mb-1 text-green-600 dark:text-green-400">
                <PiCheckCircle className="h-5 w-5" />
                <span className="font-bold text-xl">{quizState.correctCount}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Correct</span>
            </div>
            <div className="p-5 rounded-xl bg-muted/20 flex flex-col items-center border border-border/20">
              <div className="flex items-center gap-2 mb-1 text-red-500">
                <PiXCircle className="h-5 w-5" />
                <span className="font-bold text-xl">{quizState.incorrectCount}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incorrect</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button onClick={onRestartQuiz} variant="outline" size="lg" className="rounded-xl h-12 px-6 gap-2 hover:bg-muted/50 transition-all hover:scale-105 active:scale-95">
            <PiArrowCounterClockwise className="h-4 w-4" />
            Retake Quiz
          </Button>
          
          {/* Share Buttons */}
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl h-12 px-4 gap-2 hover:bg-muted/50 transition-all hover:scale-105 active:scale-95"
            onClick={() => {
              const text = `🎯 I scored ${percentage}% (${score}/${total}) on the "${metadata.topic}" quiz! Can you beat my score?`;
              const url = window.location.href;
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                '_blank',
                'width=550,height=420'
              );
            }}
            title="Share on X"
          >
            <PiXLogo className="h-4 w-4" />
            Share
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl h-12 px-4 gap-2 hover:bg-muted/50 transition-all hover:scale-105 active:scale-95"
            onClick={() => {
              const text = `🎯 Quiz: ${metadata.topic}\n📊 Score: ${score}/${total} (${percentage}%)\n\nTake the quiz: ${window.location.href}`;
              navigator.clipboard.writeText(text);
              toast.success("Copied to clipboard!");
            }}
            title="Copy results"
          >
            <PiCopy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
  
  // Loading state - detect skeleton content or pending status (progressive loading)
  const isQuestionLoading = !currentQuestion || 
    isGenerating || 
    currentQuestion.question?.startsWith('Loading:') ||
    currentQuestion.options?.every((opt: string) => opt === 'Loading...') ||
    (currentQuestion as any).status === 'pending';  // Progressive loading - question not ready yet
  
  if (isQuestionLoading) {
    return <QuestionSkeleton />;
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
              <PiBrain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight mb-1">{metadata.topic}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className={cn(
                  "px-2 py-0.5 rounded-md uppercase tracking-wider text-[10px] font-bold",
                  metadata.difficulty === 'easy' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  metadata.difficulty === 'medium' && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                  metadata.difficulty === 'hard' && "bg-red-500/10 text-red-500"
                )}>
                  {metadata.difficulty}
                </span>
                <span>•</span>
                <span>{totalQuestions} Questions</span>
              </div>
            </div>
          </div>
          
          {/* Streak Indicator */}
          {streak > 1 && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-500",
              isStreaking 
                ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400 scale-105" 
                : "bg-muted border-border text-muted-foreground"
            )}>
              <PiLightning className={cn("h-4 w-4", isStreaking && "fill-orange-500 text-orange-500 animate-pulse")} />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
        </div>
        
        {/* Segmented Progress Bar */}
        <div className="flex gap-1.5 h-1.5 mb-2">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const isAnswered = answers.hasOwnProperty(i);
            const isCurrent = i === currentQuestionIndex;
            // Determine color based on previous answers if available
            // Note: In a real app we might track correct/incorrect per question index in history
            
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-300",
                  isCurrent ? "bg-primary scale-105 shadow-[0_0_8px_rgba(var(--primary),0.6)]" :
                  isAnswered ? "bg-primary/30" : "bg-muted"
                )}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-0.5 mt-2">
          <span>Start</span>
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>Finish</span>
        </div>
      </div>
      
      {/* Question Card */}
      <div className={cn(
        "relative bg-card border rounded-2xl p-6 md:p-10 mb-8 shadow-sm transition-all duration-300",
        showFeedback && isCorrect && "border-green-500/30 ring-1 ring-green-500/10",
        showFeedback && !isCorrect && "border-red-500/30 ring-1 ring-red-500/10"
      )}>
        <p className="text-xl md:text-2xl font-semibold mb-8 leading-relaxed selection:bg-primary/20 font-display text-foreground">
          {currentQuestion.question}
        </p>
        
        {/* Options */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = currentQuestion.correctAnswer === index;
              
              // Visual states
              const showCorrect = showFeedback && isCorrectOption;
              const showIncorrect = showFeedback && isSelected && !isCorrectOption;
              const isDimmed = showFeedback && !showCorrect && !showIncorrect;
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showFeedback}
                  className={cn(
                    "group relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                    "flex items-center gap-4 hover:shadow-md active:scale-[0.99]",
                    !showFeedback && !isSelected && "hover:border-primary/40 hover:bg-muted/30 border-muted",
                    isSelected && !showFeedback && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
                    showCorrect && "border-green-500 bg-green-500/10 ring-1 ring-green-500/20 z-10",
                    showIncorrect && "border-red-500 bg-red-500/10 ring-1 ring-red-500/20 z-10",
                    isDimmed && "opacity-50 grayscale border-border bg-muted/10 blur-[0.5px]",
                  )}
                >
                  {/* Keyboard hint / Status Icon */}
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all border shrink-0",
                    !showFeedback && !isSelected && "bg-background border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary",
                    isSelected && !showFeedback && "bg-primary text-primary-foreground border-primary",
                    showCorrect && "bg-green-500 text-white border-green-500",
                    showIncorrect && "bg-red-500 text-white border-red-500",
                    isDimmed && "bg-muted border-transparent text-muted-foreground/50",
                  )}>
                    {showCorrect ? <PiCheckCircle className="h-5 w-5" /> : 
                     showIncorrect ? <PiXCircle className="h-5 w-5" /> : 
                     <span className="font-mono text-xs">{index + 1}</span>}
                  </div>
                  
                  <span className={cn(
                    "flex-1 text-base font-medium",
                    isDimmed && "text-muted-foreground"
                  )}>
                    {option}
                  </span>
                  
                  {/* Selection Indicator Arrow */}
                  {isSelected && !showFeedback && (
                    <div className="absolute right-4 text-primary animate-in fade-in slide-in-from-left-2">
                       <PiArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Feedback & Navigation Area */}
      <div className="min-h-[140px]">
        {showFeedback ? (
          <div className={cn(
            "rounded-2xl p-6 border animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-sm",
            isCorrect 
              ? "bg-green-500/5 border-green-500/20" 
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2.5 rounded-full shrink-0 mt-0.5 shadow-sm",
                isCorrect ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {isCorrect ? <PiCheckCircle className="h-6 w-6" /> : <PiXCircle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <h3 className={cn("font-bold text-lg mb-1", isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  {isCorrect ? "That's correct!" : "Not quite right"}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 max-w-lg">
                  {currentQuestion.explanation}
                </p>
                <div className="flex items-center gap-4">
                  <Button onClick={handleNextQuestion} className={cn(
                    "gap-2 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 px-6 rounded-lg",
                    isCorrect 
                      ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" 
                      : "bg-primary hover:bg-primary/90 shadow-primary/20"
                  )}>
                    {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "See Results"}
                    <PiArrowRight className="h-4 w-4" />
                  </Button>
                  <div className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                     <PiKeyboard className="h-3.5 w-3.5" /> <span>Enter</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              size="lg"
              className={cn(
                "rounded-xl px-10 gap-2 transition-all duration-300 font-medium",
                selectedAnswer !== null ? "shadow-lg shadow-primary/25 translate-y-0 opacity-100" : "translate-y-2 opacity-50"
              )}
            >
              <span>Submit Answer</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Keyboard hints footer */}
      {!showFeedback && (
        <div className="hidden sm:flex justify-center mt-12 text-xs text-muted-foreground/40 gap-8">
          <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono text-[10px] text-foreground/70">1-4</kbd> Select</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono text-[10px] text-foreground/70">Enter</kbd> Submit</span>
        </div>
      )}
    </div>
  );
});

export default QuizSurface;
