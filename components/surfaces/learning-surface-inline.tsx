/**
 * Learning Surface Inline Component
 * 
 * Renders a course-like view with chapters inside the message bubble.
 * User can navigate chapters and generate content on-demand.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { LearningMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  PiBookOpenText,
  PiCaretRight,
  PiCheck,
  PiClock,
  PiSpinner,
  PiArrowRight,
  PiArrowLeft,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/prompt-kit/markdown";

interface LearningSurfaceInlineProps {
  metadata: LearningMetadata;
  surfaceState?: SurfaceState;
  onGenerateChapter: (chapterIndex: number) => Promise<void>;
  onMarkComplete: (chapterIndex: number) => void;
  isGenerating: boolean;
  className?: string;
}

const ChapterListItem = memo(function ChapterListItem({
  chapter,
  index,
  isActive,
  isCompleted,
  onClick,
}: {
  chapter: LearningMetadata['chapters'][0];
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg transition-all",
        "flex items-center gap-2",
        isActive 
          ? "bg-primary/10 text-primary border border-primary/20" 
          : "hover:bg-muted/50",
        chapter.status === 'locked' && "opacity-50 cursor-not-allowed"
      )}
      disabled={chapter.status === 'locked'}
    >
      <div className="flex-shrink-0">
        {isCompleted ? (
          <PiCheck className="h-4 w-4 text-green-500" />
        ) : isActive ? (
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">Ch {index + 1}</div>
        <div className="text-sm font-medium truncate">{chapter.title}</div>
      </div>
      {chapter.estimatedTime > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
          <PiClock className="h-3 w-3" />
          {chapter.estimatedTime}m
        </span>
      )}
    </button>
  );
});

export const LearningSurfaceInline = memo(function LearningSurfaceInline({
  metadata,
  surfaceState,
  onGenerateChapter,
  onMarkComplete,
  isGenerating,
  className,
}: LearningSurfaceInlineProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(
    surfaceState?.learning?.currentChapter ?? 0
  );

  const chapters = metadata.chapters || [];
  const completedChapters = surfaceState?.learning?.completedChapters || [];
  const chaptersContent = surfaceState?.learning?.chaptersContent || {};
  const activeChapterContent = chaptersContent[activeChapterIndex] || null;
  
  const progress = chapters.length > 0 
    ? Math.round((completedChapters.length / chapters.length) * 100) 
    : 0;

  const hasNextChapter = activeChapterIndex < chapters.length - 1;
  const hasPrevChapter = activeChapterIndex > 0;

  const handleChapterClick = useCallback((index: number) => {
    setActiveChapterIndex(index);
    if (!chaptersContent[index]) {
      onGenerateChapter(index);
    }
  }, [chaptersContent, onGenerateChapter]);

  const handleNext = useCallback(() => {
    if (hasNextChapter) {
      handleChapterClick(activeChapterIndex + 1);
    }
  }, [hasNextChapter, activeChapterIndex, handleChapterClick]);

  const handlePrev = useCallback(() => {
    if (hasPrevChapter) {
      setActiveChapterIndex(activeChapterIndex - 1);
    }
  }, [hasPrevChapter, activeChapterIndex]);

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiBookOpenText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{metadata.title}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
            {metadata.depth}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedChapters.length}/{chapters.length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex" style={{ minHeight: '300px', maxHeight: '500px' }}>
        {/* Sidebar: Chapter List */}
        <div className="w-48 border-r border-border/50 bg-muted/10">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {chapters.map((chapter, index) => (
                <ChapterListItem
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  isActive={index === activeChapterIndex}
                  isCompleted={completedChapters.includes(index)}
                  onClick={() => handleChapterClick(index)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chapter Header */}
          <div className="px-4 py-2 border-b border-border/30">
            <div className="text-xs text-muted-foreground">
              Chapter {activeChapterIndex + 1} of {chapters.length}
            </div>
            <h3 className="font-semibold text-sm">
              {chapters[activeChapterIndex]?.title}
            </h3>
          </div>

          {/* Chapter Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {isGenerating ? (
                <div className="flex items-center justify-center py-8">
                  <PiSpinner className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Generating chapter...
                  </span>
                </div>
              ) : activeChapterContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{activeChapterContent}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <PiBookOpenText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Click to generate this chapter
                  </p>
                  <Button
                    size="sm"
                    onClick={() => onGenerateChapter(activeChapterIndex)}
                  >
                    Generate Chapter
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Navigation */}
          <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={!hasPrevChapter}
            >
              <PiArrowLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>

            {activeChapterContent && !completedChapters.includes(activeChapterIndex) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkComplete(activeChapterIndex)}
              >
                <PiCheck className="h-3.5 w-3.5 mr-1" />
                Complete
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              disabled={!hasNextChapter}
            >
              Next
              <PiArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LearningSurfaceInline;
