"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PiWarning } from "react-icons/pi"

interface DeleteMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageRole: 'user' | 'assistant'
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  messageRole,
  onConfirm,
  isLoading = false,
}: DeleteMessageDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border border-border/40 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PiWarning className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Message</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete this {messageRole} message? This action cannot be undone and will also remove all subsequent messages in the conversation.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
