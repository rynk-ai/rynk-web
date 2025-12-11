/**
 * Guide Surface - Premium Full Page Component
 * 
 * Step-by-step guide with modern progress tracking, animations,
 * and engaging status indicators.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { GuideMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  ListChecks,
  Check,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  SkipForward,
  Sparkles,
  Trophy,
  Zap,
  AlertCircle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";

interface GuideSurfaceProps {
  metadata: GuideMetadata;
  surfaceState: SurfaceState;
  onGenerateStep: (stepIndex: number) => Promise<void>;
  onMarkComplete: (stepIndex: number) => void;
  onSkipStep: (stepIndex: number) => void;
  isGenerating: boolean;
  className?: string;
}

export const GuideSurface = memo(function GuideSurface({
  metadata,
  surfaceState,
  onGenerateStep,
  onMarkComplete,
  onSkipStep,
  isGenerating,
  className,
}: GuideSurfaceProps) {
  const [expandedStep, setExpandedStep] = useState<number>(
    surfaceState?.guide?.currentStep ?? 0
  );

  const steps = metadata.steps || [];
  const completedSteps = surfaceState?.guide?.completedSteps || [];
  const skippedSteps = surfaceState?.guide?.skippedSteps || [];
  const stepsContent = surfaceState?.guide?.stepsContent || {};
  
  const totalComplete = completedSteps.length + skippedSteps.length;
  const progress = steps.length > 0 
    ? Math.round((totalComplete / steps.length) * 100) 
    : 0;
  const isComplete = totalComplete === steps.length && steps.length > 0;

  const handleStepClick = useCallback((index: number) => {
    setExpandedStep(expandedStep === index ? -1 : index);
    if (!stepsContent[index] && !completedSteps.includes(index) && !skippedSteps.includes(index)) {
      onGenerateStep(index);
    }
  }, [expandedStep, stepsContent, completedSteps, skippedSteps, onGenerateStep]);

  const handleComplete = useCallback((index: number) => {
    onMarkComplete(index);
    // Auto-expand next incomplete step
    const nextIncomplete = steps.findIndex((_, i) => 
      i > index && !completedSteps.includes(i) && !skippedSteps.includes(i)
    );
    if (nextIncomplete !== -1) {
      setExpandedStep(nextIncomplete);
      if (!stepsContent[nextIncomplete]) {
        onGenerateStep(nextIncomplete);
      }
    }
  }, [steps, completedSteps, skippedSteps, stepsContent, onMarkComplete, onGenerateStep]);

  const handleSkip = useCallback((index: number) => {
    onSkipStep(index);
    // Auto-expand next step
    const nextStep = steps.findIndex((_, i) => 
      i > index && !completedSteps.includes(i) && !skippedSteps.includes(i)
    );
    if (nextStep !== -1) {
      setExpandedStep(nextStep);
    }
  }, [steps, completedSteps, skippedSteps, onSkipStep]);

  // Get current/next step for the header
  const currentStepIndex = steps.findIndex((_, i) => 
    !completedSteps.includes(i) && !skippedSteps.includes(i)
  );

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      {/* Clean Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Guide Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                  metadata.difficulty === 'beginner' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  metadata.difficulty === 'intermediate' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  metadata.difficulty === 'advanced' && "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  {metadata.difficulty}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">{metadata.title}</h1>
              <p className="text-muted-foreground text-base leading-relaxed">{metadata.description}</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 opacity-70" />
                  {steps.length} steps
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-70" />
                  ~{metadata.estimatedTime} min
                </span>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-xl">
              <div className="relative w-20 h-20">
                {/* Background ring */}
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 34}`,
                      strokeDashoffset: `${2 * Math.PI * 34 * (1 - progress / 100)}`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{progress}%</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground mt-2">
                {totalComplete} of {steps.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Guide Complete!</h3>
              <p className="text-sm text-muted-foreground">You've finished all steps.</p>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.index;
          const isCompleted = completedSteps.includes(step.index);
          const isSkipped = skippedSteps.includes(step.index);
          const content = stepsContent[step.index] || null;
          const isStepGenerating = isGenerating && expandedStep === step.index;
          const isCurrent = step.index === currentStepIndex;

          return (
            <div 
              key={step.index}
              className={cn(
                "relative rounded-xl border overflow-hidden transition-all duration-300",
                isExpanded && "shadow-lg",
                isCompleted 
                  ? "border-green-500/30 bg-green-500/5" 
                  : isSkipped
                    ? "border-border/30 bg-muted/20" 
                    : isExpanded
                      ? "border-primary"
                      : "border-border/40",
              )}
            >
              {/* Progress Line Connector */}
              {step.index < steps.length - 1 && (
                <div className={cn(
                  "absolute left-8 top-full w-0.5 h-3 -translate-x-1/2 z-10",
                  isCompleted ? "bg-green-500" : "bg-border"
                )} />
              )}

              {/* Step Header */}
              <button
                onClick={() => handleStepClick(step.index)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Step Number/Check */}
                <div className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center font-semibold text-sm transition-all",
                  isCompleted 
                    ? "bg-green-500 border-green-500 text-white" 
                    : isSkipped
                      ? "bg-muted border-border text-muted-foreground"
                      : isCurrent
                        ? "border-primary text-primary bg-primary/5"
                        : "border-border text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.index + 1
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-medium text-base",
                      (isCompleted || isSkipped) && "text-muted-foreground"
                    )}>
                      {step.title}
                    </h3>
                    {isCurrent && !isCompleted && !isSkipped && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Skipped
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    ~{step.estimatedTime} min
                  </p>
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-card/50">
                  <div className="p-5">
                    {isStepGenerating ? (
                      <div className="flex flex-col items-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                          <Loader2 className="h-10 w-10 animate-spin text-green-500 relative" />
                        </div>
                        <p className="text-muted-foreground mt-4 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Generating step details...
                        </p>
                      </div>
                    ) : content ? (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                          prose-p:text-muted-foreground prose-p:leading-relaxed
                          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg
                          prose-li:text-muted-foreground
                        ">
                          <Markdown>{content}</Markdown>
                        </div>
                        {!isCompleted && !isSkipped && (
                          <div className="flex items-center gap-3 pt-5 mt-5 border-t">
                            <Button 
                              onClick={() => handleComplete(step.index)}
                              className="gap-2 bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Check className="h-4 w-4" />
                              Mark Complete
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSkip(step.index)}
                              className="gap-2"
                            >
                              <SkipForward className="h-4 w-4" />
                              Skip Step
                            </Button>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-2 pt-4 mt-4 border-t text-green-500">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">Step completed!</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-10 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                          <Zap className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <h4 className="font-medium mb-2">Ready to begin?</h4>
                        <p className="text-muted-foreground text-sm mb-5 max-w-sm">
                          Generate the detailed instructions for this step.
                        </p>
                        <Button onClick={() => onGenerateStep(step.index)} className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Generate Instructions
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GuideSurface;
