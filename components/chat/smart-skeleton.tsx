'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import type { ResponseType } from "@/lib/types/citation"
import { cn } from "@/lib/utils"

interface SmartSkeletonProps {
  queryType?: ResponseType
  className?: string
}

export function SmartSkeleton({ queryType, className }: SmartSkeletonProps) {
  
  // Render different skeletons based on query type
  const renderSkeleton = () => {
    switch (queryType) {
      case 'comparison':
        return <ComparisonSkeleton />
      case 'list_items':
        return <ListSkeleton />
      case 'step_by_step':
        return <StepsSkeleton />
      case 'current_events':
        return <NewsSkeleton />
      case 'quick_answer':
        return <QuickAnswerSkeleton />
      default:
        return <StandardSkeleton />
    }
  }
  
  return (
    <div className={cn("w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500", className)}>
      {renderSkeleton()}
    </div>
  )
}

function StandardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

function QuickAnswerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/2 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

function ComparisonSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 justify-center">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <div className="text-muted-foreground font-medium">vs</div>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3 p-4 border border-border/40 rounded-xl bg-muted/20">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-3 p-4 border border-border/40 rounded-xl bg-muted/20">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/3 mb-4" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

function StepsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="relative pl-6 border-l-2 border-muted">
          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-muted" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

function NewsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Breaking news banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span className="animate-pulse">Gathering latest information...</span>
      </div>
      
      {/* Preview cards */}
      <div className="grid gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <Skeleton className="h-16 w-24 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
