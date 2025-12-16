/**
 * Surface Skeletons - Loading placeholders for surface pages
 * 
 * Provides surface-type-specific skeleton loading that mimics the final UI structure.
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SurfacePageSkeletonProps {
  type: string;
  className?: string;
}

/**
 * Main skeleton wrapper - renders specific skeleton based on surface type
 */
export function SurfacePageSkeleton({ type, className }: SurfacePageSkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-card/80 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24 bg-muted dark:bg-muted/50" />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Skeleton className="h-5 w-16 bg-muted dark:bg-muted/50" />
          </div>
          <Skeleton className="h-5 w-48 hidden md:block bg-muted dark:bg-muted/50" />
          <Skeleton className="h-8 w-8 rounded-md bg-muted dark:bg-muted/50" />
        </div>
      </header>

      {/* Content skeleton based on type */}
      <main className="container max-w-6xl mx-auto px-4 py-6 md:px-6">
        {type === 'learning' && <LearningSkeleton />}
        {type === 'guide' && <GuideSkeleton />}
        {type === 'quiz' && <QuizSkeleton />}
        {type === 'flashcard' && <FlashcardSkeleton />}
        {type === 'wiki' && <WikiSkeleton />}
        {type === 'comparison' && <ComparisonSkeleton />}
        {type === 'timeline' && <TimelineSkeleton />}
        {type === 'finance' && <FinanceSkeleton />}
        {type === 'research' && <ResearchSkeleton />}
        {!['learning', 'guide', 'quiz', 'flashcard', 'wiki', 'comparison', 'timeline', 'finance', 'research'].includes(type) && <DefaultSkeleton />}
      </main>
    </div>
  );
}

/**
 * Learning/Course Surface Skeleton
 */
export function LearningSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-24 rounded-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-8 w-3/4 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-2/3 bg-muted dark:bg-muted/50" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-5 w-24 bg-muted dark:bg-muted/50" />
                <Skeleton className="h-5 w-20 bg-muted dark:bg-muted/50" />
              </div>
            </div>
            <Skeleton className="h-24 w-24 rounded-xl bg-muted dark:bg-muted/50" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-6 w-6 rounded-full bg-muted dark:bg-muted/50" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 bg-muted dark:bg-muted/50" />
                <Skeleton className="h-3 w-1/2 bg-muted dark:bg-muted/50" />
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 space-y-4">
            <Skeleton className="h-6 w-1/4 bg-muted dark:bg-muted/50" />
            <Skeleton className="h-8 w-2/3 bg-muted dark:bg-muted/50" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-5/6 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-4/5 bg-muted dark:bg-muted/50" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Guide Surface Skeleton
 */
export function GuideSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-8 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-6 w-24 rounded-full bg-muted dark:bg-muted/50" />
            <Skeleton className="h-8 w-3/4 bg-muted dark:bg-muted/50" />
            <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-5 w-20 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-5 w-24 bg-muted dark:bg-muted/50" />
            </div>
          </div>
          <Skeleton className="h-20 w-20 rounded-xl bg-muted dark:bg-muted/50" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-lg bg-muted dark:bg-muted/50" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2 bg-muted dark:bg-muted/50" />
                <Skeleton className="h-4 w-1/4 bg-muted dark:bg-muted/50" />
              </div>
              <Skeleton className="h-5 w-5 bg-muted dark:bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Quiz Surface Skeleton
 */
export function QuizSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-muted dark:bg-muted/50" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-28 bg-muted dark:bg-muted/50" />
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 h-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="flex-1 rounded-full bg-muted dark:bg-muted/50" />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-card border rounded-2xl p-6 md:p-8 mb-6 shadow-lg space-y-6">
        <Skeleton className="h-7 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-7 w-3/4 bg-muted dark:bg-muted/50" />
        
        {/* Options */}
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/40">
              <Skeleton className="h-8 w-8 rounded-lg bg-muted dark:bg-muted/50" />
              <Skeleton className="h-5 w-3/4 bg-muted dark:bg-muted/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36 rounded-xl bg-muted dark:bg-muted/50" />
      </div>
    </div>
  );
}

