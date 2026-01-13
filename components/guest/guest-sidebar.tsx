"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PiPlus, PiMagnifyingGlass, PiFolderPlus, PiFolder as FolderIcon, PiCaretRight, PiSignIn, PiSparkle, PiQuestion } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { useGuestChatContext, type GuestConversation, type GuestFolder } from "@/lib/hooks/guest-chat-context";
import { ConversationList } from "@/components/conversation-list";
import { FolderListItem } from "@/components/sidebar/folder-list-item";
import { ConversationListItem } from "@/components/sidebar/conversation-list-item";
import { FolderDialog } from "@/components/folder-dialog";
import { DeleteConversationDialog } from "@/components/delete-conversation-dialog";
import { TagDialog } from "@/components/tag-dialog";
import { AddToFolderDialog } from "@/components/add-to-folder-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const GuestSidebarBase = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const router = useRouter();

  const {
    conversations,
    currentConversationId,
    selectConversation,
    deleteConversation,
    togglePinConversation,
    updateConversationTags,
    getAllTags,
    folders,
    addConversationToFolder,
    removeConversationFromFolder,
    deleteFolder,
    loadFolders,
    loadConversations,
    renameConversation,
    loadingConversations,
    creditsRemaining,
    isLoadingConversations,
  } = useGuestChatContext();

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [addToFolderDialogOpen, setAddToFolderDialogOpen] = useState(false);
  const [selectedConversationForFolder, setSelectedConversationForFolder] = useState<string | null>(null);
  const [foldersForAddToFolder, setFoldersForAddToFolder] = useState<GuestFolder[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<GuestConversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  }, [getAllTags]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleTagClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setTagDialogOpen(true);
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!selectedConversationId) return;
    await updateConversationTags(selectedConversationId, tags);
    await loadTags();
  };

  const handleRename = (conversationId: string) => {
    setConversationToRename(conversationId);
    setRenameDialogOpen(true);
  };

  const handleSaveRename = async (newTitle: string) => {
    if (!conversationToRename) return;
    await renameConversation(conversationToRename, newTitle);
    setConversationToRename(null);
  };

  const handleDeleteSimple = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setConversationToDelete(conversation);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    setIsDeleting(true);
    try {
      await deleteConversation(conversationToDelete.id);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateFolder = () => {
    setSelectedFolder(null);
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folder: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setFolderDialogOpen(true);
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this folder?")) {
      await deleteFolder(folderId);
    }
  };

  const handleAddToFolder = (conversationId: string) => {
    setSelectedConversationForFolder(conversationId);
    setFoldersForAddToFolder(folders);
    setAddToFolderDialogOpen(true);
  };

  const handleUpdateFolderMembership = async (conversationId: string, newFolderIds: string[]) => {
    const currentFolderIds = folders
      .filter((f) => f.conversationIds.includes(conversationId))
      .map((f) => f.id);

    const foldersToAdd = newFolderIds.filter((id) => !currentFolderIds.includes(id));
    const foldersToRemove = currentFolderIds.filter((id) => !newFolderIds.includes(id));

    for (const folderId of foldersToAdd) {
      await addConversationToFolder(folderId, conversationId);
    }

    for (const folderId of foldersToRemove) {
      await removeConversationFromFolder(folderId, conversationId);
    }

    await loadFolders();
    await loadConversations();
  };

  const handleSaveFolder = async (folder: any) => {
    await loadFolders();
    await loadConversations();
    setFolderDialogOpen(false);
    setSelectedFolder(null);
  };

  const handleSelectConversation = (id: string | null, conversation?: any) => {
    selectConversation(id, conversation);
    if (id) {
      router.push(`/guest-chat?id=${encodeURIComponent(id)}`);
    } else {
      router.push("/guest-chat");
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        {/* Guest mode banner */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-3">
            {creditsRemaining !== null ? (
              <>You have <span className="font-medium text-foreground">{creditsRemaining}</span> free messages remaining</>
            ) : (
              "Try our AI chat for free!"
            )}
          </p>
          <Button
            className="w-full"
            onClick={handleSignIn}
          >
            <PiSignIn className="mr-2 h-4 w-4" />
            Sign in to continue
          </Button>
        </div>
        <Separator />
      </SidebarHeader>

      <SidebarContent>
        <div className="flex flex-col gap-2 p-2">
          <div className="flex gap-1">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2 px-3 shadow-none border-border/50 bg-background/50"
              onClick={() => handleSelectConversation(null)}
            >
              <PiPlus className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">New Chat</span>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleCreateFolder}
                >
                  <PiFolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Folders Section */}
          <div className="px-3 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-muted-foreground tracking-normal">Folders</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4">
                      <PiQuestion className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <p>Organize your chats into folders to keep related conversations together.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateFolder}>
                <PiPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className="text-xs text-center text-muted-foreground py-4 px-4">
              No folders yet.
              <br />
              Create one to organize your chats!
            </div>
          ) : (
            folders.map((folder) => (
              <FolderListItem
                key={folder.id}
                folder={folder as any}
                conversations={conversations as any}
                currentConversationId={currentConversationId}
                activeProjectId={null}
                onSelectConversation={handleSelectConversation}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
                onAddToFolder={handleAddToFolder}
                onRenameConversation={handleRename}
                onEditTags={handleTagClick}
                onDeleteConversation={handleDeleteSimple}
              />
            ))
          )}

          {/* Pinned Conversations */}
          {conversations.some((c) => c.isPinned) && (
            <div className="mb-4">
              <div className="px-3 mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Pinned
              </div>
              <div className="space-y-0.5 px-2">
                {conversations
                  .filter((c) => c.isPinned)
                  .map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation as any}
                      isActive={currentConversationId === conversation.id}
                      onSelect={handleSelectConversation}
                      onTogglePin={togglePinConversation}
                      showMenu={false}
                      isLoading={loadingConversations.has(conversation.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <ConversationList
            conversations={conversations.filter((c) => !c.isPinned) as any}
            folders={folders as any}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onTogglePin={togglePinConversation}
            onAddToFolder={handleAddToFolder}
            onEditTags={handleTagClick}
            onRename={handleRename}
            onDelete={handleDeleteSimple}
            isLoading={isLoadingConversations}
            loadingConversations={loadingConversations}
          />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 text-center">
          <p className="text-xs text-muted-foreground">
            <a href="/login" className="text-primary hover:underline">Sign in</a> to save your chats permanently
          </p>
        </div>
      </SidebarFooter>

      {/* Dialogs */}
      {tagDialogOpen && selectedConversationId && (
        <TagDialog
          conversationId={selectedConversationId}
          currentTags={conversations.find((c) => c.id === selectedConversationId)?.tags || []}
          allTags={allTags}
          onSave={handleSaveTags}
          onClose={() => {
            setTagDialogOpen(false);
            setSelectedConversationId(null);
          }}
        />
      )}

      {folderDialogOpen && (
        <FolderDialog
          open={folderDialogOpen}
          onClose={() => {
            setFolderDialogOpen(false);
            setSelectedFolder(null);
          }}
          onSave={handleSaveFolder}
          currentFolder={selectedFolder}
          allConversations={conversations as any}
        />
      )}

      {addToFolderDialogOpen && selectedConversationForFolder && (
        <AddToFolderDialog
          open={addToFolderDialogOpen}
          onClose={() => {
            setAddToFolderDialogOpen(false);
            setSelectedConversationForFolder(null);
          }}
          onSave={async (folderIds: string[]) => {
            await handleUpdateFolderMembership(selectedConversationForFolder, folderIds);
            setAddToFolderDialogOpen(false);
            setSelectedConversationForFolder(null);
          }}
          conversationId={selectedConversationForFolder}
          existingFolders={foldersForAddToFolder as any}
        />
      )}

      {renameDialogOpen && conversationToRename && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) setConversationToRename(null);
          }}
          initialTitle={conversations.find((c) => c.id === conversationToRename)?.title || ""}
          onSave={handleSaveRename}
        />
      )}

      {conversationToDelete && (
        <DeleteConversationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          conversationTitle={conversationToDelete.title || "Untitled Chat"}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      )}
    </Sidebar>
  );
};

export const GuestSidebar = memo(GuestSidebarBase, (prevProps, nextProps) => {
  return prevProps === nextProps;
});
