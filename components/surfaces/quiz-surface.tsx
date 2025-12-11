/**
 * Quiz Surface - Interactive Q&A Component
 * 
 * Features:
 * - Multiple choice and open-ended questions
 * - Progress tracking
 * - Immediate feedback with explanations
 * - Score summary
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Trophy,
  RotateCcw,
  Loader2 
} from "lucide-react";
import type { QuizMetadata, SurfaceState } from "@/lib/services/domain-types";

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
  
  const quizState = surfaceState.quiz;
  const currentQuestionIndex = quizState?.currentQuestion ?? 0;
  const currentQuestion = metadata.questions[currentQuestionIndex];
  const isCompleted = quizState?.completed ?? false;
  const answers = quizState?.answers ?? {};
  
  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = metadata.questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
  
  // Handle answer selection
  const handleSelectAnswer = (answer: string | number) => {
    if (showFeedback) return; // Already answered
    setSelectedAnswer(answer);
  };
  
  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    setShowFeedback(true);
    onAnswerQuestion(currentQuestionIndex, selectedAnswer);
  };
  
  // Handle next question
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    onNextQuestion();
  };
  
  // Check if answer is correct
  const isCorrect = selectedAnswer !== null && 
    (typeof currentQuestion?.correctAnswer === 'number' 
      ? selectedAnswer === currentQuestion.correctAnswer
      : selectedAnswer === currentQuestion?.correctAnswer);
  
  // Completed view
  if (isCompleted && quizState) {
    const score = quizState.correctCount;
    const total = totalQuestions;
    const percentage = Math.round((score / total) * 100);
    
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className={cn(
            "h-16 w-16 mx-auto mb-4",
            percentage >= 80 ? "text-yellow-500" : 
            percentage >= 60 ? "text-gray-400" : "text-orange-400"
          )} />
          <h1 className="text-2xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-muted-foreground">{metadata.topic}</p>
        </div>
        
        {/* Score Card */}
        <div className="bg-card border rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">
              {score}/{total}
            </div>
            <div className="text-lg text-muted-foreground">
              {percentage}% correct
            </div>
            <div className={cn(
              "mt-4 text-sm font-medium",
              percentage >= 80 ? "text-green-500" : 
              percentage >= 60 ? "text-yellow-500" : "text-red-500"
            )}>
              {percentage >= 80 ? "🎉 Excellent work!" : 
               percentage >= 60 ? "👍 Good effort!" : "📚 Keep learning!"}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onRestartQuiz} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </Button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (!currentQuestion || isGenerating) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">🎯 {metadata.topic}</h1>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {/* Question Card */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <p className="text-lg font-medium mb-6">{currentQuestion.question}</p>
        
        {/* Options */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = currentQuestion.correctAnswer === index;
              const showCorrect = showFeedback && isCorrectOption;
              const showIncorrect = showFeedback && isSelected && !isCorrectOption;
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-muted/50",
                    isSelected && !showFeedback && "border-primary bg-primary/10",
                    showCorrect && "border-green-500 bg-green-500/10",
                    showIncorrect && "border-red-500 bg-red-500/10",
                    showFeedback && !showCorrect && !showIncorrect && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                      "bg-muted",
                      isSelected && !showFeedback && "bg-primary text-primary-foreground",
                      showCorrect && "bg-green-500 text-white",
                      showIncorrect && "bg-red-500 text-white"
                    )}>
                      {showCorrect ? <CheckCircle className="h-4 w-4" /> : 
                       showIncorrect ? <XCircle className="h-4 w-4" /> : 
                       String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Feedback */}
        {showFeedback && (
          <div className={cn(
            "mt-6 p-4 rounded-lg",
            isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={cn(
                "font-medium",
                isCorrect ? "text-green-500" : "text-red-500"
              )}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!showFeedback ? (
          <Button 
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion} className="gap-2">
            {currentQuestionIndex < totalQuestions - 1 ? (
              <>
                Next Question
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              "See Results"
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

export default QuizSurface;
