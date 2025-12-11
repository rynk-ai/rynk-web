/**
 * Guide Surface Inline Component
 * 
 * Renders a step-by-step guide inside the message bubble.
 * User can track progress and generate step details on-demand.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { GuideMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  ListChecks,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Loader2,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/prompt-kit/markdown";

interface GuideSurfaceInlineProps {
  metadata: GuideMetadata;
  surfaceState?: SurfaceState;
  onGenerateStep: (stepIndex: number) => Promise<void>;
  onMarkComplete: (stepIndex: number) => void;
  onSkipStep: (stepIndex: number) => void;
  isGenerating: boolean;
  className?: string;
}

const StepItem = memo(function StepItem({
  step,
  isActive,
  isCompleted,
  isSkipped,
  content,
  isGenerating,
  onExpand,
  onComplete,
  onSkip,
  onGenerate,
}: {
  step: GuideMetadata['steps'][0];
  isActive: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  content: string | null;
  isGenerating: boolean;
  onExpand: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onGenerate: () => void;
}) {
  const showContent = isActive && (content || isGenerating);

  return (
    <div className={cn(
      "border border-border/40 rounded-lg overflow-hidden transition-all",
      isActive && "border-primary/30 bg-primary/5",
      isCompleted && "opacity-70",
      isSkipped && "opacity-50"
    )}>
      {/* Step Header */}
      <button
        onClick={onExpand}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          "hover:bg-muted/30 transition-colors"
        )}
      >
        {/* Status Indicator */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center",
          isCompleted 
            ? "bg-green-500 border-green-500" 
            : isSkipped
              ? "bg-muted border-muted-foreground/30"
              : isActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30"
        )}>
          {isCompleted ? (
            <Check className="h-3.5 w-3.5 text-white" />
          ) : (
            <span className="text-xs font-medium">{step.index + 1}</span>
          )}
        </div>

        {/* Step Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium text-sm",
            isCompleted && "line-through",
            isSkipped && "line-through text-muted-foreground"
          )}>
            {step.title}
          </div>
          {step.estimatedTime > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {step.estimatedTime} min
            </span>
          )}
        </div>

        {/* Expand Icon */}
        {isActive ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {showContent && (
        <div className="px-4 pb-4 pt-0 border-t border-border/30">
          <div className="pl-9">
            {isGenerating ? (
              <div className="flex items-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Generating step details...
                </span>
              </div>
            ) : content ? (
              <>
                <div className="prose prose-sm dark:prose-invert max-w-none py-3">
                  <Markdown>{content}</Markdown>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={onComplete}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Mark Complete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onSkip}>
                    <SkipForward className="h-3.5 w-3.5 mr-1" />
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" onClick={onGenerate} className="my-3">
                Generate Step Details
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export const GuideSurfaceInline = memo(function GuideSurfaceInline({
  metadata,
  surfaceState,
  onGenerateStep,
  onMarkComplete,
  onSkipStep,
  isGenerating,
  className,
}: GuideSurfaceInlineProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(
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
    setActiveStepIndex(index);
    if (!stepsContent[index] && !completedSteps.includes(index) && !skippedSteps.includes(index)) {
      onGenerateStep(index);
    }
  }, [stepsContent, completedSteps, skippedSteps, onGenerateStep]);

  const handleComplete = useCallback((index: number) => {
    onMarkComplete(index);
    // Auto-advance to next incomplete step
    const nextIncomplete = steps.findIndex((_, i) => 
      i > index && !completedSteps.includes(i) && !skippedSteps.includes(i)
    );
    if (nextIncomplete !== -1) {
      setActiveStepIndex(nextIncomplete);
      if (!stepsContent[nextIncomplete]) {
        onGenerateStep(nextIncomplete);
      }
    }
  }, [steps, completedSteps, skippedSteps, stepsContent, onMarkComplete, onGenerateStep]);

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{metadata.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{metadata.estimatedTime} min
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              {metadata.difficulty}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalComplete}/{steps.length} steps
          </span>
        </div>
      </div>

      {/* Steps List */}
      <ScrollArea style={{ maxHeight: '450px' }}>
        <div className="p-3 space-y-2">
          {steps.map((step) => (
            <StepItem
              key={step.index}
              step={step}
              isActive={activeStepIndex === step.index}
              isCompleted={completedSteps.includes(step.index)}
              isSkipped={skippedSteps.includes(step.index)}
              content={stepsContent[step.index] || null}
              isGenerating={isGenerating && activeStepIndex === step.index}
              onExpand={() => handleStepClick(step.index)}
              onComplete={() => handleComplete(step.index)}
              onSkip={() => onSkipStep(step.index)}
              onGenerate={() => onGenerateStep(step.index)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

export default GuideSurfaceInline;
