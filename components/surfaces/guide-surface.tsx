/**
 * Guide Surface - Full Page Component
 * 
 * Step-by-step guide with progress tracking and completion.
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
  ChevronRight,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/prompt-kit/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListChecks className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{metadata.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {metadata.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                ~{metadata.estimatedTime} min
              </span>
              <span className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium capitalize">
                {metadata.difficulty}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm font-medium text-muted-foreground">
              {totalComplete}/{steps.length} steps
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.index;
          const isCompleted = completedSteps.includes(step.index);
          const isSkipped = skippedSteps.includes(step.index);
          const content = stepsContent[step.index] || null;
          const isStepGenerating = isGenerating && expandedStep === step.index;

          return (
            <Card 
              key={step.index} 
              className={cn(
                "transition-all",
                isExpanded && "ring-2 ring-primary/20",
                isCompleted && "opacity-70",
                isSkipped && "opacity-50"
              )}
            >
              {/* Step Header */}
              <button
                onClick={() => handleStepClick(step.index)}
                className="w-full text-left px-6 py-4 flex items-center gap-4"
              >
                {/* Step Number/Check */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm",
                  isCompleted 
                    ? "bg-green-500 border-green-500 text-white" 
                    : isSkipped
                      ? "bg-muted border-muted-foreground/30 text-muted-foreground"
                      : isExpanded
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.index + 1
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium",
                    (isCompleted || isSkipped) && "line-through text-muted-foreground"
                  )}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {step.estimatedTime} min
                    {isSkipped && <span className="text-xs">(Skipped)</span>}
                  </p>
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0 border-t">
                  {isStepGenerating ? (
                    <div className="flex items-center py-8 justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">
                        Generating step details...
                      </span>
                    </div>
                  ) : content ? (
                    <>
                      <div className="prose dark:prose-invert max-w-none py-4">
                        <Markdown>{content}</Markdown>
                      </div>
                      {!isCompleted && !isSkipped && (
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <Button 
                            onClick={() => handleComplete(step.index)}
                            className="gap-2"
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
                            Skip
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <Button 
                        onClick={() => onGenerateStep(step.index)}
                        variant="outline"
                      >
                        Generate Step Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {totalComplete === steps.length && steps.length > 0 && (
        <Card className="mt-6 bg-green-500/10 border-green-500/20">
          <CardContent className="py-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 mb-4">
              <Check className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
              Guide Complete!
            </h3>
            <p className="text-muted-foreground mt-1">
              You've finished all steps. Great work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default GuideSurface;
