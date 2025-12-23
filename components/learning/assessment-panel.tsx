"use client";

import { useState } from "react";
import { PiCheckCircle, PiXCircle, PiArrowRight, PiLightbulb, PiCode, PiPaperPlaneTilt, PiSparkle } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AssessmentPanel - UI for taking chapter assessments (quiz, short answer, coding)
 */

export interface QuizQuestion {
  id: string;
  type: "multiple_choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ShortAnswerQuestion {
  id: string;
  type: "short_answer";
  question: string;
  sampleAnswer: string;
  keyPoints: string[];
}

export interface CodingChallenge {
  id: string;
  type: "coding";
  title: string;
  description: string;
  starterCode: string;
  hints: string[];
}

export type AssessmentQuestion = QuizQuestion | ShortAnswerQuestion | CodingChallenge;

export interface Assessment {
  id: string;
  chapterId: string;
  type: "quiz" | "short_answer" | "coding" | "mixed";
  questions: AssessmentQuestion[];
  passingScore: number;
  xpReward: number;
}

interface AssessmentPanelProps {
  assessment: Assessment;
  onComplete: (score: number, passed: boolean) => void;
  onSkip: () => void;
}

export function AssessmentPanel({ assessment, onComplete, onSkip }: AssessmentPanelProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  
  const question = assessment.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;
  
  const handleQuizAnswer = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [question.id]: optionIndex }));
  };
  
  const handleTextAnswer = (text: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: text }));
  };
  
  const handleNext = () => {
    if (isLastQuestion) {
      setShowResults(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(null);
    }
  };
  
  const calculateScore = () => {
    let correct = 0;
    for (const q of assessment.questions) {
      if (q.type === "multiple_choice") {
        if (answers[q.id] === q.correctIndex) correct++;
      } else {
        // For short answer and coding, give credit for any answer
        if (answers[q.id]) correct += 0.5;
      }
    }
    return Math.round((correct / assessment.questions.length) * 100);
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score >= assessment.passingScore;
    
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border/40">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
            passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {passed ? (
              <PiCheckCircle className="h-10 w-10 text-green-500" />
            ) : (
              <PiXCircle className="h-10 w-10 text-red-500" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold">
            {passed ? "Great job!" : "Keep learning!"}
          </h2>
          
          <p className="text-4xl font-bold">
            {score}%
          </p>
          
          <p className="text-muted-foreground">
            {passed 
              ? `You passed! You earned ${assessment.xpReward} XP.`
              : `You need ${assessment.passingScore}% to pass. Review the material and try again.`
            }
          </p>
          
          {passed && (
            <div className="flex items-center justify-center gap-2 text-green-500 animate-bounce mt-4">
              <PiSparkle className="h-5 w-5" />
              <span className="font-bold">+{assessment.xpReward} XP</span>
            </div>
          )}
          
          <Button 
            onClick={() => onComplete(score, passed)}
            className="mt-6"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border/40">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {assessment.questions.length}
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip Assessment
        </Button>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((currentQuestionIndex + 1) / assessment.questions.length) * 100}%` }}
        />
      </div>
      
      {/* Question content */}
      {question.type === "multiple_choice" && (
        <QuizQuestionUI 
          question={question}
          selectedIndex={answers[question.id] as number | undefined}
          onSelect={handleQuizAnswer}
          showExplanation={showExplanation === question.id}
        />
      )}
      
      {question.type === "short_answer" && (
        <ShortAnswerUI
          question={question}
          answer={answers[question.id] as string || ""}
          onChange={handleTextAnswer}
        />
      )}
      
      {question.type === "coding" && (
        <CodingChallengeUI
          challenge={question}
          code={answers[question.id] as string || question.starterCode}
          onChange={handleTextAnswer}
        />
      )}
      
      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {question.type === "multiple_choice" && answers[question.id] !== undefined && (
          <Button 
            variant="outline"
            onClick={() => setShowExplanation(question.id)}
            className="gap-2"
          >
            <PiLightbulb className="h-4 w-4" />
            Show Explanation
          </Button>
        )}
        
        <Button 
          onClick={handleNext}
          disabled={answers[question.id] === undefined}
          className="ml-auto gap-2"
        >
          {isLastQuestion ? "Finish" : "Next"}
          <PiArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Quiz Question Component
function QuizQuestionUI({ 
  question, 
  selectedIndex, 
  onSelect,
  showExplanation
}: { 
  question: QuizQuestion; 
  selectedIndex?: number; 
  onSelect: (index: number) => void;
  showExplanation: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{question.question}</h3>
      
      <div className="space-y-2">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={cn(
              "w-full p-4 text-left rounded-lg border transition-all",
              selectedIndex === idx
                ? "border-primary bg-primary/10"
                : "border-border/40 hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <span className="font-medium mr-3">{String.fromCharCode(65 + idx)}.</span>
            {option}
          </button>
        ))}
      </div>
      
      {showExplanation && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
          <div className="flex items-start gap-2">
            <PiLightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">Correct answer: </span>
              {String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}
              <p className="mt-2 text-muted-foreground">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Short Answer Component
function ShortAnswerUI({
  question,
  answer,
  onChange
}: {
  question: ShortAnswerQuestion;
  answer: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{question.question}</h3>
      
      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full min-h-[150px] p-4 rounded-lg border border-border/40 bg-secondary/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
      
      <p className="text-xs text-muted-foreground">
        Key points to cover: {question.keyPoints.join(", ")}
      </p>
    </div>
  );
}

// Coding Challenge Component
function CodingChallengeUI({
  challenge,
  code,
  onChange
}: {
  challenge: CodingChallenge;
  code: string;
  onChange: (text: string) => void;
}) {
  const [showHints, setShowHints] = useState(false);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PiCode className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{challenge.title}</h3>
      </div>
      
      <p className="text-muted-foreground">{challenge.description}</p>
      
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="bg-secondary/50 px-4 py-2 text-xs text-muted-foreground border-b border-border/40">
          code editor
        </div>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[200px] p-4 font-mono text-sm bg-background resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowHints(!showHints)}>
          <PiLightbulb className="h-4 w-4 mr-1" />
          {showHints ? "Hide Hints" : "Show Hints"}
        </Button>
      </div>
      
      {showHints && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
          <ul className="list-disc list-inside space-y-1">
            {challenge.hints.map((hint, idx) => (
              <li key={idx}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
