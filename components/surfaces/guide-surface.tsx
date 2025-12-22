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
  PiCheck,
  PiClock,
  PiSpinner,
  PiCaretDown,
  PiCaretUp,
  PiSkipForward,
  PiSparkle,
  PiTrophy,
  PiLightning,
  PiTarget,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { StepContentSkeleton } from "@/components/surfaces/surface-skeletons";
import { SelectableContent } from "@/components/selectable-content";

interface GuideSurfaceProps {
  metadata: GuideMetadata;
  surfaceState: SurfaceState;
  onGenerateStep: (stepIndex: number) => Promise<void>;
  onMarkComplete: (stepIndex: number) => void;
  onSkipStep: (stepIndex: number) => void;
  isGenerating: boolean;
  className?: string;
  // Add conversationId prop to match page.tsx usage
  conversationId?: string;
  surfaceId?: string;
  onSubChatSelect?: (text: string, sectionId?: string, fullContent?: string) => void;
  sectionIdsWithSubChats?: Set<string>;
  content?: Record<number, string>;
  completedSteps?: number[];
  skippedSteps?: number[];
}

export const GuideSurface = memo(function GuideSurface({
  metadata,
  surfaceState,
  onGenerateStep,
  onMarkComplete,
  onSkipStep,
  isGenerating,
  className,
  onSubChatSelect,
}: GuideSurfaceProps) {
  const [expandedStep, setExpandedStep] = useState<number>(
    surfaceState?.guide?.currentStep ?? 0
  );

  const steps = metadata.steps || [];
  const completedSteps = surfaceState?.guide?.completedSteps || [];
  const skippedSteps = surfaceState?.guide?.skippedSteps || [];
  const stepsContent = surfaceState?.guide?.stepsContent || {};
  const availableImages = surfaceState?.availableImages || [];
  
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
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Hero Images */}
      {availableImages.length > 0 && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          {availableImages.slice(0, 3).map((img, idx) => (
            <a
              key={idx}
              href={img.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-xl overflow-hidden bg-muted/40"
            >
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}

      {/* Clean Hero Header */}
      <div className="bg-card border border-border/30 rounded-2xl shadow-sm mb-10 overflow-hidden">
        <div className="p-6 md:p-8 bg-gradient-to-br from-card to-muted/20">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Guide Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  metadata.difficulty === 'beginner' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  metadata.difficulty === 'intermediate' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  metadata.difficulty === 'advanced' && "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  {metadata.difficulty}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display text-foreground">{metadata.title}</h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">{metadata.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-2">
                  <PiTarget className="h-4 w-4 opacity-70" />
                  {steps.length} steps
                </span>
                <span className="flex items-center gap-2">
                  <PiClock className="h-4 w-4 opacity-70" />
                  ~{metadata.estimatedTime} min
                </span>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex flex-col items-center justify-center p-6 bg-background/50 backdrop-blur-sm border border-border/20 rounded-2xl min-w-[140px]">
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
                    className="text-primary transition-all duration-700 ease-out"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 34}`,
                      strokeDashoffset: `${2 * Math.PI * 34 * (1 - progress / 100)}`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold font-mono tracking-tight">{progress}%</span>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-2">
                {totalComplete} of {steps.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="mb-8 p-6 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
              <PiTrophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Guide Complete!</h3>
              <p className="text-muted-foreground">You've successfully finished all steps.</p>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
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
                isExpanded && "shadow-md ring-1 ring-primary/20",
                isCompleted 
                  ? "border-green-500/20 bg-green-500/5" 
                  : isSkipped
                    ? "border-border/50 bg-muted/20 opacity-80" 
                    : isExpanded
                      ? "border-primary/50 bg-card"
                      : "border-border/40 bg-card hover:bg-muted/30",
              )}
            >
              {/* Progress Line Connector */}
              {step.index < steps.length - 1 && (
                <div className={cn(
                  "absolute left-[33px] top-14 bottom-[-16px] w-[2px] z-0 pointer-events-none",
                  isCompleted ? "bg-green-500/30" : "bg-border/40"
                )} />
              )}

              {/* Step Header */}
              <button
                onClick={() => handleStepClick(step.index)}
                className="w-full text-left px-5 py-4 flex items-center gap-5 relative z-10"
              >
                {/* Step Number/Check */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm transition-all shadow-sm",
                  isCompleted 
                    ? "bg-green-500 border-green-500 text-white" 
                    : isSkipped
                      ? "bg-muted border-border text-muted-foreground"
                      : isCurrent
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground bg-background"
                )}>
                  {isCompleted ? (
                    <PiCheck className="h-4 w-4" />
                  ) : (
                    step.index + 1
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className={cn(
                      "font-semibold text-lg leading-snug",
                      (isCompleted || isSkipped) ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {step.title}
                    </h3>
                    {isCurrent && !isCompleted && !isSkipped && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Skipped
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                    <PiClock className="h-3 w-3" />
                    ~{step.estimatedTime} min
                  </p>
                </div>

                {/* Expand Icon */}
                <div className="text-muted-foreground/50">
                  {isExpanded ? (
                    <PiCaretUp className="h-5 w-5" />
                  ) : (
                    <PiCaretDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border/30 bg-background/50 relative z-10">
                  <div className="p-6 md:p-8">
                    {isStepGenerating ? (
                      <StepContentSkeleton />
                    ) : content ? (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
                          prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                          prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium
                          prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-xl prose-pre:p-4
                          prose-li:text-muted-foreground prose-li:my-1
                          prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-muted/10 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-5
                        ">
                          <SelectableContent
                            sectionId={`step-${step.index}`}
                            onSelect={onSubChatSelect || (() => {})}
                            disabled={!onSubChatSelect}
                          >
                            <Markdown>{content}</Markdown>
                          </SelectableContent>
                        </div>
                        
                        {!isCompleted && !isSkipped && (
                          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-border/30">
                            <Button 
                              onClick={() => handleComplete(step.index)}
                              className="gap-2 bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-green-500/20 transition-all"
                            >
                              <PiCheck className="h-4 w-4" />
                              Mark Complete
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSkip(step.index)}
                              className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                              <PiSkipForward className="h-4 w-4" />
                              Skip Step
                            </Button>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-2 pt-5 mt-5 border-t border-border/30 text-green-500 font-medium animate-in fade-in">
                            <PiCheck className="h-5 w-5" />
                            <span>Step completed!</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/20 flex items-center justify-center mb-5">
                          <PiLightning className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h4 className="font-semibold text-lg mb-2 text-foreground">Ready to begin?</h4>
                        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                          Generate the detailed instructions for this step to verify your progress.
                        </p>
                        <Button onClick={() => onGenerateStep(step.index)} className="gap-2 shadow-lg shadow-primary/20">
                          <PiSparkle className="h-4 w-4" />
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
