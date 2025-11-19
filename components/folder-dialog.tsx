"use client"

import { useState, useEffect } from "react"
import { dbService, type Folder, type Conversation } from "@/lib/services/indexeddb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageSquare } from "lucide-react"

interface FolderDialogProps {
  open: boolean
  onClose: () => void
  onSave: (folder: Folder) => void
  currentFolder?: Folder | null
  allConversations: Conversation[]
}

export function FolderDialog({
  open,
  onClose,
  onSave,
  currentFolder,
  allConversations,
}: FolderDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentFolder) {
      setName(currentFolder.name)
      setDescription(currentFolder.description || "")
      setSelectedConversationIds([...currentFolder.conversationIds])
    } else {
      setName("")
      setDescription("")
      setSelectedConversationIds([])
    }
  }, [currentFolder])

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversationIds(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      let folder: Folder

      if (currentFolder) {
        // Update existing folder
        await dbService.updateFolder(currentFolder.id, {
          name,
          description,
          conversationIds: selectedConversationIds,
        })
        folder = await dbService.getFolder(currentFolder.id) as Folder
      } else {
        // Create new folder
        folder = await dbService.createFolder(name, description, selectedConversationIds)
      }

      onSave(folder)
      onClose()
    } catch (err) {
      console.error('Failed to save folder:', err)
      alert('Failed to save folder')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {currentFolder ? "Edit Folder" : "Create New Folder"}
          </DialogTitle>
          <DialogDescription>
            {currentFolder
              ? "Update folder information and select conversations."
              : "Create a new folder to organize your chats."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter folder description"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Select Conversations</Label>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {allConversations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet. Create a chat first to add it to a folder.
                </div>
              ) : (
                allConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Checkbox
                      id={`conversation-${conversation.id}`}
                      checked={selectedConversationIds.includes(conversation.id)}
                      onCheckedChange={() => handleToggleConversation(conversation.id)}
                    />
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor={`conversation-${conversation.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {conversation.title}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? "Saving..." : currentFolder ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
