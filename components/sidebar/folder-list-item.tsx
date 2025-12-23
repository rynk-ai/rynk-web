"use client";

import { memo } from "react";
import { type Folder, type CloudConversation as Conversation } from "@/lib/services/cloud-db";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PiCaretRight, PiFolder as FolderIcon, PiDotsThree, PiPencilSimple, PiTrash } from "react-icons/pi";
import { ConversationListItem } from "./conversation-list-item";

interface FolderListItemProps {
  folder: Folder;
  conversations: Conversation[];
  currentConversationId: string | null;
  activeProjectId: string | null;
  onSelectConversation: (id: string) => void;
  onEditFolder: (folder: Folder, e: React.MouseEvent) => void;
  onDeleteFolder: (folderId: string, e: React.MouseEvent) => void;
  onAddToFolder: (id: string) => void;
  onRenameConversation: (id: string) => void;
  onEditTags: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const FolderListItem = memo(function FolderListItem({
  folder,
  conversations,
  currentConversationId,
  activeProjectId,
  onSelectConversation,
  onEditFolder,
  onDeleteFolder,
  onAddToFolder,
  onRenameConversation,
  onEditTags,
  onDeleteConversation,
}: FolderListItemProps) {
  const folderConversations = conversations.filter(
    (c) =>
      folder.conversationIds.includes(c.id) &&
      !c.isPinned &&
      (!activeProjectId || c.projectId === activeProjectId)
  );

  return (
    <Collapsible className="group/collapsible">
      <div className="mb-0.5 flex items-center justify-between px-2 py-1 group/folder hover:bg-muted/50 rounded-md transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <PiCaretRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          <FolderIcon className="h-3.5 w-3.5" />
          <span className="truncate">{folder.name}</span>
          <span className="text-[10px] text-muted-foreground/50 ml-auto mr-2">
            {folderConversations.length}
          </span>
        </CollapsibleTrigger>
        <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <PiDotsThree className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onEditFolder(folder, e)}>
                <PiPencilSimple className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => onDeleteFolder(folder.id, e)}
                className="text-destructive focus:text-destructive"
              >
                <PiTrash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CollapsibleContent>
        <div className="space-y-1 pl-7">
          {folderConversations.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 px-2 pl-6">
              Empty folder
            </div>
          ) : (
            folderConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={currentConversationId === conversation.id}
                onSelect={onSelectConversation}
                onAddToFolder={onAddToFolder}
                onRename={onRenameConversation}
                onEditTags={onEditTags}
                onDelete={onDeleteConversation}
                showPinAction={false}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to avoid re-renders when unrelated props change
  // We need to check if the folder itself changed, or if the conversations inside it changed
  // or if the active conversation changed (to update highlighting)
  
  if (prevProps.folder !== nextProps.folder) return false;
  if (prevProps.currentConversationId !== nextProps.currentConversationId) return false;
  if (prevProps.activeProjectId !== nextProps.activeProjectId) return false;
  
  // Check if conversations list length changed (quick check)
  if (prevProps.conversations.length !== nextProps.conversations.length) return false;
  
  // Deep check for conversations relevant to this folder might be too expensive, 
  // but since we pass the full conversations array, we rely on reference equality of the array
  // or the fact that parent re-renders when conversations change.
  if (prevProps.conversations !== nextProps.conversations) return false;

  return true;
});
