/**
 * Guide Surface - Checklist Component
 * 
 * Sequential checklist with locked/unlocked progression.
 * Checkpoints unlock as user completes them.
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
  PiSparkle,
  PiTrophy,
  PiLock,
  PiCircle,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { StepContentSkeleton } from "@/components/surfaces/surface-skeletons";
import { SelectableContent } from "@/components/selectable-content";

interface GuideSurfaceProps {
  metadata: GuideMetadata;
  surfaceState: SurfaceState;
  onGenerateCheckpoint: (checkpointIndex: number) => Promise<void>;
  onMarkComplete: (checkpointIndex: number) => void;
  isGenerating: boolean;
  className?: string;
  surfaceId?: string;
  onSubChatSelect?: (text: string, sectionId?: string, fullContent?: string) => void;
  sectionIdsWithSubChats?: Set<string>;
}

export const GuideSurface = memo(function GuideSurface({
  metadata,
  surfaceState,
  onGenerateCheckpoint,
  onMarkComplete,
  isGenerating,
  className,
  onSubChatSelect,
}: GuideSurfaceProps) {
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<number>(-1);

  const checkpoints = metadata.checkpoints || [];
  const currentCheckpoint = surfaceState?.guide?.currentCheckpoint ?? 0;
  const completedCheckpoints = surfaceState?.guide?.completedCheckpoints || [];
  const checkpointContent = surfaceState?.guide?.checkpointContent || {};
  
  const progress = checkpoints.length > 0 
    ? Math.round((completedCheckpoints.length / checkpoints.length) * 100) 
    : 0;
  const isComplete = completedCheckpoints.length === checkpoints.length && checkpoints.length > 0;

  const getCheckpointStatus = useCallback((index: number): 'completed' | 'current' | 'locked' => {
    if (completedCheckpoints.includes(index)) return 'completed';
    if (index === currentCheckpoint) return 'current';
    return 'locked';
  }, [completedCheckpoints, currentCheckpoint]);

  const handleCheckpointClick = useCallback((index: number) => {
    const status = getCheckpointStatus(index);
    
    // Only allow clicking on current or completed checkpoints
    if (status === 'locked') return;
    
    // Toggle expand
    if (expandedCheckpoint === index) {
      setExpandedCheckpoint(-1);
    } else {
      setExpandedCheckpoint(index);
      // Generate content if not yet generated and clicking on current
      if (!checkpointContent[index] && status === 'current') {
        onGenerateCheckpoint(index);
      }
    }
  }, [expandedCheckpoint, checkpointContent, getCheckpointStatus, onGenerateCheckpoint]);

  const handleMarkComplete = useCallback((index: number) => {
    onMarkComplete(index);
    setExpandedCheckpoint(-1);
  }, [onMarkComplete]);

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Hero Header */}
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
                  <PiCheck className="h-4 w-4 opacity-70" />
                  {checkpoints.length} checkpoints
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
                {completedCheckpoints.length} of {checkpoints.length}
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
              <h3 className="text-lg font-bold text-foreground">Checklist Complete!</h3>
              <p className="text-muted-foreground">You've successfully completed all checkpoints.</p>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoints */}
      <div className="space-y-3">
        {checkpoints.map((checkpoint, index) => {
          const status = getCheckpointStatus(index);
          const isExpanded = expandedCheckpoint === index;
          const content = checkpointContent[index] || null;
          const isCheckpointGenerating = isGenerating && expandedCheckpoint === index && !content;

          return (
            <div 
              key={checkpoint.id}
              className={cn(
                "relative rounded-xl border overflow-hidden transition-all duration-300",
                status === 'completed' && "border-green-500/20 bg-green-500/5",
                status === 'current' && isExpanded && "border-primary/50 bg-card shadow-md ring-1 ring-primary/20",
                status === 'current' && !isExpanded && "border-primary/30 bg-card hover:bg-muted/30",
                status === 'locked' && "border-border/30 bg-muted/10 opacity-60 cursor-not-allowed",
              )}
            >
              {/* Checkpoint Header */}
              <button
                onClick={() => handleCheckpointClick(index)}
                disabled={status === 'locked'}
                className={cn(
                  "w-full text-left px-5 py-4 flex items-start gap-4",
                  status === 'locked' && "cursor-not-allowed"
                )}
              >
                {/* Status Icon */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm transition-all shadow-sm mt-0.5",
                  status === 'completed' && "bg-green-500 border-green-500 text-white",
                  status === 'current' && "border-primary text-primary bg-primary/10",
                  status === 'locked' && "border-border/50 text-muted-foreground/50 bg-muted/30",
                )}>
                  {status === 'completed' ? (
                    <PiCheck className="h-4 w-4" />
                  ) : status === 'locked' ? (
                    <PiLock className="h-3.5 w-3.5" />
                  ) : (
                    <PiCircle className="h-4 w-4" />
                  )}
                </div>

                {/* Checkpoint Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className={cn(
                      "font-semibold text-lg leading-snug",
                      status === 'completed' && "text-muted-foreground",
                      status === 'current' && "text-foreground",
                      status === 'locked' && "text-muted-foreground/60",
                    )}>
                      {checkpoint.title}
                    </h3>
                    {status === 'current' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  
                  {/* Description */}
                  {checkpoint.description && (
                    <p className="text-sm text-muted-foreground mt-1">{checkpoint.description}</p>
                  )}
                  
                  {/* Substeps Preview */}
                  {checkpoint.substeps.length > 0 && !isExpanded && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {checkpoint.substeps.slice(0, 4).map((substep, i) => (
                        <span 
                          key={i}
                          className={cn(
                            "text-xs px-2 py-1 rounded-md",
                            status === 'completed' && "bg-green-500/10 text-green-600 dark:text-green-400",
                            status === 'current' && "bg-muted text-muted-foreground",
                            status === 'locked' && "bg-muted/50 text-muted-foreground/50",
                          )}
                        >
                          {substep}
                        </span>
                      ))}
                      {checkpoint.substeps.length > 4 && (
                        <span className="text-xs px-2 py-1 text-muted-foreground">
                          +{checkpoint.substeps.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Time estimate */}
                  <p className="text-xs font-medium text-muted-foreground/70 mt-2 flex items-center gap-1.5">
                    <PiClock className="h-3 w-3" />
                    ~{checkpoint.estimatedTime} min
                  </p>
                </div>

                {/* Expand Icon */}
                {status !== 'locked' && (
                  <div className="text-muted-foreground/50">
                    {isExpanded ? (
                      <PiCaretUp className="h-5 w-5" />
                    ) : (
                      <PiCaretDown className="h-5 w-5" />
                    )}
                  </div>
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && status !== 'locked' && (
                <div className="border-t border-border/30 bg-background/50">
                  <div className="p-6 md:p-8">
                    {isCheckpointGenerating ? (
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
                            sectionId={`checkpoint-${checkpoint.id}`}
                            onSelect={onSubChatSelect || (() => {})}
                            disabled={!onSubChatSelect}
                          >
                            <Markdown>{content}</Markdown>
                          </SelectableContent>
                        </div>
                        
                        {status === 'current' && (
                          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-border/30">
                            <Button 
                              onClick={() => handleMarkComplete(index)}
                              className="gap-2 bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-green-500/20 transition-all"
                            >
                              <PiCheck className="h-4 w-4" />
                              Mark Complete
                            </Button>
                          </div>
                        )}
                        
                        {status === 'completed' && (
                          <div className="flex items-center gap-2 pt-5 mt-5 border-t border-border/30 text-green-500 font-medium animate-in fade-in">
                            <PiCheck className="h-5 w-5" />
                            <span>Checkpoint completed!</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/20 flex items-center justify-center mb-5">
                          <PiSparkle className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h4 className="font-semibold text-lg mb-2 text-foreground">Learn More</h4>
                        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                          Get detailed instructions and tips for completing this checkpoint.
                        </p>
                        <Button onClick={() => onGenerateCheckpoint(index)} className="gap-2 shadow-lg shadow-primary/20">
                          <PiSparkle className="h-4 w-4" />
                          Generate Details
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
