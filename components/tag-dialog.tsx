"use client";

import { useState, useEffect } from "react";
import { PiMagnifyingGlass, PiTag, PiPlus } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TagDialogProps {
  conversationId: string;
  currentTags: string[];
  allTags: string[];
  onSave: (tags: string[]) => Promise<void>;
  onClose: () => void;
}

export function TagDialog({
  conversationId,
  currentTags,
  allTags,
  onSave,
  onClose,
}: TagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredTags = allTags.filter(
    (tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedTags.includes(tag),
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addNewTag = () => {
    const newTag = searchQuery.trim();
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags((prev) => [...prev, newTag]);
      setSearchQuery("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedTags);
      onClose();
    } catch (err) {
      console.error("Failed to save tags:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border border-border/40 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiTag className="h-4 w-4 text-primary" />
            Manage Tags
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Current Tags */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected Tags</div>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-primary/5 border border-primary/20 px-3 py-1 text-sm"
                  >
                    <PiTag className="h-3 w-3 text-primary" />
                    <span>{tag}</span>
                    <button
                      onClick={() => toggleTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search/Add Tag */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Add Tags</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search or create tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNewTag();
                    }
                  }}
                  className="pl-9"
                />
              </div>
              {searchQuery.trim() && !allTags.includes(searchQuery.trim()) && (
                <Button onClick={addNewTag} size="icon">
                  <PiPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Available Tags */}
          {filteredTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Available Tags</div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {filteredTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors",
                      selectedTags.includes(tag) && "bg-secondary",
                    )}
                  >
                    <PiTag className="h-4 w-4" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
