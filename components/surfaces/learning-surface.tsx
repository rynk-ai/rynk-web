/**
 * Learning Surface - Full Page Component
 * 
 * Course-style learning experience with chapters, progress tracking, and navigation.
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/prompt-kit/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LearningSurfaceProps {
  metadata: LearningMetadata;
  surfaceState: SurfaceState;
  onGenerateChapter: (chapterIndex: number) => Promise<void>;
  onMarkComplete: (chapterIndex: number) => void;
  isGenerating: boolean;
  className?: string;
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
    // Auto-advance to next chapter if available
    if (hasNextChapter) {
      handleNext();
    }
  }, [activeChapterIndex, onMarkComplete, hasNextChapter, handleNext]);

  return (
    <div className={cn("max-w-6xl mx-auto", className)}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
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
                {metadata.depth}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm font-medium text-muted-foreground">
              {completedChapters.length}/{chapters.length} chapters
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar: Chapter List */}
        <aside className="col-span-3">
          <Card className="sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Chapters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <nav className="space-y-1">
                {chapters.map((chapter, index) => {
                  const isActive = index === activeChapterIndex;
                  const isCompleted = completedChapters.includes(index);
                  
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => handleChapterClick(index)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2",
                        isActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <span className="flex-1 text-sm truncate">{chapter.title}</span>
                      {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main: Chapter Content */}
        <main className="col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Chapter {activeChapterIndex + 1} of {chapters.length}
                  </p>
                  <CardTitle className="text-2xl mt-1">
                    {chapters[activeChapterIndex]?.title}
                  </CardTitle>
                </div>
                {chapters[activeChapterIndex]?.estimatedTime > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {chapters[activeChapterIndex].estimatedTime} min
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                      Generating chapter content...
                    </p>
                  </div>
                </div>
              ) : activeChapterContent ? (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <Markdown>{activeChapterContent}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Ready to learn this chapter?
                  </p>
                  <Button onClick={() => onGenerateChapter(activeChapterIndex)}>
                    Generate Chapter Content
                  </Button>
                </div>
              )}
            </CardContent>
            
            {/* Footer Navigation */}
            {activeChapterContent && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
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
                  <Button onClick={handleMarkComplete} variant="outline" className="gap-2">
                    <Check className="h-4 w-4" />
                    Mark Complete
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={!hasNextChapter}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
});

export default LearningSurface;
