/**
 * Surface Page - Full Page Takeover for Learning/Guide Surfaces
 * 
 * Route: /surface/[type]/[id]
 * - type: 'learning' or 'guide'
 * - id: conversationId
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { 
  PiArrowLeft, 
  PiSpinner, 
  PiDotsThreeVertical, 
  PiTrash, 
  PiBookOpen, 
  PiListChecks, 
  PiTarget, 
  PiScales, 
  PiStack, 
  PiCalendar,
  PiCloud,
  PiCheckCircle,
  PiTrendUp,
  PiMicroscope,
  PiXCircle
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LearningSurface } from "@/components/surfaces/learning-surface";
import { GuideSurface } from "@/components/surfaces/guide-surface";
import { QuizSurface } from "@/components/surfaces/quiz-surface";
import { ComparisonSurface } from "@/components/surfaces/comparison-surface";
import { FlashcardSurface } from "@/components/surfaces/flashcard-surface";
import { TimelineSurface } from "@/components/surfaces/timeline-surface";
import { WikiSurface } from "@/components/surfaces/wiki-surface";
import { FinanceSurface } from "@/components/surfaces/finance-surface";
import { ResearchSurface } from "@/components/surfaces/research-surface";
import { SurfacePageSkeleton, ChapterContentSkeleton, StepContentSkeleton, QuestionSkeleton, FlashcardCardSkeleton } from "@/components/surfaces/surface-skeletons";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import { useSurfaceSubChats } from "@/lib/hooks/use-surface-sub-chats";
import { cn } from "@/lib/utils";
import type { 
  SurfaceState, 
  SurfaceType, 
  LearningMetadata, 
  GuideMetadata, 
  QuizMetadata,
  ComparisonMetadata,
  FlashcardMetadata,
  TimelineMetadata,
  WikiMetadata,
  ResearchMetadata 
} from "@/lib/services/domain-types";
import { 
  generateWikiSkeleton, 
  generateWikiSection, 
  saveWikiSurface,
  retryWikiSection,
  type WebContext,
  type WikiSectionResult 
} from "@/lib/actions/wiki-actions";
import { saveResearchSurface } from "@/lib/actions/research-actions";
import { ResearchProgressPanel } from "@/components/surfaces/research-progress-panel";

// Helper to get icon and label for surface type
const getSurfaceInfo = (type: string) => {
  switch (type) {
    case 'learning': return { icon: PiBookOpen, label: 'Course', color: 'text-blue-500' };
    case 'guide': return { icon: PiListChecks, label: 'Guide', color: 'text-green-500' };
    case 'quiz': return { icon: PiTarget, label: 'Quiz', color: 'text-pink-500' };
    case 'comparison': return { icon: PiScales, label: 'Comparison', color: 'text-indigo-500' };
    case 'flashcard': return { icon: PiStack, label: 'Flashcards', color: 'text-teal-500' };
    case 'timeline': return { icon: PiCalendar, label: 'Timeline', color: 'text-amber-500' };
    case 'wiki': return { icon: PiBookOpen, label: 'Wiki', color: 'text-orange-500' };
    case 'finance': return { icon: PiTrendUp, label: 'Finance', color: 'text-emerald-500' };
    case 'research': return { icon: PiMicroscope, label: 'Research', color: 'text-purple-500' };
    default: return { icon: PiBookOpen, label: 'Surface', color: 'text-primary' };
  }
};

export default function SurfacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const surfaceType = params.type as SurfaceType;
  const conversationId = params.id as string;
  // Get query from URL param (passed from SurfaceTrigger)
  const queryFromUrl = searchParams.get('q') || "";
  // Get AI response content from URL param (base64 encoded)
  const aiResponseFromUrl = React.useMemo(() => {
    const encoded = searchParams.get('aiResponse');
    if (!encoded) return null;
    try {
      // Decode from base64 then URL decode
      return decodeURIComponent(atob(encoded));
    } catch (e) {
      console.warn('[SurfacePage] Failed to decode AI response:', e);
      return null;
    }
  }, [searchParams]);
  // Get specific surface ID from URL param (passed from SavedSurfacesPill dropdown)
  const surfaceIdFromUrl = searchParams.get('sid') || null;

  const [surfaceState, setSurfaceState] = useState<SurfaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string>("");
  const [isRestoredFromSaved, setIsRestoredFromSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Track the ID of the currently loaded surface
  const [currentSurfaceId, setCurrentSurfaceId] = useState<string | null>(null);
  // Track generation progress for UI
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    message: string;
    step?: string;
  } | null>(null);
  // Track deep research progress for ProcessingTimeline-style UI
  const [researchProgress, setResearchProgress] = useState<any>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Track mount status to force immediate skeleton loading
  const [isMounted, setIsMounted] = useState(false);

  // Surface sub-chat hook for deep dive functionality
  const {
    activeSubChat,
    subChatSheetOpen,
    setSubChatSheetOpen,
    subChatLoading,
    subChatStreamingContent,
    subChatSearchResults,
    sectionIdsWithSubChats,
    handleOpenSubChat,
    handleSubChatSendMessage,
  } = useSurfaceSubChats(
    currentSurfaceId ? { type: 'surface', id: currentSurfaceId } : null
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Track if we need to save (after state changes)
  const pendingSaveRef = useRef(false);
  // Abort controller for save requests
  const saveAbortControllerRef = useRef<AbortController | null>(null);
  // Track current surface ID in a ref to avoid stale closures in callbacks
  const currentSurfaceIdRef = useRef<string | null>(null);
  // Guard against duplicate generation in React StrictMode
  const generationStartedRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentSurfaceIdRef.current = currentSurfaceId;
  }, [currentSurfaceId]);

  // Save surface state to API
  const saveState = useCallback(async (stateToSave: SurfaceState) => {
    if (!conversationId || !surfaceType) return;
    
    // Cancel previous pending save
    if (saveAbortControllerRef.current) {
      saveAbortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    saveAbortControllerRef.current = controller;

    setIsSaving(true);
    try {
      // Use ref to get current value, avoiding stale closure
      const surfaceIdToUse = currentSurfaceIdRef.current;
      
      const response = await fetch('/api/surface/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          surfaceType,
          surfaceState: stateToSave,
          surfaceId: surfaceIdToUse, // Pass ID to update existing instead of creating new
        }),
        signal: controller.signal,
      });
      
      // Track the surface ID from response (for new surfaces)
      if (response.ok) {
        const data = await response.json() as { surfaceId?: string };
        if (data.surfaceId && !currentSurfaceIdRef.current) {
          setCurrentSurfaceId(data.surfaceId);
          currentSurfaceIdRef.current = data.surfaceId; // Update ref immediately
        }
      }
      
      // Only update UI if this is the active request
      if (!controller.signal.aborted) {
        setTimeout(() => setIsSaving(false), 800);
      }

    } catch (err) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; 
      }
      console.error('[SurfacePage] Failed to save state:', err);
      setIsSaving(false);
    } finally {
      // Cleanup ref if this was the active controller
      if (saveAbortControllerRef.current === controller) {
        saveAbortControllerRef.current = null;
      }
    }
  }, [conversationId, surfaceType]);


  // Load or generate surface on mount
  useEffect(() => {
    async function loadSurface() {
      setIsLoading(true);
      setError(null);
      // Flag to control if finally block should reset loading state
      // We don't want to reset if we exit early due to duplicate generation
      let shouldResetLoading = true;

      try {
        // Determine intent:
        // - If surfaceIdFromUrl: Load that specific surface
        // - If queryFromUrl: Generate new surface (user is creating new)
        // - If neither: Load most recent saved surface
        const shouldLoadExisting = surfaceIdFromUrl || !queryFromUrl;
        
        if (shouldLoadExisting) {
          // Step 1: Try to load persisted state
          const surfaceIdParam = surfaceIdFromUrl ? `&surfaceId=${surfaceIdFromUrl}` : '';
          const stateResponse = await fetch(
            `/api/surface/state?conversationId=${conversationId}&type=${surfaceType}${surfaceIdParam}`
          );
          
          if (stateResponse.ok) {
            const { found, surfaceState: savedState, surfaceId: loadedSurfaceId } = await stateResponse.json() as { 
              found: boolean; 
              surfaceState: SurfaceState | null;
              surfaceId: string | null;
            };
            
            if (found && savedState) {
              console.log('[SurfacePage] Loaded persisted state, id:', loadedSurfaceId);
              setSurfaceState(savedState);
              setOriginalQuery(queryFromUrl || "Restored session");
              setIsRestoredFromSaved(true);
              setCurrentSurfaceId(loadedSurfaceId);
              setIsLoading(false);
              return;
            }
          }
        }

        // Step 2: Generate new surface (either no saved state, or user wants new)
        
        // GUARD: Prevent duplicate generation (React StrictMode double-render protection)
        if (generationStartedRef.current) {
          console.log('[SurfacePage] Generation already started, skipping duplicate');
          shouldResetLoading = false; // Let the original process manage loading state
          return;
        }
        
        // Capture query BEFORE any state changes
        const query = queryFromUrl;
        if (!query) {
          console.log('[SurfacePage] No query provided, cannot generate');
          setError('No query provided for surface generation');
          setIsLoading(false);
          return;
        }
        
        generationStartedRef.current = true;
        setOriginalQuery(query);

        const response = await fetch('/api/surface/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            surfaceType,
            messageId: conversationId,
            conversationId,  // Pass for context personalization
            aiResponseContent: aiResponseFromUrl,  // Pass AI response for full context
          }),
        });

        if (!response.ok) throw new Error("Failed to generate surface");
        
        const data = await response.json() as { 
          surfaceState?: SurfaceState;
          async?: boolean;
          jobId?: string;
          mode?: 'client-orchestrated' | 'deep-research';
        };
        
        // Handle client-orchestrated parallel generation (wiki surface)
        if (data.mode === 'client-orchestrated' && surfaceType === 'wiki') {
          console.log('[SurfacePage] Client-orchestrated wiki generation starting');
          
          // Clear URL param IMMEDIATELY to prevent re-generation on refresh
          router.replace(`/surface/${surfaceType}/${conversationId}`, { scroll: false });
          
          try {
            // Step 1: Generate skeleton + fetch web context
            setGenerationProgress({ current: 1, total: 4, message: 'Researching topic...', step: 'research' });
            const { skeleton, webContext } = await generateWikiSkeleton(query);
            
            // Display skeleton immediately
            setSurfaceState(skeleton);
            setIsLoading(false);
            console.log('[SurfacePage] Wiki skeleton displayed, starting parallel section generation');
            
            // Step 2: Generate all sections in parallel
            const sections = (skeleton.metadata as WikiMetadata).sections;
            const skeletonTitle = (skeleton.metadata as WikiMetadata).title;
            const allSectionsInfo = sections.map(s => ({ id: s.id, heading: s.heading }));
            
            setGenerationProgress({ current: 2, total: 4, message: `Generating ${sections.length} sections...`, step: 'sections' });
            
            // Create promises for all sections
            const sectionPromises = sections.map((section, index) =>
              generateWikiSection(
                section.id,
                section.heading,
                skeletonTitle,
                allSectionsInfo,
                query,
                webContext
              ).then(result => ({ ...result, index, id: section.id }))
            );
            
            // Track completed sections for progress
            let completedCount = 0;
            
            // Update UI as each section completes
            for (const promise of sectionPromises) {
              promise.then(result => {
                completedCount++;
                setGenerationProgress({ 
                  current: completedCount, 
                  total: sections.length, 
                  message: `Generated ${completedCount}/${sections.length} sections`,
                  step: 'sections' 
                });
                
                setSurfaceState(prev => {
                  if (!prev) return prev;
                  const meta = prev.metadata as WikiMetadata;
                  const updatedSections = meta.sections.map((s, i) => {
                    if (i === result.index) {
                      return {
                        ...s,
                        content: result.status === 'success' ? result.content : '',
                        citations: result.citations || [],
                        images: result.images || [],
                        status: (result.status === 'success' ? 'completed' : 'failed') as 'completed' | 'failed',
                        error: result.error
                      };
                    }
                    return s;
                  });
                  return {
                    ...prev,
                    metadata: { ...meta, sections: updatedSections },
                    updatedAt: Date.now()
                  };
                });
              });
            }
            
            // Wait for all sections to complete
            const results = await Promise.allSettled(sectionPromises);
            console.log('[SurfacePage] All wiki sections completed');
            
            // Step 3: Collect images from all sections
            const allImages = results
              .filter((r): r is PromiseFulfilledResult<WikiSectionResult & { index: number; id: string }> => 
                r.status === 'fulfilled' && r.value.status === 'success'
              )
              .flatMap(r => r.value.images || [])
              .slice(0, 10);
            
            // Step 4: Save final state and deduct credit
            setGenerationProgress({ current: 4, total: 4, message: 'Saving...', step: 'save' });
            
            // Build final sections from results (not stale state)
            const finalSections = sections.map((section, index) => {
              const resultWrapper = results[index];
              if (resultWrapper.status === 'fulfilled') {
                const result = resultWrapper.value;
                return {
                  ...section,
                  content: result.status === 'success' ? result.content : '',
                  citations: result.citations || [],
                  images: result.images || [],
                  status: (result.status === 'success' ? 'completed' : 'failed') as 'completed' | 'failed',
                  error: result.error
                };
              }
              return { ...section, status: 'failed' as const, error: 'Generation failed' };
            });
            
            // Build complete final state
            const finalMetadata: WikiMetadata = {
              ...skeleton.metadata,
              sections: finalSections
            };
            
            const finalState: SurfaceState = {
              ...skeleton,
              metadata: finalMetadata,
              availableImages: allImages,
              isSkeleton: false,
              updatedAt: Date.now()
            };
            
            // Update UI state
            setSurfaceState(finalState);
            
            // Save once
            try {
              const { surfaceId } = await saveWikiSurface(conversationId, finalState);
              setCurrentSurfaceId(surfaceId);
              console.log('[SurfacePage] Wiki saved, credit deducted, id:', surfaceId);
            } catch (err) {
              console.error('[SurfacePage] Failed to save wiki:', err);
            }
            
            setGenerationProgress(null);
            return; // Exit loadSurface early
            
          } catch (wikiError) {
            console.error('[SurfacePage] Wiki generation failed:', wikiError);
            setError(wikiError instanceof Error ? wikiError.message : 'Wiki generation failed');
            setIsLoading(false);
            return;
          }
        }
        
        // Handle async response (Durable Object)
        if (data.async && data.jobId) {
          console.log('[SurfacePage] Async job started:', data.jobId);
          
          // Mark as generating for UI (enables progress panel display)
          setIsGenerating(true);
          
          // Clear URL param IMMEDIATELY to prevent re-generation on refresh
          router.replace(`/surface/${surfaceType}/${conversationId}`, { scroll: false });
          
          // Poll for completion
          let attempts = 0;
          const maxAttempts = 90; // ~2.25 minutes
          let skeletonDisplayed = false;
          let lastSkeletonUpdate = 0;
          let lastSectionCount = 0;  // Track section updates for progressive display
          
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1500));
            attempts++;
            
            try {
              const jobResponse = await fetch(`/api/jobs/${data.jobId}`);
              const jobData = await jobResponse.json() as {
                status: string;
                result?: { surfaceState: SurfaceState };
                error?: string;
                progress?: { current: number; total: number; message: string; step?: string };
                skeletonState?: SurfaceState;
                readySections?: Array<{ sectionId: string; content: string; order: number }>;
                totalSections?: number;
                completedSections?: number;
                researchProgress?: any;  // Deep research progress
              };
              
              console.log(`[SurfacePage] Poll ${attempts}: status=${jobData.status}, sections=${jobData.completedSections}/${jobData.totalSections}`, jobData.progress);
              
              // Update progress UI
              if (jobData.progress) {
                setGenerationProgress(jobData.progress);
              }
              
              // Update deep research progress for ProcessingTimeline UI
              if (jobData.researchProgress) {
                console.log('[SurfacePage] Research progress:', jobData.researchProgress.phase, jobData.researchProgress.gatheredSources);
                setResearchProgress(jobData.researchProgress);
              }
              
              // Handle skeleton_ready - display skeleton early for fast feedback
              // Handle skeleton_ready - display skeleton early for fast feedback
              // Check if we have a skeleton and if it's newer than what we've seen
              if (jobData.skeletonState && jobData.skeletonState.updatedAt > lastSkeletonUpdate) {
                console.log('[SurfacePage] Skeleton update received (newer timestamp)');
                
                const skeleton = jobData.skeletonState;
                lastSkeletonUpdate = skeleton.updatedAt;
                
                // Use flushSync to batch state updates atomically
                flushSync(() => {
                  setSurfaceState(prev => {
                    // Start with new skeleton
                    const newState = skeleton;
                    
                    // If we previously had content generated (e.g. from progressive section updates),
                    // we should try to preserve it if the IDs match, essentially merging the new skeleton
                    // with any completed work.
                    // However, normally fullSkeleton comes before sections, so direct replacement is usually safe.
                    // But if sections started arriving for the OLD skeleton, we might want to be careful.
                    // For now, simpler is better: The new skeleton is the "truth".
                    return newState;
                  });
                  setIsLoading(false);
                });
                skeletonDisplayed = true;
              }
              
              // Handle progressive section updates for ALL surface types
              if (jobData.readySections && jobData.readySections.length > lastSectionCount) {
                const newSections = jobData.readySections.slice(lastSectionCount);
                console.log(`[SurfacePage] ${newSections.length} new sections ready for ${surfaceType}, updating state`);
                
                // Update surface state with new section content
                setSurfaceState(prevState => {
                  if (!prevState) return prevState;
                  
                  const newState = { ...prevState };
                  const meta = newState.metadata as any;
                  
                  // Determine array key based on surface type
                  const arrayKey = surfaceType === 'quiz' ? 'questions' 
                    : surfaceType === 'flashcard' ? 'cards'
                    : surfaceType === 'timeline' ? 'events'
                    : surfaceType === 'comparison' ? 'items'
                    : 'sections';  // wiki, research
                  
                  // Apply ready sections
                  for (const readySection of newSections) {
                    if (meta?.[arrayKey]?.[readySection.order]) {
                      const item = meta[arrayKey][readySection.order];
                      
                      // Parse JSON content for quiz/flashcard/timeline/comparison
                      if (['quiz', 'flashcard', 'timeline', 'comparison'].includes(surfaceType)) {
                        try {
                          // Extract JSON from response (may have markdown wrapper)
                          const jsonMatch = readySection.content.match(/\{[\s\S]*\}/);
                          if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            // Merge parsed content with existing item
                            Object.assign(item, parsed);
                          }
                        } catch (e) {
                          console.warn(`[SurfacePage] Failed to parse section ${readySection.order}:`, e);
                        }
                      } else {
                        // Wiki/Research: content is plain markdown
                        item.content = readySection.content;
                      }
                      
                      // Mark as completed for UI feedback
                      item.status = 'completed';
                    }
                  }
                  
                  return { ...newState, updatedAt: Date.now() };
                });
                
                lastSectionCount = jobData.readySections.length;
              }
              
              if (jobData.status === 'complete' && jobData.result?.surfaceState) {
                setSurfaceState(jobData.result.surfaceState);
                setResearchProgress(null);  // Clear research progress
                setGenerationProgress(null);
                setIsGenerating(false);
                
                // Use appropriate save action based on surface type
                if (surfaceType === 'research') {
                  // saveResearchSurface handles credit deduction (2 credits)
                  const { surfaceId } = await saveResearchSurface(conversationId, jobData.result.surfaceState);
                  setCurrentSurfaceId(surfaceId);
                  console.log('[SurfacePage] Research saved:', surfaceId);
                } else {
                  await saveState(jobData.result.surfaceState);
                }
                return;
              }
              
              if (jobData.status === 'error') {
                setIsGenerating(false);
                setResearchProgress(null);
                throw new Error(jobData.error || 'Job failed');
              }
            } catch (pollError) {
              console.error('[SurfacePage] Poll error:', pollError);
              // Continue polling on network errors
            }
          }
          
          // Timeout - clean up state
          setIsGenerating(false);
          setResearchProgress(null);
          throw new Error('Generation timed out');
        }
        
        // Handle sync response (fallback)
        if (data.surfaceState) {
          setSurfaceState(data.surfaceState);
          await saveState(data.surfaceState);
        }
      } catch (err) {
        console.error('[SurfacePage] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (shouldResetLoading) {
          setIsLoading(false);
        }
      }
    }

    if (conversationId && surfaceType) {
      loadSurface();
    }
  }, [conversationId, surfaceType, queryFromUrl, surfaceIdFromUrl, saveState]);

  // Back to chat - invalidate conversations cache to refresh surface states
  const handleBackToChat = useCallback(async () => {
    // Invalidate conversations cache so chat page fetches fresh data with updated surfaceStates
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    router.push(`/chat?id=${conversationId}`);
  }, [router, conversationId, queryClient]);

  // Generate chapter content
  const handleGenerateChapter = useCallback(async (chapterIndex: number) => {
    if (!surfaceState) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'learning',
          action: 'generate_chapter',
          targetIndex: chapterIndex,
          surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate chapter");
      
      const data = await response.json() as { updatedState: SurfaceState; content: string };
      
      setSurfaceState((prev) => {
        if (!prev?.learning) return data.updatedState;

        const updated = {
          ...prev,
          updatedAt: Date.now(),
          learning: {
            ...prev.learning,
            chaptersContent: {
              ...prev.learning.chaptersContent,
              [chapterIndex]: data.content,
            },
          },
        };

        // Save the merged state
        saveState(updated);
        return updated;
      });
    } catch (err) {
      console.error('[SurfacePage] Error generating chapter:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [surfaceState, originalQuery, saveState]);

  // Mark chapter complete
  const handleMarkChapterComplete = useCallback((chapterIndex: number) => {
    if (!surfaceState?.learning) return;
    
    const completedChapters = [...(surfaceState.learning.completedChapters || [])];
    if (!completedChapters.includes(chapterIndex)) {
      completedChapters.push(chapterIndex);
    }

    const updatedState = {
      ...surfaceState,
      learning: {
        ...surfaceState.learning,
        completedChapters,
      },
    };
    setSurfaceState(updatedState);
    // Save after marking complete
    saveState(updatedState);
  }, [surfaceState, saveState]);
  // Generate checkpoint content
  const handleGenerateCheckpoint = useCallback(async (checkpointIndex: number) => {
    if (!surfaceState) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'guide',
          action: 'generate_step',
          targetIndex: checkpointIndex,
          surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate checkpoint");
      
      const data = await response.json() as { updatedState: SurfaceState; content: string };
      
      setSurfaceState((prev) => {
        if (!prev?.guide) return data.updatedState;

        const updated = {
          ...prev,
          updatedAt: Date.now(),
          guide: {
            ...prev.guide,
            checkpointContent: {
              ...prev.guide.checkpointContent,
              [checkpointIndex]: data.content,
            },
          },
        };

        // Save the merged state
        saveState(updated);
        return updated;
      });
    } catch (err) {
      console.error('[SurfacePage] Error generating checkpoint:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [surfaceState, originalQuery, saveState]);

  // Mark checkpoint complete
  const handleMarkCheckpointComplete = useCallback((checkpointIndex: number) => {
    if (!surfaceState?.guide) return;
    
    const completedCheckpoints = [...(surfaceState.guide.completedCheckpoints || [])];
    if (!completedCheckpoints.includes(checkpointIndex)) {
      completedCheckpoints.push(checkpointIndex);
    }
    
    // Advance current checkpoint to next
    const metadata = surfaceState.metadata as GuideMetadata;
    const nextCheckpoint = Math.min(checkpointIndex + 1, metadata.checkpoints.length - 1);

    const updatedState = {
      ...surfaceState,
      guide: {
        ...surfaceState.guide,
        completedCheckpoints,
        currentCheckpoint: nextCheckpoint,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Answer question
  const handleAnswerQuestion = useCallback((questionIndex: number, answer: string | number) => {
    if (!surfaceState?.quiz) {
      // Initialize quiz state if not present
      const initialQuizState = {
        currentQuestion: 0,
        answers: {},
        correctCount: 0,
        incorrectCount: 0,
        completed: false,
        startedAt: Date.now(),
      };
      const updatedState = {
        ...surfaceState!,
        quiz: initialQuizState,
      };
      setSurfaceState(updatedState);
    }

    const metadata = surfaceState?.metadata as QuizMetadata | undefined;
    const question = metadata?.questions[questionIndex];
    const isCorrect = question && (
      typeof question.correctAnswer === 'number' 
        ? answer === question.correctAnswer
        : answer === question.correctAnswer
    );

    const currentAnswers = surfaceState?.quiz?.answers ?? {};
    const currentCorrect = surfaceState?.quiz?.correctCount ?? 0;
    const currentIncorrect = surfaceState?.quiz?.incorrectCount ?? 0;

    const updatedState = {
      ...surfaceState!,
      quiz: {
        ...surfaceState!.quiz!,
        currentQuestion: questionIndex,
        answers: { ...currentAnswers, [questionIndex]: answer },
        correctCount: isCorrect ? currentCorrect + 1 : currentCorrect,
        incorrectCount: !isCorrect ? currentIncorrect + 1 : currentIncorrect,
        startedAt: surfaceState?.quiz?.startedAt ?? Date.now(),
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Next question
  const handleNextQuestion = useCallback(() => {
    if (!surfaceState?.quiz || !surfaceState.metadata) return;
    
    const metadata = surfaceState.metadata as QuizMetadata;
    const nextQuestion = (surfaceState.quiz.currentQuestion ?? 0) + 1;
    const isCompleted = nextQuestion >= metadata.questions.length;

    const updatedState = {
      ...surfaceState,
      quiz: {
        ...surfaceState.quiz,
        currentQuestion: isCompleted ? surfaceState.quiz.currentQuestion : nextQuestion,
        completed: isCompleted,
        completedAt: isCompleted ? Date.now() : undefined,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Quiz: Restart
  const handleRestartQuiz = useCallback(() => {
    if (!surfaceState) return;

    const resetState = {
      ...surfaceState,
      quiz: {
        currentQuestion: 0,
        answers: {},
        correctCount: 0,
        incorrectCount: 0,
        completed: false,
        startedAt: Date.now(),
      },
    };
    setSurfaceState(resetState);
    saveState(resetState);
  }, [surfaceState, saveState]);

  // Flashcard: Mark card as known/unknown
  const handleMarkFlashcard = useCallback((cardIndex: number, known: boolean) => {
    if (!surfaceState) return;
    
    const flashcardState = surfaceState.flashcard ?? {
      currentCard: 0,
      knownCards: [],
      unknownCards: [],
      completed: false,
    };
    
    const knownCards = [...flashcardState.knownCards];
    const unknownCards = [...flashcardState.unknownCards];
    
    // Remove from both arrays first, then add to appropriate one
    const knownIdx = knownCards.indexOf(cardIndex);
    if (knownIdx > -1) knownCards.splice(knownIdx, 1);
    const unknownIdx = unknownCards.indexOf(cardIndex);
    if (unknownIdx > -1) unknownCards.splice(unknownIdx, 1);
    
    if (known) {
      knownCards.push(cardIndex);
    } else {
      unknownCards.push(cardIndex);
    }
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    const completed = (knownCards.length + unknownCards.length) >= totalCards;
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...flashcardState,
        knownCards,
        unknownCards,
        completed,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Flashcard: Next card
  const handleNextFlashcard = useCallback(() => {
    if (!surfaceState?.flashcard) return;
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    const nextCard = Math.min((surfaceState.flashcard.currentCard ?? 0) + 1, totalCards - 1);
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...surfaceState.flashcard,
        currentCard: nextCard,
      },
    };
    setSurfaceState(updatedState);
  }, [surfaceState]);

  // Flashcard: Previous card
  const handlePrevFlashcard = useCallback(() => {
    if (!surfaceState?.flashcard) return;
    
    const prevCard = Math.max((surfaceState.flashcard.currentCard ?? 0) - 1, 0);
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...surfaceState.flashcard,
        currentCard: prevCard,
      },
    };
    setSurfaceState(updatedState);
  }, [surfaceState]);

  // Flashcard: Shuffle cards
  const handleShuffleFlashcards = useCallback(() => {
    if (!surfaceState) return;
    
    const metadata = surfaceState.metadata as FlashcardMetadata;
    const totalCards = metadata?.cards?.length ?? 0;
    
    // Create shuffled order
    const order = Array.from({ length: totalCards }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    const updatedState = {
      ...surfaceState,
      flashcard: {
        ...surfaceState.flashcard,
        ...surfaceState.flashcard,
        // Preserve existing progress
        knownCards: surfaceState.flashcard?.knownCards ?? [],
        unknownCards: surfaceState.flashcard?.unknownCards ?? [],
        completed: surfaceState.flashcard?.completed ?? false,
        shuffleOrder: order,
        currentCard: surfaceState.flashcard?.currentCard ?? 0,
      },
    };
    setSurfaceState(updatedState);
    saveState(updatedState);
  }, [surfaceState, saveState]);

  // Flashcard: Restart deck
  const handleRestartFlashcards = useCallback(() => {
    if (!surfaceState) return;
    
    const resetState = {
      ...surfaceState,
      flashcard: {
        currentCard: 0,
        knownCards: [],
        unknownCards: [],
        completed: false,
        shuffleOrder: undefined,
      },
    };
    setSurfaceState(resetState);
    saveState(resetState);
  }, [surfaceState, saveState]);

  // Delete surface
  const handleDeleteSurface = useCallback(async () => {
    if (!conversationId || !surfaceType) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/surface/state?conversationId=${conversationId}&type=${surfaceType}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) throw new Error('Failed to delete surface');
      
      // Invalidate cache and navigate back to chat after deletion
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat?id=${conversationId}`);
    } catch (err) {
      console.error('[SurfacePage] Error deleting surface:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [conversationId, surfaceType, router, queryClient]);

  // Get Surface Info
  const surfaceInfo = getSurfaceInfo(surfaceType);
  const SurfaceIcon = surfaceInfo.icon;

  // GUARD: Show visual "Skeleton Loading" immediately on mount or while loading
  // Exception: Show ResearchProgressPanel for research generation
  if (!isMounted || isLoading) {
    // Show ResearchProgressPanel if we have research progress data
    if (surfaceType === 'research' && isGenerating && researchProgress) {
      return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center">
          <ResearchProgressPanel
            researchProgress={researchProgress}
            progress={generationProgress || undefined}
            query={originalQuery}
          />
        </div>
      );
    }
    return <SurfacePageSkeleton type={surfaceType || 'wiki'} />;
  }

  // Validate surface type - show skeleton if type is not recognized
  // This prevents "Surface Not Found" flash during route transitions
  const validSurfaceTypes = ['learning', 'guide', 'quiz', 'comparison', 'flashcard', 'timeline', 'wiki', 'finance', 'research'];
  if (!validSurfaceTypes.includes(surfaceType)) {
    console.warn('[SurfacePage] Invalid surfaceType, showing skeleton:', surfaceType);
    return <SurfacePageSkeleton type={surfaceType || 'wiki'} />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-background p-4">
        <div className="bg-card border rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-md shadow-lg">
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <PiXCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={handleBackToChat} variant="outline" className="mt-4">
            <PiArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  // No surface state - but show progress panel for research generation
  if (!surfaceState) {
    // Show ResearchProgressPanel if we're generating research
    if (surfaceType === 'research' && isGenerating && researchProgress) {
      return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center">
          <ResearchProgressPanel
            researchProgress={researchProgress}
            progress={generationProgress || undefined}
            query={originalQuery}
          />
        </div>
      );
    }
    
    // Show loading skeleton if generating
    if (isGenerating) {
      return <SurfacePageSkeleton type={surfaceType || 'wiki'} />;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No surface data found</p>
          <Button onClick={handleBackToChat} variant="outline">
            <PiArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  // Show skeleton if surfaceState exists but metadata is not yet populated
  // This prevents "Surface Not Found" flash during state transitions
  if (!surfaceState.metadata) {
    return <SurfacePageSkeleton type={surfaceType} />;
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col font-sans">
      {/* Header - Compact and Technical */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-[2px] supports-[backdrop-filter]:bg-background/80">
        <div className="h-14 max-w-[1400px] mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
              onClick={handleBackToChat}
            >
              <PiArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-[1px] bg-border/60 mx-1" />
            
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn("p-1.5 rounded-md bg-muted/40 border border-border/30", surfaceInfo.color)}>
                <SurfaceIcon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className="text-sm font-semibold truncate leading-none tracking-tight">
                  {(surfaceState.metadata as any).title || (surfaceState.metadata as any).topic || originalQuery || queryFromUrl || "New Context"}
                </h1>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">
                  {surfaceInfo.label} Surface
                </span>
              </div>
            </div>
            
            {/* Saving Indicator */}
            {(isSaving || isGenerating) && (
              <div className="ml-2 flex items-center gap-1.5 text-[10px] text-muted-foreground animate-in fade-in duration-300">
                <PiCloud className="h-3 w-3" />
                <span>{isGenerating ? 'Generating...' : 'Saving...'}</span>
              </div>
             )}
          </div>

          <div className="flex items-center gap-2">
            {generationProgress && isGenerating && (
              <div className="hidden md:flex items-center gap-2 mr-2 px-2.5 py-1 bg-muted/30 rounded-full border border-border/30">
                <PiSpinner className="h-3 w-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">
                  {generationProgress.message} ({Math.round((generationProgress.current / generationProgress.total) * 100)}%)
                </span>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                  <PiDotsThreeVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive gap-2 text-xs font-medium"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <PiTrash className="h-3.5 w-3.5" />
                  Delete Surface
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Progress Bar */}
        {generationProgress && isGenerating && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/30">
            <div 
              className="h-full bg-primary/70 transition-all duration-300 ease-out"
              style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
            />
          </div>
        )}
      </header>
      
      {/* Content Area */}
      <div className="flex-1">
        <main className="max-w-[1200px] mx-auto px-4 py-8 md:px-8">
           <div className="animate-in fade-in duration-500 ease-out slide-in-from-bottom-2">
             {surfaceType === 'learning' ? (
              <LearningSurface
                metadata={surfaceState.metadata as LearningMetadata}
                surfaceState={surfaceState}
                content={(surfaceState.learning?.chaptersContent) || {}}
                completedChapters={surfaceState.learning?.completedChapters || []}
                onGenerateChapter={handleGenerateChapter}
                onMarkComplete={handleMarkChapterComplete}
                isGenerating={isGenerating}
                conversationId={conversationId}
                surfaceId={currentSurfaceId || undefined}
                onSubChatSelect={handleOpenSubChat}
                sectionIdsWithSubChats={sectionIdsWithSubChats}
              />
            ) : surfaceType === 'guide' ? (
              <GuideSurface
                metadata={surfaceState.metadata as GuideMetadata}
                surfaceState={surfaceState}
                onGenerateCheckpoint={handleGenerateCheckpoint}
                onMarkComplete={handleMarkCheckpointComplete}
                isGenerating={isGenerating}
                surfaceId={currentSurfaceId || undefined}
                onSubChatSelect={handleOpenSubChat}
                sectionIdsWithSubChats={sectionIdsWithSubChats}
              />
            ) : surfaceType === 'quiz' ? (
              <QuizSurface
                metadata={surfaceState.metadata as QuizMetadata}
                surfaceState={surfaceState}
                onAnswerQuestion={handleAnswerQuestion}
                onNextQuestion={handleNextQuestion}
                onRestartQuiz={handleRestartQuiz}
                isGenerating={isGenerating}
              />
            ) : surfaceType === 'comparison' ? (
              <ComparisonSurface
                metadata={surfaceState.metadata as ComparisonMetadata}
                /* SubChat not yet supported */


              />
            ) : surfaceType === 'flashcard' ? (
              <FlashcardSurface
                metadata={surfaceState.metadata as FlashcardMetadata}
                surfaceState={surfaceState}
                onNextCard={handleNextFlashcard}
                onPrevCard={handlePrevFlashcard}
                onMarkCard={handleMarkFlashcard}
                onShuffleCards={handleShuffleFlashcards}
                onRestartDeck={handleRestartFlashcards}
                isGenerating={isGenerating}
              />
            ) : surfaceType === 'timeline' ? (
              <TimelineSurface
                metadata={surfaceState.metadata as TimelineMetadata}
                /* SubChat not yet supported */


              />
            ) : surfaceType === 'wiki' ? (
              <WikiSurface
                metadata={surfaceState.metadata as WikiMetadata}
                surfaceState={surfaceState} // Pass full state for availableImages/citations
                conversationId={conversationId}
                surfaceId={currentSurfaceId || undefined}
                onSubChatSelect={handleOpenSubChat}
                sectionIdsWithSubChats={sectionIdsWithSubChats}
              />
            ) : surfaceType === 'finance' ? (
              <FinanceSurface
                metadata={surfaceState.metadata as any} // Relax typing for now
                surfaceState={surfaceState} // Pass full state if needed
              />
            ) : surfaceType === 'research' ? (
              // Show progress panel during generation, otherwise show the final surface
              isGenerating && researchProgress ? (
                <ResearchProgressPanel
                  researchProgress={researchProgress}
                  progress={generationProgress || undefined}
                  query={originalQuery}
                />
              ) : (
                <ResearchSurface
                  metadata={surfaceState.metadata as ResearchMetadata}
                  surfaceState={surfaceState}
                  isGenerating={isGenerating}
                  progress={generationProgress || undefined}
                  surfaceId={currentSurfaceId || undefined}
                  onSubChatSelect={handleOpenSubChat}
                  sectionIdsWithSubChats={sectionIdsWithSubChats}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                  <PiCloud className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Surface Not Found</h3>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  This surface type doesn't exist or hasn't been implemented yet.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <PiTrash className="h-5 w-5" />
              Delete Surface
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {surfaceInfo.label}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!currentSurfaceId) return;
                setIsDeleting(true);
                try {
                  await fetch(`/api/surface/${currentSurfaceId}`, { method: 'DELETE' });
                  handleBackToChat();
                } catch (e) {
                  console.error(e);
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <PiSpinner className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* SubChat Sheet - Deep Dive Context */}
      <SubChatSheet
        open={subChatSheetOpen}
        onOpenChange={setSubChatSheetOpen}
        subChat={activeSubChat}
        onSendMessage={handleSubChatSendMessage}
        isLoading={subChatLoading}
        streamingContent={subChatStreamingContent}
        searchResults={subChatSearchResults}
      />
    </div>
  );
}
