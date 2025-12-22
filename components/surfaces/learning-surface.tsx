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
  PiBookOpenText,
  PiCheck,
  PiClock,
  PiSpinner,
  PiArrowRight,
  PiArrowLeft,
  PiCaretRight,
  PiSparkle,
  PiTrophy,
  PiStudent,
  PiTarget,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { ChapterContentSkeleton } from "@/components/surfaces/surface-skeletons";
import { SelectableContent } from "@/components/selectable-content";

interface LearningSurfaceProps {
  metadata: LearningMetadata;
  surfaceState: SurfaceState;
  onGenerateChapter: (chapterIndex: number) => Promise<void>;
  onMarkComplete: (chapterIndex: number) => void;
  isGenerating: boolean;
  className?: string;
  surfaceId?: string;  // For subchat functionality
  onSubChatSelect?: (text: string, sectionId?: string, fullContent?: string) => void;
  sectionIdsWithSubChats?: Set<string>;  // Sections that have existing subchats
  // Add conversationId prop to match page.tsx usage
  conversationId?: string;
  completedChapters?: number[];
  content?: Record<number, string>;
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
          className="text-primary transition-all duration-500 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold font-mono tracking-tight">{Math.round(progress)}%</span>
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
  surfaceId,
  onSubChatSelect,
  sectionIdsWithSubChats,
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
        <div className="mb-8 grid grid-cols-3 md:grid-cols-4 gap-3">
          {availableImages.slice(0, 4).map((img, idx) => (
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
            {/* Course Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  metadata.depth === 'basic' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  metadata.depth === 'intermediate' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  metadata.depth === 'advanced' && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                  metadata.depth === 'expert' && "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  {metadata.depth}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display text-foreground">{metadata.title}</h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">{metadata.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-2">
                  <PiBookOpenText className="h-4 w-4 opacity-70" />
                  {chapters.length} chapters
                </span>
                <span className="flex items-center gap-2">
                  <PiClock className="h-4 w-4 opacity-70" />
                  ~{metadata.estimatedTime} min
                </span>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="flex flex-col items-center justify-center p-6 bg-background/50 backdrop-blur-sm border border-border/20 rounded-2xl min-w-[140px]">
              <ProgressRing progress={progress} size={88} strokeWidth={6} />
              <div className="mt-3 text-center">
                 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                 <p className="text-sm font-medium text-foreground">{completedChapters.length} / {chapters.length}</p>
              </div>
              {isComplete && (
                <div className="flex items-center gap-1.5 mt-3 text-primary animate-in zoom-in duration-300">
                  <PiTrophy className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Complete!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8 lg:gap-12">
        {/* Sidebar: Chapter List */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="sticky top-24">
            <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
               <PiStudent className="h-3.5 w-3.5" />
               Course Content
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
                      "w-full text-left px-3 py-3 rounded-lg transition-all group border border-transparent",
                      isActive 
                        ? "bg-muted border-border/40 shadow-sm" 
                        : "hover:bg-muted/50 hover:border-border/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all mt-0.5",
                        isCompleted 
                          ? "bg-green-500 text-white" 
                          : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted-foreground/20 text-muted-foreground",
                      )}>
                        {isCompleted ? (
                          <PiCheck className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-medium leading-snug",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                        )}>
                          {chapter.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5 mt-1.5 font-medium">
                          <PiClock className="h-3 w-3" />
                          {chapter.estimatedTime} min
                          {hasContent && !isCompleted && (
                            <span className="text-primary flex items-center gap-1">
                               • In progress
                            </span>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <PiCaretRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
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
          <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm min-h-[500px] flex flex-col">
            {/* Chapter Header */}
            <div className="px-8 py-6 border-b border-border/30 bg-muted/5">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    Chapter {activeChapterIndex + 1}
                 </span>
                 {chapters[activeChapterIndex]?.estimatedTime > 0 && (
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border/20 rounded-full shadow-sm">
                    <PiClock className="h-3.5 w-3.5" />
                    {chapters[activeChapterIndex].estimatedTime} min read
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground font-display">
                {chapters[activeChapterIndex]?.title}
              </h2>
            </div>
            
            {/* Chapter Content */}
            <div className="p-8 md:p-10 flex-1">
              {isGenerating ? (
                <ChapterContentSkeleton />
              ) : activeChapterContent ? (
                <div className="prose prose-lg dark:prose-invert max-w-none
                  prose-headings:font-display prose-headings:tracking-tight
                  prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-lg prose-h3:font-medium prose-h3:mt-8 prose-h3:mb-3
                  prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:mb-6
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium
                  prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-xl prose-pre:p-4
                  prose-ul:my-6 prose-li:text-muted-foreground/90 prose-li:my-1
                  prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-muted/10 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:italic
                ">
                  <SelectableContent
                    sectionId={`chapter-${activeChapterIndex}`}
                    onSelect={onSubChatSelect || (() => {})}
                    disabled={!onSubChatSelect}
                  >
                    <Markdown>{activeChapterContent}</Markdown>
                  </SelectableContent>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mb-6">
                    <PiBookOpenText className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Ready to learn?</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm">
                    Generate the content for <span className="font-medium text-foreground">{chapters[activeChapterIndex]?.title}</span> to start learning.
                  </p>
                  <Button onClick={() => onGenerateChapter(activeChapterIndex)} size="lg" className="gap-2 shadow-lg shadow-primary/20">
                    <PiSparkle className="h-4 w-4" />
                    Generate Chapter
                  </Button>
                </div>
              )}
            </div>
            
            {/* Footer Navigation */}
            {activeChapterContent && (
              <div className="px-8 py-5 border-t border-border/30 bg-muted/5 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  disabled={!hasPrevChapter}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <PiArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                {!completedChapters.includes(activeChapterIndex) && (
                  <Button onClick={handleMarkComplete} className="gap-2 shadow-md hover:shadow-lg transition-all" variant="outline">
                    <PiCheck className="h-4 w-4 text-green-500" />
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
                  <PiArrowRight className="h-4 w-4" />
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
