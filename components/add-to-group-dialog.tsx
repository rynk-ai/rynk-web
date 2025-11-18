"use client"

import { useState, useEffect } from "react"
import { dbService, type Group } from "@/lib/services/indexeddb"
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
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddToGroupDialogProps {
  open: boolean
  onClose: () => void
  onSave: (groupIds: string[]) => void
  conversationId: string
  existingGroups: Group[]
}

export function AddToGroupDialog({
  open,
  onClose,
  onSave,
  conversationId,
  existingGroups,
}: AddToGroupDialogProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Pre-select groups that already contain this conversation
  useEffect(() => {
    const groupsContainingConversation = existingGroups
      .filter(group => group.conversationIds.includes(conversationId))
      .map(group => group.id);
    setSelectedGroupIds(groupsContainingConversation);
  }, [existingGroups, conversationId])

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      onSave(selectedGroupIds)
      onClose()
    } catch (err) {
      console.error('Failed to update group memberships:', err)
      alert('Failed to update group memberships')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Groups</DialogTitle>
          <DialogDescription>
            Manage which groups this conversation belongs to. Select or deselect groups as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Select Groups</Label>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {existingGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No groups yet. Create a group first to add conversations.
                </div>
              ) : (
                existingGroups.map((group) => {
                  const isAlreadyInGroup = group.conversationIds.includes(conversationId);
                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-2 hover:bg-muted",
                        isAlreadyInGroup && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => handleToggleGroup(group.id)}
                      />
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label
                        htmlFor={`group-${group.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {group.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({group.conversationIds.length} conversations)
                        </span>
                        {isAlreadyInGroup && (
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
