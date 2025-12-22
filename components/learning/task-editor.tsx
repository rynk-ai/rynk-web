"use client";

import { useState } from "react";
import { 
  Play, 
  Send, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  Code2,
  FileText,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectTask, TaskEvaluation, TaskRubric } from "@/lib/services/project-types";

/**
 * TaskEditor - Component for submitting task solutions
 * 
 * Supports:
 * - Coding tasks (code editor)
 * - Writing tasks (textarea)
 * - Shows rubric preview
 * - Displays evaluation results
 */

interface TaskEditorProps {
  task: ProjectTask;
  onSubmit: (content: string) => Promise<{ 
    evaluation: TaskEvaluation;
    xpEarned: number;
    passed: boolean;
  }>;
  initialContent?: string;
  previousEvaluation?: TaskEvaluation;
}

export function TaskEditor({ 
  task, 
  onSubmit, 
  initialContent,
  previousEvaluation 
}: TaskEditorProps) {
  const [content, setContent] = useState(initialContent || task.starterCode || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(previousEvaluation || null);
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [showRubric, setShowRubric] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const result = await onSubmit(content);
      setEvaluation(result.evaluation);
      setXpEarned(result.xpEarned);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const revealNextHint = () => {
    if (task.hints && revealedHints < task.hints.length) {
      setRevealedHints(prev => prev + 1);
    }
  };

  const rubric = task.rubric as TaskRubric;

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="flex items-start gap-3">
        {task.type === "coding" ? (
          <Code2 className="h-6 w-6 text-blue-500 mt-1" />
        ) : (
          <FileText className="h-6 w-6 text-purple-500 mt-1" />
        )}
        <div>
          <h2 className="text-xl font-bold">{task.title}</h2>
          <p className="text-sm text-muted-foreground">
            Estimated time: {task.estimatedMinutes} minutes • Pass mark: {task.passingScore}%
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          📋 Instructions
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{task.instructions}</div>
        </div>
      </div>

      {/* Rubric Preview */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <button 
          onClick={() => setShowRubric(!showRubric)}
          className="w-full p-3 flex items-center justify-between bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
        >
          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
            📊 How You'll Be Graded
          </span>
          <ChevronDown className={cn(
            "h-5 w-5 transition-transform",
            showRubric && "rotate-180"
          )} />
        </button>
        
        {showRubric && rubric?.criteria && (
          <div className="p-4 space-y-3">
            {rubric.criteria.map((criterion, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">{criterion.name}</span>
                  <span className="text-sm text-muted-foreground">{criterion.weight}%</span>
                </div>
                <p className="text-sm text-muted-foreground">{criterion.description}</p>
                <div className="flex gap-2 text-xs">
                  {criterion.levels.map((level, lidx) => (
                    <span 
                      key={lidx}
                      className={cn(
                        "px-2 py-0.5 rounded",
                        level.score >= 75 ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                        level.score >= 50 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                        "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}
                    >
                      {level.label}: {level.score}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code/Text Editor */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="bg-secondary/50 px-4 py-2 flex justify-between items-center border-b border-border/40">
          <span className="text-sm font-mono flex items-center gap-2">
            {task.type === "coding" ? (
              <>
                <Code2 className="h-4 w-4" />
                solution.ts
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Your Response
              </>
            )}
          </span>
          {task.type === "coding" && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Play className="h-3 w-3" />
              Run (preview)
            </Button>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn(
            "w-full min-h-[300px] p-4 bg-background resize-none focus:outline-none",
            task.type === "coding" && "font-mono text-sm"
          )}
          placeholder={task.type === "coding" 
            ? "// Write your code here..." 
            : "Write your response here..."
          }
          spellCheck={task.type !== "coding"}
        />
      </div>

      {/* Hints Section */}
      {task.hints && task.hints.length > 0 && (
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowHints(!showHints)}
            className="gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            {showHints ? "Hide Hints" : "Need Help?"}
          </Button>
          
          {showHints && (
            <div className="mt-3 space-y-2">
              {task.hints.slice(0, revealedHints).map((hint, i) => (
                <div 
                  key={i} 
                  className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm"
                >
                  💡 <strong>Hint {i + 1}:</strong> {hint}
                </div>
              ))}
              {revealedHints < task.hints.length && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={revealNextHint}
                  className="text-yellow-600 dark:text-yellow-400"
                >
                  Reveal Hint {revealedHints + 1} of {task.hints.length}
                </Button>
              )}
              {revealedHints === 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={revealNextHint}
                  className="text-yellow-600 dark:text-yellow-400"
                >
                  Show First Hint
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <div className={cn(
          "p-6 rounded-xl border-2",
          evaluation.passed 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-orange-500/10 border-orange-500/30"
        )}>
          <div className="flex items-center gap-4 mb-4">
            {evaluation.passed ? (
              <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-full bg-orange-500/20 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">
                {evaluation.passed ? "Task Passed! 🎉" : "Needs Revision"}
              </h3>
              <p className="text-3xl font-bold">{evaluation.score}%</p>
            </div>
            {evaluation.passed && xpEarned > 0 && (
              <div className="ml-auto text-center">
                <p className="text-sm text-muted-foreground">XP Earned</p>
                <p className="text-2xl font-bold text-green-500">+{xpEarned}</p>
              </div>
            )}
          </div>
          
          <p className="mb-4 text-muted-foreground">{evaluation.feedback}</p>
          
          {/* Criteria Breakdown */}
          {evaluation.criteriaScores && Object.keys(evaluation.criteriaScores).length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Score Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(evaluation.criteriaScores).map(([name, score]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{name}</span>
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          score >= 75 ? "bg-green-500" :
                          score >= 50 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">{score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Strengths */}
          {evaluation.strengths && evaluation.strengths.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                ✅ What You Did Well
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          
          {/* Improvements */}
          {!evaluation.passed && evaluation.improvements && evaluation.improvements.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                📝 To Improve
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          
          {/* Suggestions */}
          {evaluation.suggestions && evaluation.suggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                💡 Suggestions
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {evaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting || !content.trim()}
        className="w-full gap-2"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Evaluating...
          </>
        ) : evaluation?.passed ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Resubmit for Review
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Submit for Review
          </>
        )}
      </Button>
      
      {!evaluation?.passed && (
        <p className="text-center text-sm text-muted-foreground">
          Your submission will be evaluated by AI against the rubric above
        </p>
      )}
    </div>
  );
}
