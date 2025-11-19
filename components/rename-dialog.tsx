"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTitle: string
  onSave: (newTitle: string) => Promise<void>
}

export function RenameDialog({
  open,
  onOpenChange,
  initialTitle,
  onSave,
}: RenameDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  const handleSave = async () => {
    if (!title.trim()) return
    setIsLoading(true)
    try {
      await onSave(title)
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Conversation</DialogTitle>
          <DialogDescription>
            Enter a new title for this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Conversation title"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave()
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