/**
 * Flashcard Surface Skeleton
 */
export function FlashcardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-muted dark:bg-muted/50" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-36 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-3 w-24 bg-muted dark:bg-muted/50" />
            </div>
          </div>
          <Skeleton className="h-8 w-16 rounded bg-muted dark:bg-muted/50" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full bg-muted dark:bg-muted/50" />
      </div>

      {/* Card */}
      <div className="aspect-[3/2] rounded-2xl border-2 border-border/40 bg-card p-8 mb-8 flex flex-col items-center justify-center">
        <Skeleton className="h-8 w-3/4 mb-4 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-6 w-1/2 bg-muted dark:bg-muted/50" />
      </div>

      {/* Controls */}
      <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-11 w-11 rounded-xl bg-muted dark:bg-muted/50" />
            <Skeleton className="h-11 w-11 rounded-xl bg-muted dark:bg-muted/50" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl bg-muted dark:bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

/**
 * Wiki Surface Skeleton
 */
export function WikiSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Hero */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full bg-muted dark:bg-muted/50" />
          <Skeleton className="h-6 w-24 rounded-full bg-muted dark:bg-muted/50" />
        </div>
        <Skeleton className="h-10 w-3/4 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-2/3 bg-muted dark:bg-muted/50" />
      </div>

      {/* Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 space-y-4">
          <div className="rounded-xl p-4 space-y-2">
            <Skeleton className="h-5 w-20 bg-muted dark:bg-muted/50" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full bg-muted dark:bg-muted/50" />
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-1/3 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-4/5 bg-muted dark:bg-muted/50" />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

/**
 * Comparison Surface Skeleton
 */
export function ComparisonSkeleton() {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Hero */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-10 p-8 text-center space-y-4">
        <Skeleton className="h-10 w-10 mx-auto rounded-xl bg-muted dark:bg-muted/50" />
        <Skeleton className="h-9 w-2/3 mx-auto bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-1/2 mx-auto bg-muted dark:bg-muted/50" />
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-2xl border p-6 space-y-4">
            <Skeleton className="h-6 w-1/2 mx-auto bg-muted dark:bg-muted/50" />
            <Skeleton className="h-4 w-3/4 mx-auto bg-muted dark:bg-muted/50" />
            <div className="space-y-3 pt-4">
              <div className="bg-green-500/5 rounded-xl p-3 space-y-2">
                <Skeleton className="h-4 w-20 bg-muted dark:bg-muted/50" />
                <Skeleton className="h-3 w-full bg-muted dark:bg-muted/50" />
                <Skeleton className="h-3 w-4/5 bg-muted dark:bg-muted/50" />
              </div>
              <div className="bg-red-500/5 rounded-xl p-3 space-y-2">
                <Skeleton className="h-4 w-20 bg-muted dark:bg-muted/50" />
                <Skeleton className="h-3 w-full bg-muted dark:bg-muted/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Timeline Surface Skeleton
 */
export function TimelineSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Hero */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-10 p-8 text-center space-y-4">
        <Skeleton className="h-10 w-10 mx-auto rounded-xl bg-muted dark:bg-muted/50" />
        <Skeleton className="h-9 w-2/3 mx-auto bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-1/2 mx-auto bg-muted dark:bg-muted/50" />
      </div>

      {/* Timeline Events */}
      <div className="relative px-4">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative flex gap-8 md:grid md:grid-cols-2 md:gap-12">
              <div className="hidden md:block">
                <Skeleton className="h-8 w-24 bg-muted dark:bg-muted/50" />
              </div>
              <div className="pl-12 md:pl-0">
                <div className="bg-card rounded-2xl border p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 bg-muted dark:bg-muted/50" />
                  <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
                  <Skeleton className="h-4 w-2/3 bg-muted dark:bg-muted/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Finance Surface Skeleton
 */
export function FinanceSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Hero */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-8 p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 bg-muted dark:bg-muted/50" />
            <Skeleton className="h-5 w-32 bg-muted dark:bg-muted/50" />
          </div>
          <Skeleton className="h-12 w-32 rounded-xl bg-muted dark:bg-muted/50" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border/40 rounded-2xl p-6 h-64">
          <Skeleton className="h-5 w-24 mb-4 bg-muted dark:bg-muted/50" />
          <Skeleton className="h-full w-full rounded-lg bg-muted dark:bg-muted/50" />
        </div>
        <div className="bg-card border border-border/40 rounded-2xl p-6 h-64">
          <Skeleton className="h-5 w-24 mb-4 bg-muted dark:bg-muted/50" />
          <Skeleton className="h-full w-full rounded-lg bg-muted dark:bg-muted/50" />
        </div>
      </div>

      {/* Data Panels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
            <Skeleton className="h-4 w-16 bg-muted dark:bg-muted/50" />
            <Skeleton className="h-6 w-24 bg-muted dark:bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Research Surface Skeleton
 */
export function ResearchSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Hero */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-4 w-32 bg-muted dark:bg-muted/50" />
          <Skeleton className="h-4 w-20 bg-muted dark:bg-muted/50" />
        </div>
        <Skeleton className="h-10 w-3/4 bg-muted dark:bg-muted/50" />
      </div>

      {/* Abstract */}
      <div className="mb-8 p-6 bg-secondary/30 border border-border/40 rounded-xl space-y-3">
        <Skeleton className="h-5 w-24 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-3/4 bg-muted dark:bg-muted/50" />
      </div>

      {/* Layout */}
      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg bg-muted dark:bg-muted/50" />
          ))}
        </aside>
        <main className="flex-1 space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-1/3 bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
              <Skeleton className="h-4 w-4/5 bg-muted dark:bg-muted/50" />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

