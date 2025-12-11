"use client"

import { useState, useEffect } from "react"
import { useChatContext } from "@/lib/hooks/chat-context"
import type { CloudConversation as Conversation, Folder } from "@/lib/services/cloud-db"
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
  const { createFolder, updateFolder } = useChatContext()
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
        await updateFolder(currentFolder.id, {
          name,
          description,
          conversationIds: selectedConversationIds,
        })
        // Mock the folder object for onSave callback
        folder = {
          ...currentFolder,
          name,
          description,
          conversationIds: selectedConversationIds,
          updatedAt: Date.now()
        } as Folder
      } else {
        // Create new folder
        folder = await createFolder(name, description, selectedConversationIds)
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
      <DialogContent className="sm:max-w-[600px] border border-border/40 shadow-xl">
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
            <div className="max-h-[300px] overflow-y-auto space-y-1 border border-border/40 rounded-xl p-2">
              {allConversations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet. Create a chat first to add it to a folder.
                </div>
              ) : (
                allConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-secondary/50 transition-colors"
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
