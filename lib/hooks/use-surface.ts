/**
 * useSurface Hook
 * 
 * Manages surface state for messages - allows switching between Chat, Course, Guide views.
 * Each message can have its own surface state.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { SurfaceType, SurfaceState, LearningMetadata, GuideMetadata } from "@/lib/services/domain-types";

interface MessageSurfaceStates {
  [messageId: string]: {
    activeVersion: SurfaceType;
    surfaceState: SurfaceState | null;
    isGenerating: boolean;
  };
}

interface UseSurfaceReturn {
  // State
  messageSurfaceStates: MessageSurfaceStates;
  
  // Actions
  getMessageSurfaceState: (messageId: string) => {
    activeVersion: SurfaceType;
    surfaceState: SurfaceState | null;
    isGenerating: boolean;
  };
  switchSurfaceVersion: (messageId: string, version: SurfaceType, originalQuery: string) => Promise<void>;
  generateChapterContent: (messageId: string, chapterIndex: number, originalQuery: string) => Promise<void>;
  markChapterComplete: (messageId: string, chapterIndex: number) => void;
  generateStepContent: (messageId: string, stepIndex: number, originalQuery: string) => Promise<void>;
  markStepComplete: (messageId: string, stepIndex: number) => void;
  skipStep: (messageId: string, stepIndex: number) => void;
}

export function useSurface(): UseSurfaceReturn {
  const [messageSurfaceStates, setMessageSurfaceStates] = useState<MessageSurfaceStates>({});
  
  // Helper to get state for a specific message
  const getMessageSurfaceState = useCallback((messageId: string) => {
    return messageSurfaceStates[messageId] || {
      activeVersion: 'chat' as SurfaceType,
      surfaceState: null,
      isGenerating: false,
    };
  }, [messageSurfaceStates]);

  // Switch surface version - generates new surface if needed
  const switchSurfaceVersion = useCallback(async (
    messageId: string,
    version: SurfaceType,
    originalQuery: string
  ) => {
    console.log(`[useSurface] Switching message ${messageId} to ${version}`);
    
    // If switching to chat, just update activeVersion
    if (version === 'chat') {
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          activeVersion: 'chat',
          isGenerating: false,
        }
      }));
      return;
    }

    // Check if we already have this surface generated
    const existing = messageSurfaceStates[messageId];
    const hasSurface = version === 'learning' 
      ? existing?.surfaceState?.learning 
      : existing?.surfaceState?.guide;
    
    if (hasSurface && existing?.surfaceState) {
      // Just switch to it
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          activeVersion: version,
          isGenerating: false,
        }
      }));
      return;
    }

    // Need to generate the surface
    setMessageSurfaceStates(prev => ({
      ...prev,
      [messageId]: {
        activeVersion: version,
        surfaceState: prev[messageId]?.surfaceState || null,
        isGenerating: true,
      }
    }));

    try {
      const response = await fetch('/api/surface/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: originalQuery,
          surfaceType: version,
          messageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate surface');
      }

      const data = await response.json() as { surfaceState: SurfaceState };
      
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          activeVersion: version,
          surfaceState: data.surfaceState,
          isGenerating: false,
        }
      }));
    } catch (error) {
      console.error('[useSurface] Error generating surface:', error);
      // Revert to chat on error
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          activeVersion: 'chat',
          isGenerating: false,
        }
      }));
    }
  }, [messageSurfaceStates]);

  // Generate chapter content
  const generateChapterContent = useCallback(async (
    messageId: string,
    chapterIndex: number,
    originalQuery: string
  ) => {
    console.log(`[useSurface] Generating chapter ${chapterIndex} for message ${messageId}`);
    
    const current = messageSurfaceStates[messageId];
    if (!current?.surfaceState) return;

    setMessageSurfaceStates(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], isGenerating: true }
    }));

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'learning',
          action: 'generate_chapter',
          targetIndex: chapterIndex,
          surfaceState: current.surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chapter');
      }

      const data = await response.json() as { updatedState: SurfaceState };
      
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          surfaceState: data.updatedState,
          isGenerating: false,
        }
      }));
    } catch (error) {
      console.error('[useSurface] Error generating chapter:', error);
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], isGenerating: false }
      }));
    }
  }, [messageSurfaceStates]);

  // Mark chapter complete
  const markChapterComplete = useCallback((messageId: string, chapterIndex: number) => {
    setMessageSurfaceStates(prev => {
      const current = prev[messageId];
      if (!current?.surfaceState?.learning) return prev;

      const completedChapters = [...(current.surfaceState.learning.completedChapters || [])];
      if (!completedChapters.includes(chapterIndex)) {
        completedChapters.push(chapterIndex);
      }

      return {
        ...prev,
        [messageId]: {
          ...current,
          surfaceState: {
            ...current.surfaceState,
            learning: {
              ...current.surfaceState.learning,
              completedChapters,
            },
          }
        }
      };
    });
  }, []);

  // Generate step content
  const generateStepContent = useCallback(async (
    messageId: string,
    stepIndex: number,
    originalQuery: string
  ) => {
    console.log(`[useSurface] Generating step ${stepIndex} for message ${messageId}`);
    
    const current = messageSurfaceStates[messageId];
    if (!current?.surfaceState) return;

    setMessageSurfaceStates(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], isGenerating: true }
    }));

    try {
      const response = await fetch('/api/surface/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType: 'guide',
          action: 'generate_step',
          targetIndex: stepIndex,
          surfaceState: current.surfaceState,
          originalQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate step');
      }

      const data = await response.json() as { updatedState: SurfaceState };
      
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          surfaceState: data.updatedState,
          isGenerating: false,
        }
      }));
    } catch (error) {
      console.error('[useSurface] Error generating step:', error);
      setMessageSurfaceStates(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], isGenerating: false }
      }));
    }
  }, [messageSurfaceStates]);

  // Mark step complete
  const markStepComplete = useCallback((messageId: string, stepIndex: number) => {
    setMessageSurfaceStates(prev => {
      const current = prev[messageId];
      if (!current?.surfaceState?.guide) return prev;

      const completedSteps = [...(current.surfaceState.guide.completedSteps || [])];
      if (!completedSteps.includes(stepIndex)) {
        completedSteps.push(stepIndex);
      }

      return {
        ...prev,
        [messageId]: {
          ...current,
          surfaceState: {
            ...current.surfaceState,
            guide: {
              ...current.surfaceState.guide,
              completedSteps,
            },
          }
        }
      };
    });
  }, []);

  // Skip step
  const skipStep = useCallback((messageId: string, stepIndex: number) => {
    setMessageSurfaceStates(prev => {
      const current = prev[messageId];
      if (!current?.surfaceState?.guide) return prev;

      const skippedSteps = [...(current.surfaceState.guide.skippedSteps || [])];
      if (!skippedSteps.includes(stepIndex)) {
        skippedSteps.push(stepIndex);
      }

      return {
        ...prev,
        [messageId]: {
          ...current,
          surfaceState: {
            ...current.surfaceState,
            guide: {
              ...current.surfaceState.guide,
              skippedSteps,
            },
          }
        }
      };
    });
  }, []);

  return {
    messageSurfaceStates,
    getMessageSurfaceState,
    switchSurfaceVersion,
    generateChapterContent,
    markChapterComplete,
    generateStepContent,
    markStepComplete,
    skipStep,
  };
}