/**
 * Default/Fallback Skeleton
 */
export function DefaultSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300 space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-5 w-4/5 bg-muted dark:bg-muted/50" />
      </div>
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-1/4 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-3/4 bg-muted dark:bg-muted/50" />
      </div>
    </div>
  );
}

/**
 * Content Generation Skeletons - For in-component loading states
 */

/**
 * Chapter content skeleton for Learning surface
 */
export function ChapterContentSkeleton() {
  return (
    <div className="py-8 animate-in fade-in duration-300 space-y-4">
      <Skeleton className="h-6 w-1/3 bg-muted dark:bg-muted/50" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-5/6 bg-muted dark:bg-muted/50" />
      </div>
      <Skeleton className="h-5 w-1/4 mt-6 bg-muted dark:bg-muted/50" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-4/5 bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
      </div>
    </div>
  );
}

/**
 * Step content skeleton for Guide surface
 */
export function StepContentSkeleton() {
  return (
    <div className="py-6 animate-in fade-in duration-300 space-y-4">
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-4 w-3/4 bg-muted dark:bg-muted/50" />
      </div>
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <Skeleton className="h-4 w-4 rounded-full mt-0.5 bg-muted dark:bg-muted/50" />
            <Skeleton className="h-4 w-full bg-muted dark:bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Question skeleton for Quiz surface
 */
export function QuestionSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-300">
      <div className="bg-card border rounded-2xl p-6 md:p-8 space-y-6">
        <Skeleton className="h-7 w-full bg-muted dark:bg-muted/50" />
        <Skeleton className="h-7 w-3/4 bg-muted dark:bg-muted/50" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/40">
              <Skeleton className="h-8 w-8 rounded-lg bg-muted dark:bg-muted/50" />
              <Skeleton className="h-5 w-3/4 bg-muted dark:bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Card skeleton for Flashcard surface
 */
export function FlashcardCardSkeleton() {
  return (
    <div className="aspect-[3/2] rounded-2xl border-2 border-border/40 bg-card p-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <Skeleton className="h-8 w-3/4 mb-4 bg-muted dark:bg-muted/50" />
      <Skeleton className="h-6 w-1/2 bg-muted dark:bg-muted/50" />
    </div>
  );
}
