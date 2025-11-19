"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Upload, FileText, Image as ImageIcon } from "lucide-react"
import { Project } from "@/lib/services/indexeddb"

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string, instructions: string, attachments: File[]) => Promise<void>
  initialData?: Project
  mode: 'create' | 'edit'
}

export function ProjectDialog({ open, onOpenChange, onSubmit, initialData, mode }: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    }
  }, [open, initialData, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(name, description, instructions, attachments)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to submit project:", error)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Project' : 'Edit Project'}</DialogTitle>
        </DialogHeader>
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
              />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-sm">Click or drag files to attach project context</span>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm group relative">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Project' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
