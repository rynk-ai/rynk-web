"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { X, Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2 } from "lucide-react"
import { IndexingJob } from "@/lib/hooks/use-indexing-queue"
import { Project } from "@/lib/services/indexeddb"

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string, instructions: string, attachments: File[]) => Promise<string | void>
  initialData?: Project
  mode: 'create' | 'edit'
  indexingJobs?: IndexingJob[]
}

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error'

interface FileProgress {
  file: File
  status: UploadStatus
  progress: number
  error?: string
}

export function ProjectDialog({ open, onOpenChange, onSubmit, initialData, mode, indexingJobs = [] }: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<FileProgress[]>([])
  const [currentStep, setCurrentStep] = useState<'form' | 'uploading' | 'processing' | 'complete'>('form')
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialData && mode === 'edit') {
        setName(initialData.name)
        setDescription(initialData.description)
        setInstructions(initialData.instructions || "")
        setAttachments(initialData.attachments || [])
      } else {
        setName("")
        setDescription("")
        setInstructions("")
        setAttachments([])
      }
      setCurrentStep('form')
      setUploadProgress([])
      setCreatedProjectId(null)
    }
  }, [open, initialData, mode])

  // Watch for indexing jobs progress
  useEffect(() => {
    if (currentStep === 'processing' && createdProjectId && indexingJobs.length > 0) {
      // Filter jobs for this project
      const projectJobs = indexingJobs.filter(job => job.projectId === createdProjectId)
      
      if (projectJobs.length > 0) {
        // Update progress based on jobs
        setUploadProgress(prev => prev.map(fp => {
          const job = projectJobs.find(j => j.fileName === fp.file.name)
          if (job) {
            return {
              ...fp,
              status: job.status === 'failed' ? 'error' : (job.status === 'completed' ? 'complete' : 'processing'),
              progress: job.progress,
              error: job.error
            }
          }
          return fp
        }))

        // Check if all are complete
        const allComplete = projectJobs.every(j => j.status === 'completed' || j.status === 'failed')
        if (allComplete) {
          setCurrentStep('complete')
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        }
      }
    }
  }, [currentStep, createdProjectId, indexingJobs, onOpenChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setCurrentStep('uploading')
    
    // Initialize progress for each file
    if (attachments.length > 0) {
      setUploadProgress(attachments.map(file => ({
        file,
        status: 'uploading',
        progress: 0
      })))
    }

    try {
      const projectId = await onSubmit(name, description, instructions, attachments)
      
      if (attachments.length > 0 && projectId) {
        // Switch to processing state
        setCreatedProjectId(projectId as string)
        setCurrentStep('processing')
        
        // Update status to processing
        setUploadProgress(prev => prev.map(fp => ({
          ...fp,
          status: 'processing',
          progress: 0
        })))
      } else {
        // No files or no project ID returned (edit mode), just close
        setCurrentStep('complete')
        setTimeout(() => {
          onOpenChange(false)
        }, 500)
      }
    } catch (error) {
      console.error("Failed to submit project:", error)
      setUploadProgress(prev => prev.map(fp => ({
        ...fp,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })))
      setCurrentStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Indexing...'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing during upload
      if (!isSubmitting) {
        onOpenChange(newOpen)
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Project' : 'Edit Project'}</DialogTitle>
        </DialogHeader>

        {currentStep === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 Marketing Campaign"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the project..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This description will be used to provide context to the AI.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific instructions for the AI when working on this project..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be injected as system prompts for all chats in this project.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Click or drag files to attach project context</span>
                  <span className="text-xs">PDFs, code files, markdown, JSON, etc.</span>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {attachments.map((file, i) => {
                    // Handle both File objects and attachment metadata
                    const isFileObject = file instanceof File
                    const fileName = isFileObject ? file.name : (file as any).name || 'Unknown file'
                    const fileSize = isFileObject ? file.size : (file as any).size || 0
                    const fileType = isFileObject ? file.type : (file as any).type || ''
                    
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm group relative">
                        {fileType.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="truncate flex-1">{fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          {(fileSize / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'create' ? 'Create Project' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {currentStep === 'uploading' && (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <h3 className="font-semibold">Creating project...</h3>
              <p className="text-sm text-muted-foreground">
                Uploading files and preparing for vectorization
              </p>
            </div>

            {uploadProgress.length > 0 && (
              <div className="space-y-3">
                {uploadProgress.map((fp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(fp.status)}
                        <span className="truncate">{fp.file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {getStatusText(fp.status)}
                      </span>
                    </div>
                    {fp.status === 'uploading' && (
                      <Progress value={33} className="h-1" />
                    )}
                    {fp.error && (
                      <p className="text-xs text-destructive">{fp.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <h3 className="font-semibold">Indexing files...</h3>
              <p className="text-sm text-muted-foreground">
                Processing content for AI context
              </p>
            </div>

            {uploadProgress.length > 0 && (
              <div className="space-y-3">
                {uploadProgress.map((fp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(fp.status)}
                        <span className="truncate">{fp.file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {getStatusText(fp.status)}
                      </span>
                    </div>
                    {fp.status === 'processing' && (
                      <Progress value={fp.progress} className="h-1" />
                    )}
                    {fp.error && (
                      <p className="text-xs text-destructive">{fp.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="font-semibold text-lg">Project created!</h3>
            <p className="text-sm text-muted-foreground">
              Files are being indexed in the background
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
