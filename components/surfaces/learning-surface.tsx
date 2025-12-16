/**
 * Learning Surface - Premium Full Page Component
 * 
 * Course-style learning experience with modern UI, progress tracking,
 * and engaging animations.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { LearningMetadata, SurfaceState } from "@/lib/services/domain-types";
import {
  BookOpen,
  Check,
  Clock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  GraduationCap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { ChapterContentSkeleton } from "@/components/surfaces/surface-skeletons";

interface LearningSurfaceProps {
  metadata: LearningMetadata;
  surfaceState: SurfaceState;
  onGenerateChapter: (chapterIndex: number) => Promise<void>;
  onMarkComplete: (chapterIndex: number) => void;
  isGenerating: boolean;
  className?: string;
}

// Circular progress ring component
function ProgressRing({ progress, size = 80, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export const LearningSurface = memo(function LearningSurface({
  metadata,
  surfaceState,
  onGenerateChapter,
  onMarkComplete,
  isGenerating,
  className,
}: LearningSurfaceProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(
    surfaceState?.learning?.currentChapter ?? 0
  );

  const chapters = metadata.chapters || [];
  const completedChapters = surfaceState?.learning?.completedChapters || [];
  const chaptersContent = surfaceState?.learning?.chaptersContent || {};
  const activeChapterContent = chaptersContent[activeChapterIndex] || null;
  const availableImages = surfaceState?.availableImages || [];
  
  const progress = chapters.length > 0 
    ? Math.round((completedChapters.length / chapters.length) * 100) 
    : 0;

  const hasNextChapter = activeChapterIndex < chapters.length - 1;
  const hasPrevChapter = activeChapterIndex > 0;
  const isComplete = completedChapters.length === chapters.length && chapters.length > 0;

  const handleChapterClick = useCallback((index: number) => {
    setActiveChapterIndex(index);
    if (!chaptersContent[index]) {
      onGenerateChapter(index);
    }
  }, [chaptersContent, onGenerateChapter]);

  const handleNext = useCallback(() => {
    if (hasNextChapter) {
      const nextIndex = activeChapterIndex + 1;
      setActiveChapterIndex(nextIndex);
      if (!chaptersContent[nextIndex]) {
        onGenerateChapter(nextIndex);
      }
    }
  }, [hasNextChapter, activeChapterIndex, chaptersContent, onGenerateChapter]);

  const handlePrev = useCallback(() => {
    if (hasPrevChapter) {
      setActiveChapterIndex(activeChapterIndex - 1);
    }
  }, [hasPrevChapter, activeChapterIndex]);

  const handleMarkComplete = useCallback(() => {
    onMarkComplete(activeChapterIndex);
    if (hasNextChapter) {
      handleNext();
    }
  }, [activeChapterIndex, onMarkComplete, hasNextChapter, handleNext]);

  return (
    <div className={cn("max-w-6xl mx-auto", className)}>
      {/* Hero Images */}
      {availableImages.length > 0 && (
        <div className="mb-6 grid grid-cols-3 md:grid-cols-4 gap-2">
          {availableImages.slice(0, 4).map((img, idx) => (
            <a
              key={idx}
              href={img.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-lg overflow-hidden bg-secondary/50"
            >
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {/* Clean Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Course Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                  metadata.depth === 'basic' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  metadata.depth === 'intermediate' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  metadata.depth === 'advanced' && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                  metadata.depth === 'expert' && "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  {metadata.depth}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">{metadata.title}</h1>
              <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">{metadata.description}</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 opacity-70" />
                  {chapters.length} chapters
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-70" />
                  ~{metadata.estimatedTime} min
                </span>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-xl">
              <ProgressRing progress={progress} size={80} strokeWidth={6} />
              <span className="text-sm text-muted-foreground mt-2">
                {completedChapters.length} of {chapters.length}
              </span>
              {isComplete && (
                <div className="flex items-center gap-1.5 mt-2 text-primary">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-semibold">Complete!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar: Chapter List */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="sticky top-20">
            <h2 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">
              Chapters
            </h2>
            <nav className="space-y-1">
              {chapters.map((chapter, index) => {
                const isActive = index === activeChapterIndex;
                const isCompleted = completedChapters.includes(index);
                const hasContent = !!chaptersContent[index];
                
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterClick(index)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-all group",
                      isActive 
                        ? "bg-secondary shadow-sm" 
                        : "hover:bg-secondary/50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status indicator */}
                      <div className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                        isCompleted 
                          ? "bg-green-500 text-white" 
                          : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}>
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary",
                        )}>
                          {chapter.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {chapter.estimatedTime} min
                          {hasContent && !isCompleted && (
                            <span className="text-primary">• In progress</span>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main: Chapter Content */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg">
            {/* Chapter Header */}
            <div className="px-6 py-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Chapter {activeChapterIndex + 1} of {chapters.length}
                  </p>
                  <h2 className="text-xl font-semibold mt-1">
                    {chapters[activeChapterIndex]?.title}
                  </h2>
                </div>
                {chapters[activeChapterIndex]?.estimatedTime > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                    <Clock className="h-4 w-4" />
                    {chapters[activeChapterIndex].estimatedTime} min
                  </span>
                )}
              </div>
            </div>
            
            {/* Chapter Content */}
            <div className="p-6 md:p-8">
              {isGenerating ? (
                <ChapterContentSkeleton />
              ) : activeChapterContent ? (
                <div className="prose prose-lg dark:prose-invert max-w-none
                  prose-headings:scroll-mt-20
                  prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
                  prose-p:leading-relaxed prose-p:text-muted-foreground
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl
                  prose-ul:my-4 prose-li:text-muted-foreground
                  prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4
                ">
                  <Markdown>{activeChapterContent}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Ready to learn?</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Click below to generate the content for this chapter.
                  </p>
                  <Button onClick={() => onGenerateChapter(activeChapterIndex)} size="lg" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Chapter
                  </Button>
                </div>
              )}
            </div>
            
            {/* Footer Navigation */}
            {activeChapterContent && (
              <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  disabled={!hasPrevChapter}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                {!completedChapters.includes(activeChapterIndex) && (
                  <Button onClick={handleMarkComplete} className="gap-2">
                    <Check className="h-4 w-4" />
                    Mark Complete
                  </Button>
                )}

                <Button
                  variant={hasNextChapter ? "default" : "ghost"}
                  onClick={handleNext}
                  disabled={!hasNextChapter}
                  className="gap-2"
                >
                  {hasNextChapter ? "Next Chapter" : "Finished"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
});

export default LearningSurface;
