/**
 * Guide Surface Inline Component (Legacy/Deprecated)
 * 
 * Note: This is a simplified inline version. The main GuideSurface component
 * is now a full checklist experience. This component is kept for backward
 * compatibility but may be removed in the future.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { GuideMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  PiListChecks,
  PiCaretDown,
  PiCaretRight,
  PiCheck,
  PiClock,
  PiSpinner,
  PiLock,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/prompt-kit/markdown";

interface GuideSurfaceInlineProps {
  metadata: GuideMetadata;
  surfaceState?: SurfaceState;
  onGenerateCheckpoint: (checkpointIndex: number) => Promise<void>;
  onMarkComplete: (checkpointIndex: number) => void;
  isGenerating: boolean;
  className?: string;
}

type CheckpointType = GuideMetadata['checkpoints'][0];

const CheckpointItem = memo(function CheckpointItem({
  checkpoint,
  index,
  isActive,
  isCompleted,
  isLocked,
  content,
  isGenerating,
  onExpand,
  onComplete,
  onGenerate,
}: {
  checkpoint: CheckpointType;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  content: string | null;
  isGenerating: boolean;
  onExpand: () => void;
  onComplete: () => void;
  onGenerate: () => void;
}) {
  const showContent = isActive && (content || isGenerating);

  return (
    <div className={cn(
      "border border-border/40 rounded-lg overflow-hidden transition-all",
      isActive && "border-primary/30 bg-primary/5",
      isCompleted && "opacity-70",
      isLocked && "opacity-50 cursor-not-allowed"
    )}>
      {/* Header */}
      <button
        onClick={isLocked ? undefined : onExpand}
        disabled={isLocked}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          !isLocked && "hover:bg-muted/30 transition-colors"
        )}
      >
        {/* Status */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center",
          isCompleted 
            ? "bg-green-500 border-green-500" 
            : isLocked
              ? "bg-muted border-muted-foreground/30"
              : isActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30"
        )}>
          {isCompleted ? (
            <PiCheck className="h-3.5 w-3.5 text-white" />
          ) : isLocked ? (
            <PiLock className="h-3 w-3 text-muted-foreground/50" />
          ) : (
            <span className="text-xs font-medium">{index + 1}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium text-sm",
            isCompleted && "line-through",
            isLocked && "text-muted-foreground"
          )}>
            {checkpoint.title}
          </div>
          {checkpoint.estimatedTime > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <PiClock className="h-3 w-3" />
              {checkpoint.estimatedTime} min
            </span>
          )}
        </div>

        {/* Expand */}
        {!isLocked && (
          isActive ? (
            <PiCaretDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <PiCaretRight className="h-4 w-4 text-muted-foreground" />
          )
        )}
      </button>

      {/* Content */}
      {showContent && (
        <div className="px-4 pb-4 pt-0 border-t border-border/30">
          <div className="pl-9">
            {isGenerating ? (
              <div className="flex items-center py-4">
                <PiSpinner className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading details...
                </span>
              </div>
            ) : content ? (
              <>
                <div className="prose prose-sm dark:prose-invert max-w-none py-3">
                  <Markdown>{content}</Markdown>
                </div>
                {!isCompleted && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" onClick={onComplete}>
                      <PiCheck className="h-3.5 w-3.5 mr-1" />
                      Mark Complete
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Button size="sm" onClick={onGenerate} className="my-3">
                Learn More
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
  onGenerateCheckpoint,
  onMarkComplete,
  isGenerating,
  className,
}: GuideSurfaceInlineProps) {
  const [activeIndex, setActiveIndex] = useState(
    surfaceState?.guide?.currentCheckpoint ?? 0
  );

  const checkpoints = metadata.checkpoints || [];
  const currentCheckpoint = surfaceState?.guide?.currentCheckpoint ?? 0;
  const completedCheckpoints = surfaceState?.guide?.completedCheckpoints || [];
  const checkpointContent = surfaceState?.guide?.checkpointContent || {};
  
  const progress = checkpoints.length > 0 
    ? Math.round((completedCheckpoints.length / checkpoints.length) * 100) 
    : 0;

  const handleClick = useCallback((index: number) => {
    const isLocked = index > currentCheckpoint && !completedCheckpoints.includes(index);
    if (isLocked) return;
    
    setActiveIndex(index);
    if (!checkpointContent[index]) {
      onGenerateCheckpoint(index);
    }
  }, [checkpointContent, currentCheckpoint, completedCheckpoints, onGenerateCheckpoint]);

  const handleComplete = useCallback((index: number) => {
    onMarkComplete(index);
  }, [onMarkComplete]);

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiListChecks className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{metadata.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <PiClock className="h-3 w-3" />
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
            {completedCheckpoints.length}/{checkpoints.length} done
          </span>
        </div>
      </div>

      {/* List */}
      <ScrollArea style={{ maxHeight: '450px' }}>
        <div className="p-3 space-y-2">
          {checkpoints.map((checkpoint, index) => {
            const isCompleted = completedCheckpoints.includes(index);
            const isLocked = index > currentCheckpoint && !isCompleted;
            
            return (
              <CheckpointItem
                key={checkpoint.id}
                checkpoint={checkpoint}
                index={index}
                isActive={activeIndex === index}
                isCompleted={isCompleted}
                isLocked={isLocked}
                content={checkpointContent[index] || null}
                isGenerating={isGenerating && activeIndex === index}
                onExpand={() => handleClick(index)}
                onComplete={() => handleComplete(index)}
                onGenerate={() => onGenerateCheckpoint(index)}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
});

export default GuideSurfaceInline;
