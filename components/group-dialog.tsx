"use client"

import { useState, useEffect } from "react"
import { dbService, type Group, type Conversation } from "@/lib/services/indexeddb"
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

interface GroupDialogProps {
  open: boolean
  onClose: () => void
  onSave: (group: Group) => void
  currentGroup?: Group | null
  allConversations: Conversation[]
}

export function GroupDialog({
  open,
  onClose,
  onSave,
  currentGroup,
  allConversations,
}: GroupDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentGroup) {
      setName(currentGroup.name)
      setDescription(currentGroup.description || "")
      setSelectedConversationIds([...currentGroup.conversationIds])
    } else {
      setName("")
      setDescription("")
      setSelectedConversationIds([])
    }
  }, [currentGroup])

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
      let group: Group

      if (currentGroup) {
        // Update existing group
        await dbService.updateGroup(currentGroup.id, {
          name,
          description,
          conversationIds: selectedConversationIds,
        })
        group = await dbService.getGroup(currentGroup.id) as Group
      } else {
        // Create new group
        group = await dbService.createGroup(name, description, selectedConversationIds)
      }

      onSave(group)
      onClose()
    } catch (err) {
      console.error('Failed to save group:', err)
      alert('Failed to save group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {currentGroup ? "Edit Group" : "Create New Group"}
          </DialogTitle>
          <DialogDescription>
            {currentGroup
              ? "Update group information and select conversations."
              : "Create a new group to organize your chats."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Select Conversations</Label>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {allConversations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet. Create a chat first to add it to a group.
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
            {isLoading ? "Saving..." : currentGroup ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
