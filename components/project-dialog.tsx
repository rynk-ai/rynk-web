"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { PiX, PiUploadSimple, PiFileText, PiImage as ImageIcon, PiSpinner, PiCheckCircle } from "react-icons/pi"
import { IndexingJob } from "@/lib/hooks/use-indexing-queue"
import { Project } from "@/lib/services/indexeddb"

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string, instructions: string, attachments: File[], useChatsAsKnowledge: boolean) => Promise<string | void>
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
  const [useChatsAsKnowledge, setUseChatsAsKnowledge] = useState(true)

  useEffect(() => {
    if (open) {
      if (initialData && mode === 'edit') {
        setName(initialData.name)
        setDescription(initialData.description)
        setInstructions(initialData.instructions || "")
        setAttachments(initialData.attachments || [])
        setUseChatsAsKnowledge(initialData.useChatsAsKnowledge ?? true)
      } else {
        setName("")
        setDescription("")
        setInstructions("")
        setAttachments([])
        setUseChatsAsKnowledge(true)
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
      const projectId = await onSubmit(name, description, instructions, attachments, useChatsAsKnowledge)
      
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
        return <PiSpinner className="h-4 w-4 animate-spin text-blue-500" />
      case 'complete':
        return <PiCheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <PiX className="h-4 w-4 text-red-500" />
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
      // Prevent closing during upload, processing, or any submitting state
      if (!isSubmitting && currentStep === 'form') {
        onOpenChange(newOpen)
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto border border-border/40 shadow-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Project' : 'Edit Project'}</DialogTitle>
        </DialogHeader>

        {currentStep === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 Marketing Campaign"
                className="h-10"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the project..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                This description helps the AI understand your project's context.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add specific guidelines for the AI when working on this project..."
                className="min-h-[120px] max-h-[300px] resize-y"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                These instructions are automatically added as system prompts for all chats.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 p-4 bg-muted/30">
              <div className="space-y-1 flex-1">
                <Label htmlFor="useChatsAsKnowledge" className="cursor-pointer font-medium">
                  Use chats as knowledge base
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When enabled, all project chats contribute to the AI's context.
                </p>
              </div>
              <Switch
                id="useChatsAsKnowledge"
                checked={useChatsAsKnowledge}
                onCheckedChange={setUseChatsAsKnowledge}
              />
            </div>

            <div className="space-y-3">
              <Label>Attachments</Label>
              <div className="border border-dashed border-border/50 rounded-lg p-6 text-center hover:bg-muted/30 hover:border-border transition-all cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="p-3 rounded-full bg-secondary/50">
                    <PiUploadSimple className="h-6 w-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground/80">Drop files here or click to browse</p>
                    <p className="text-xs">PDFs, code files, markdown, JSON, etc.</p>
                  </div>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((file, i) => {
                    // Handle both File objects and attachment metadata
                    const isFileObject = file instanceof File
                    const fileName = isFileObject ? file.name : (file as any).name || 'Unknown file'
                    const fileSize = isFileObject ? file.size : (file as any).size || 0
                    const fileType = isFileObject ? file.type : (file as any).type || ''
                    
                    // Smart file size formatting
                    const formatSize = (bytes: number) => {
                      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                      return `${(bytes / 1024).toFixed(1)} KB`
                    }

                    // Middle truncation for filenames
                    const truncateMiddle = (str: string, maxLength: number = 24) => {
                      if (str.length <= maxLength) return str
                      const start = str.slice(0, Math.ceil(maxLength / 2) - 2)
                      const end = str.slice(-Math.floor(maxLength / 2) + 1)
                      return `${start}...${end}`
                    }
                    
                    return (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/40 border border-border/30 group hover:bg-secondary/60 transition-colors"
                      >
                        <div className="shrink-0">
                          {fileType.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          ) : fileType === 'application/pdf' ? (
                            <PiFileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <PiFileText className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none" title={fileName}>
                            {truncateMiddle(fileName)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatSize(fileSize)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          disabled={isSubmitting}
                        >
                          <PiX className="h-3.5 w-3.5" />
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
              <PiSpinner className="h-8 w-8 animate-spin mx-auto text-primary" />
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
              <PiSpinner className="h-8 w-8 animate-spin mx-auto text-primary" />
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
            <PiCheckCircle className="h-12 w-12 text-green-500 mx-auto" />
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
