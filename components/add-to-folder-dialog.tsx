"use client"

import { useState, useEffect } from "react"
import { dbService, type Folder } from "@/lib/services/indexeddb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Folder as FolderIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddToFolderDialogProps {
  open: boolean
  onClose: () => void
  onSave: (folderIds: string[]) => void
  conversationId: string
  existingFolders: Folder[]
}

export function AddToFolderDialog({
  open,
  onClose,
  onSave,
  conversationId,
  existingFolders,
}: AddToFolderDialogProps) {
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Pre-select folders that already contain this conversation
  useEffect(() => {
    const foldersContainingConversation = existingFolders
      .filter(folder => folder.conversationIds.includes(conversationId))
      .map(folder => folder.id);
    setSelectedFolderIds(foldersContainingConversation);
  }, [existingFolders, conversationId])

  const handleToggleFolder = (folderId: string) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      onSave(selectedFolderIds)
      onClose()
    } catch (err) {
      console.error('Failed to update folder memberships:', err)
      alert('Failed to update folder memberships')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Folders</DialogTitle>
          <DialogDescription>
            Manage which folders this conversation belongs to. Select or deselect folders as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Select Folders</Label>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {existingFolders.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No folders yet. Create a folder first to add conversations.
                </div>
              ) : (
                existingFolders.map((folder) => {
                  const isAlreadyInFolder = folder.conversationIds.includes(conversationId);
                  return (
                    <div
                      key={folder.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 hover:bg-muted",
                        isAlreadyInFolder && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        id={`folder-${folder.id}`}
                        checked={selectedFolderIds.includes(folder.id)}
                        onCheckedChange={() => handleToggleFolder(folder.id)}
                      />
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      <Label
                        htmlFor={`folder-${folder.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {folder.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({folder.conversationIds.length} conversations)
                        </span>
                        {isAlreadyInFolder && (
                          <span className="ml-2 text-xs text-primary font-medium">
                            • Already added
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
