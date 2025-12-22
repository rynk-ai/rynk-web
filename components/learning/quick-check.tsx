"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Quick Check Component
 * 
 * Renders inline knowledge checks after section content.
 * Supports multiple choice, true/false, and fill-in-blank questions.
 */

export interface QuickCheckQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

interface QuickCheckProps {
  questions: QuickCheckQuestion[];
  onComplete?: (results: { correct: number; total: number }) => void;
}

export function QuickCheck({ questions, onComplete }: QuickCheckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const userAnswer = answers[currentQuestion.id];
  const hasAnswered = showResults[currentQuestion.id] === true;
  
  const isCorrect = currentQuestion.type === 'fill_blank'
    ? String(userAnswer).toLowerCase().trim() === String(currentQuestion.correctAnswer).toLowerCase().trim()
    : userAnswer === currentQuestion.correctAnswer;

  const handleSelectOption = (optionIndex: number) => {
    if (hasAnswered) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleFillBlank = (value: string) => {
    if (hasAnswered) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleCheck = () => {
    setShowResults(prev => ({ ...prev, [currentQuestion.id]: true }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All questions completed
      setCompleted(true);
      const correctCount = questions.filter(q => {
        const ans = answers[q.id];
        if (q.type === 'fill_blank') {
          return String(ans).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
        }
        return ans === q.correctAnswer;
      }).length;
      onComplete?.({ correct: correctCount, total: questions.length });
    }
  };

  if (completed) {
    const correctCount = questions.filter(q => {
      const ans = answers[q.id];
      if (q.type === 'fill_blank') {
        return String(ans).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
      }
      return ans === q.correctAnswer;
    }).length;

    return (
      <div className="mt-8 p-6 rounded-xl bg-secondary/30 border border-border/40">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full",
            correctCount === questions.length ? "bg-green-500/10" : "bg-amber-500/10"
          )}>
            {correctCount === questions.length ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Lightbulb className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {correctCount === questions.length 
                ? "Perfect! All correct" 
                : `${correctCount}/${questions.length} correct`}
            </p>
            <p className="text-sm text-muted-foreground">
              Quick check completed
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 rounded-xl bg-secondary/30 border border-border/40">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Quick Check</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Question */}
      <p className="text-lg mb-4">{currentQuestion.question}</p>

      {/* Answer Options */}
      {currentQuestion.type === 'fill_blank' ? (
        <div className="mb-4">
          <input
            type="text"
            value={String(userAnswer || '')}
            onChange={(e) => handleFillBlank(e.target.value)}
            disabled={hasAnswered}
            placeholder="Type your answer..."
            className={cn(
              "w-full px-4 py-2 rounded-lg border bg-background text-foreground",
              hasAnswered && isCorrect && "border-green-500 bg-green-500/5",
              hasAnswered && !isCorrect && "border-red-500 bg-red-500/5"
            )}
          />
          {hasAnswered && !isCorrect && (
            <p className="text-sm text-muted-foreground mt-2">
              Correct answer: <span className="font-medium">{currentQuestion.correctAnswer}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {currentQuestion.options?.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={hasAnswered}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                userAnswer === idx && !hasAnswered && "border-primary bg-primary/5",
                hasAnswered && idx === currentQuestion.correctAnswer && "border-green-500 bg-green-500/5",
                hasAnswered && userAnswer === idx && idx !== currentQuestion.correctAnswer && "border-red-500 bg-red-500/5",
                !hasAnswered && userAnswer !== idx && "border-border/40 hover:border-primary/30 hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full border text-xs font-medium shrink-0",
                  userAnswer === idx && !hasAnswered && "border-primary text-primary",
                  hasAnswered && idx === currentQuestion.correctAnswer && "border-green-500 text-green-500 bg-green-500/10",
                  hasAnswered && userAnswer === idx && idx !== currentQuestion.correctAnswer && "border-red-500 text-red-500 bg-red-500/10"
                )}>
                  {hasAnswered && idx === currentQuestion.correctAnswer ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : hasAnswered && userAnswer === idx && idx !== currentQuestion.correctAnswer ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Explanation (shown after answering) */}
      {hasAnswered && (
        <div className={cn(
          "p-4 rounded-lg mb-4",
          isCorrect ? "bg-green-500/5 border border-green-500/20" : "bg-amber-500/5 border border-amber-500/20"
        )}>
          <div className="flex items-start gap-2">
            {isCorrect ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            )}
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {!hasAnswered ? (
          <Button
            onClick={handleCheck}
            disabled={userAnswer === undefined}
            size="sm"
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext} size="sm">
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question
                <ChevronDown className="h-4 w-4 ml-1 rotate-[-90deg]" />
              </>
            ) : (
              "Complete"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Collapsible wrapper for multiple quick checks
export function QuickCheckSection({ 
  questions,
  onComplete 
}: { 
  questions: QuickCheckQuestion[];
  onComplete?: (results: { correct: number; total: number }) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (questions.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Test Your Understanding
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>
      
      {isExpanded && (
        <QuickCheck questions={questions} onComplete={onComplete} />
      )}
    </div>
  );
}
