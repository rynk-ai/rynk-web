'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'
import type { PDFJob } from '@/components/chat/processing-timeline'

// Simple global store for PDF jobs - can be accessed from anywhere
let pdfJobsStore: PDFJob[] = []
let listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return pdfJobsStore
}

function emit() {
  listeners.forEach(listener => listener())
}

/**
 * Custom hook for tracking server-side PDF processing jobs.
 * Uses a simple global store pattern - any component can read jobs,
 * only useChatController should write to it.
 */
export function usePdfJobs() {
  // Subscribe to global store
  const jobs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Add a new job
  const addJob = useCallback((job: PDFJob) => {
    pdfJobsStore = [...pdfJobsStore, job]
    emit()
  }, [])

  // Update an existing job
  const updateJob = useCallback((jobId: string, updates: Partial<PDFJob>) => {
    pdfJobsStore = pdfJobsStore.map(j => 
      j.jobId === jobId ? { ...j, ...updates } : j
    )
    emit()
  }, [])

  // Clear all completed jobs (cleanup)
  const clearCompleted = useCallback(() => {
    pdfJobsStore = pdfJobsStore.filter(j => j.status !== 'completed' && j.status !== 'failed')
    emit()
  }, [])

  // Clear all jobs
  const clearAll = useCallback(() => {
    pdfJobsStore = []
    emit()
  }, [])

  return {
    jobs,
    addJob,
    updateJob,
    clearCompleted,
    clearAll,
  }
}
