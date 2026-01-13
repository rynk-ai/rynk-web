'use client'

import { memo, useMemo } from 'react'
import { 
  PiFile, 
  PiDatabase, 
  PiGlobe, 
  PiSparkle, 
  PiCheck,
  PiSpinner,
} from 'react-icons/pi'
import { cn } from '@/lib/utils'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought"
import { LiveSourcePills, type DiscoveredSource } from "@/components/chat/live-source-pills"
import { getFaviconUrl, getDomainName } from "@/lib/types/citation"
import type { StatusPill, StatusMetadata } from '@/lib/utils/stream-parser'
import type { IndexingJob } from '@/lib/hooks/use-indexing-queue'

// Server-side PDF job status (from /api/pdf/status)
export interface PDFJob {
  jobId: string
  fileName: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

export interface ProcessingStage {
  id: 'files' | 'context' | 'search' | 'generate'
  label: string
  status: 'pending' | 'active' | 'complete' | 'skipped'
  description?: string
  metadata?: StatusMetadata & {
    jobs?: IndexingJob[]
    pdfJobs?: PDFJob[]  // Server-side PDF jobs
  }
}

interface SearchSource {
  url: string
  title: string
  snippet?: string
}

interface SearchResults {
  sources: SearchSource[]
}

interface ProcessingTimelineProps {
  statusPills: StatusPill[]
  indexingJobs?: IndexingJob[]
  pdfJobs?: PDFJob[]  // Server-side PDF processing jobs
  isStreaming: boolean
  hasContent: boolean
  searchResults?: SearchResults | null
  className?: string
}

// Map status pill types to processing stages
function deriveStages(
  statusPills: StatusPill[],
  indexingJobs: IndexingJob[] = [],
  pdfJobs: PDFJob[] = [],
  isStreaming: boolean,
  hasContent: boolean
): ProcessingStage[] {
  const stages: ProcessingStage[] = []
  
  // Get the latest status
  const latestStatus = statusPills.length > 0 ? statusPills[statusPills.length - 1] : null
  const currentStatus = latestStatus?.status
  
  // Check if we have any status that indicates web search happened
  const hasSearched = statusPills.some(s => 
    s.status === 'searching' || s.status === 'reading_sources'
  )
  
  // Check if context was built
  const hasBuiltContext = statusPills.some(s => s.status === 'building_context')
  const contextPill = statusPills.find(s => s.status === 'building_context')
  
  // 1. Files stage - show if there are indexing jobs OR PDF jobs
  const activeJobs = indexingJobs.filter(j => j.status !== 'completed' && j.status !== 'failed')
  const activePdfJobs = pdfJobs.filter(j => j.status !== 'completed' && j.status !== 'failed')
  const hasFiles = indexingJobs.length > 0 || pdfJobs.length > 0
  
  if (hasFiles) {
    const allIndexingComplete = indexingJobs.every(j => j.status === 'completed')
    const allPdfComplete = pdfJobs.every(j => j.status === 'completed')
    const allComplete = allIndexingComplete && allPdfComplete
    const totalFiles = indexingJobs.length + pdfJobs.length
    const completedFiles = indexingJobs.filter(j => j.status === 'completed').length + 
                          pdfJobs.filter(j => j.status === 'completed').length
    
    stages.push({
      id: 'files',
      label: allComplete ? 'Files processed' : 'Processing files',
      status: allComplete ? 'complete' : (activeJobs.length > 0 || activePdfJobs.length > 0 ? 'active' : 'pending'),
      description: `${completedFiles}/${totalFiles} files indexed`,
      metadata: {
        jobs: indexingJobs,
        pdfJobs: pdfJobs,
        filesProcessed: completedFiles,
        totalFiles: totalFiles
      }
    })
  }
  
  // 2. Context stage
  if (hasBuiltContext || hasSearched || currentStatus === 'synthesizing' || hasContent) {
    const isContextComplete = hasSearched || currentStatus === 'synthesizing' || hasContent
    const contextChunks = contextPill?.metadata?.contextChunks
    
    stages.push({
      id: 'context',
      label: isContextComplete 
        ? `Retrieved ${contextChunks || 'relevant'} context${contextChunks && contextChunks > 1 ? ' chunks' : ' chunk'}` 
        : 'Building context',
      status: isContextComplete
        ? 'complete' 
        : currentStatus === 'building_context' 
          ? 'active' 
          : 'pending',
      description: contextChunks 
        ? `Found ${contextChunks} relevant pieces of information from your knowledge base` 
        : 'Searching through conversation history and knowledge base',
      metadata: contextPill?.metadata
    })
  }
  
  // 3. Search / Deep Research stage
  const hasDeepResearch = statusPills.some(s => s.status === 'planning' || s.status === 'researching');
  
  if (hasSearched || hasDeepResearch) {
    const searchPill = statusPills.find(s => 
      s.status === 'reading_sources' || 
      s.status === 'searching' ||
      s.status === 'planning' ||
      s.status === 'researching'
    )
    const isSearchComplete = currentStatus === 'synthesizing' || hasContent
    const sourceCount = searchPill?.metadata?.sourceCount
    
    // Determine label and description based on mode
    let label = hasDeepResearch ? 'Deep Research' : 'Web Search';
    let description = 'Finding relevant sources';
    
    if (isSearchComplete) {
       label = hasDeepResearch 
         ? `Researched ${sourceCount || ''} sources` 
         : `Found ${sourceCount || ''} sources`;
       description = `Gathered information from ${sourceCount || 0} sources`;
    } else {
       if (currentStatus === 'planning') {
         description = 'Formulating research strategy...';
       } else if (currentStatus === 'researching') {
         description = searchPill?.message || 'Conducting deep research...';
       } else if (searchPill?.metadata?.currentSource) {
         description = `Reading: ${searchPill.metadata.currentSource}`;
       }
    }

    stages.push({
      id: 'search',
      label: label,
      status: isSearchComplete 
        ? 'complete' 
        : (currentStatus === 'searching' || currentStatus === 'reading_sources' || currentStatus === 'planning' || currentStatus === 'researching')
          ? 'active'
          : 'pending',
      description: description,
      metadata: searchPill?.metadata
    })
  }
  
  // 4. Generate stage - always show when streaming or has content
  if (isStreaming || hasContent || currentStatus === 'synthesizing') {
    stages.push({
      id: 'generate',
      label: hasContent ? 'Response complete' : 'Generating response',
      status: hasContent 
        ? 'complete' 
        : isStreaming || currentStatus === 'synthesizing'
          ? 'active'
          : 'pending',
      description: hasContent 
        ? undefined
        : 'Synthesizing information into a comprehensive answer'
    })
  }
  
  return stages
}

// Icon component for each stage
function StageIcon({ 
  stageId, 
  status 
}: { 
  stageId: ProcessingStage['id']
  status: ProcessingStage['status']
}) {
  const iconClass = "size-4"
  
  if (status === 'complete') {
    return <PiCheck className={cn(iconClass, "text-primary")} />
  }
  
  if (status === 'active') {
    return <PiSpinner className={cn(iconClass, "animate-spin text-primary")} />
  }
  
  // Pending/default icons
  switch (stageId) {
    case 'files':
      return <PiFile className={iconClass} />
    case 'context':
      return <PiDatabase className={iconClass} />
    case 'search':
      return <PiGlobe className={iconClass} />
    case 'generate':
      return <PiSparkle className={iconClass} />
    default:
      return <PiSparkle className={iconClass} />
  }
}

export const ProcessingTimeline = memo(function ProcessingTimeline({
  statusPills,
  indexingJobs = [],
  pdfJobs = [],
  isStreaming,
  hasContent,
  searchResults,
  className
}: ProcessingTimelineProps) {
  // Derive stages from status pills and indexing jobs
  const stages = useMemo(
    () => deriveStages(statusPills, indexingJobs, pdfJobs, isStreaming, hasContent),
    [statusPills, indexingJobs, pdfJobs, isStreaming, hasContent]
  )
  
  // Only show stages that are active or complete (not pending/future stages)
  const visibleStages = useMemo(
    () => stages.filter(s => s.status === 'active' || s.status === 'complete'),
    [stages]
  )
  
  // Convert search results to discovered sources for display
  const discoveredSources = useMemo(() => {
    if (!searchResults?.sources) return []
    return searchResults.sources.map(source => ({
      url: source.url,
      title: source.title,
      domain: getDomainName(source.url),
      favicon: getFaviconUrl(source.url),
      snippet: source.snippet,
      isNew: true,
    })) satisfies DiscoveredSource[]
  }, [searchResults])
  
  // Don't render if no visible stages
  if (visibleStages.length === 0) {
    return null
  }
  
  // Don't render if everything is complete and we have content
  const allComplete = visibleStages.every(s => s.status === 'complete')
  if (allComplete && hasContent && !isStreaming) {
    return null
  }
  
  return (
    <div className={cn("w-full max-w-3xl mx-auto mb-4", className)}>
      <ChainOfThought>
        {visibleStages.map((stage, index) => (
          <ChainOfThoughtStep 
            key={stage.id} 
            defaultOpen={stage.status === 'active'}
          >
            <ChainOfThoughtTrigger 
              leftIcon={<StageIcon stageId={stage.id} status={stage.status} />}
              className={cn(
                stage.status === 'active' && "text-foreground font-medium",
                stage.status === 'complete' && "text-muted-foreground"
              )}
            >
              {stage.label}
            </ChainOfThoughtTrigger>
            
            <ChainOfThoughtContent>
              {/* Description */}
              {stage.description && (
                <ChainOfThoughtItem>
                  {stage.description}
                </ChainOfThoughtItem>
              )}
              
              {/* File list for files stage */}
              {stage.id === 'files' && stage.metadata?.jobs && (
                <>
                  {stage.metadata.jobs.map(job => (
                    <ChainOfThoughtItem key={job.id} className="flex items-center gap-2">
                      <PiFile className="size-3.5 shrink-0" />
                      <span className="truncate">{job.fileName}</span>
                      {job.status === 'completed' ? (
                        <PiCheck className="size-3.5 text-primary shrink-0" />
                      ) : job.status === 'failed' ? (
                        <span className="text-destructive text-xs">Failed</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {job.progress}%
                        </span>
                      )}
                    </ChainOfThoughtItem>
                  ))}
                </>
              )}
              
              {/* Server-side PDF jobs */}
              {stage.id === 'files' && stage.metadata?.pdfJobs && (
                <>
                  {stage.metadata.pdfJobs.map(job => (
                    <ChainOfThoughtItem key={job.jobId} className="flex items-center gap-2">
                      <PiFile className="size-3.5 shrink-0" />
                      <span className="truncate">{job.fileName}</span>
                      {job.status === 'completed' ? (
                        <PiCheck className="size-3.5 text-primary shrink-0" />
                      ) : job.status === 'failed' ? (
                        <span className="text-destructive text-xs">Failed</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {job.progress}%
                        </span>
                      )}
                    </ChainOfThoughtItem>
                  ))}
                </>
              )}

              
              {/* Source pills for search stage */}
              {stage.id === 'search' && discoveredSources.length > 0 && (
                <ChainOfThoughtItem>
                  <LiveSourcePills
                    sources={discoveredSources}
                    isSearching={stage.status === 'active'}
                  />
                </ChainOfThoughtItem>
              )}
            </ChainOfThoughtContent>
          </ChainOfThoughtStep>
        ))}
      </ChainOfThought>
    </div>
  )
})

export default ProcessingTimeline
