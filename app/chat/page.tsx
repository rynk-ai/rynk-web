"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import { MessageList } from "@/components/chat/message-list";
import { VirtualizedMessageList } from "@/components/chat/virtualized-message-list";
import {  
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ui/message";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Button } from "@/components/ui/button";
import { AssistantSkeleton } from "@/components/ui/assistant-skeleton";
import { useChatContext } from "@/lib/hooks/chat-context";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useStreaming } from "@/lib/hooks/use-streaming";
import type {
  CloudMessage as ChatMessage,
  CloudConversation as Conversation,
  Folder,
} from "@/lib/services/cloud-db";
import { TagDialog } from "@/components/tag-dialog";
import { SearchDialog } from "@/components/search-dialog";
import { AddToFolderDialog } from "@/components/add-to-folder-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import { ConversationList } from "@/components/conversation-list";
import { ProjectList } from "@/components/project-list";
import {
  Copy,
  Paperclip,
  Pencil,
  PinIcon,
  Plus,
  Trash,
  Check,
  X,
  MessageSquare,
  MoreHorizontal,
  Folder as FolderIcon,
  ChevronRight,
  Users,
  Search,
  FolderPlus,
  ChevronLeft,
  GitBranch,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { FilePreviewList } from "@/components/file-preview";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { dbService } from "@/lib/services/indexeddb";
import { VersionIndicator } from "@/components/ui/version-indicator";
import { ContextPicker } from "@/components/context-picker";

import { FolderDialog } from "@/components/folder-dialog";
import { DeleteConversationDialog } from "@/components/delete-conversation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { ChatContainerContent, ChatContainerRoot } from "@/components/prompt-kit/chat-container";

interface ChatSidebarProps {
  onConversationSelect?: () => void;
}

// Helper function to filter messages to show only active versions
function filterActiveVersions(messages: ChatMessage[]): ChatMessage[] {
  const activeMessages: ChatMessage[] = []
  const versionGroups = new Map<string, ChatMessage[]>()

  // Group messages by their version root
  messages.forEach(msg => {
    const rootId = msg.versionOf || msg.id
    if (!versionGroups.has(rootId)) {
      versionGroups.set(rootId, [])
    }
    versionGroups.get(rootId)!.push(msg)
  })

  // For each version group, select the active version (highest versionNumber)
  versionGroups.forEach((versions, rootId) => {
    // Find the active version by looking for the one that appears in the current messages array
    // or pick the one with the highest versionNumber as fallback
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest
    })
    activeMessages.push(activeVersion)
  })

  // Sort by timestamp to maintain conversation order
  return activeMessages.sort((a, b) => a.timestamp - b.timestamp)
}

function ChatSidebar({ onConversationSelect }: ChatSidebarProps = {}) {
  const {
    conversations,
    currentConversation,
    currentConversationId,
    createConversation,
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
    projects,
    createProject,
    updateProject,
    deleteProject,
    loadProjects,
    renameConversation,
    setConversationContext,
    clearConversationContext,
    loadMoreConversations,
    hasMoreConversations,
    isLoadingMoreConversations,
    activeProjectId,
    selectProject,
  } = useChatContext();

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [addToFolderDialogOpen, setAddToFolderDialogOpen] = useState(false);
  const [selectedConversationForFolder, setSelectedConversationForFolder] =
    useState<string | null>(null);
  const [foldersForAddToFolder, setFoldersForAddToFolder] = useState<Folder[]>(
    []
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<
    string | null
  >(null);

  const loadTags = useCallback(async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  }, [getAllTags]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    };
    fetchTags();
  }, [getAllTags]);

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

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId);
    }
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

  const handlePin = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinConversation(conversationId);
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

  const handleUpdateFolderMembership = async (
    conversationId: string,
    newFolderIds: string[]
  ) => {
    // Find folders that currently contain this conversation
    const currentFolderIds = folders
      .filter((f) => f.conversationIds.includes(conversationId))
      .map((f) => f.id);

    // Folders to add to (in newFolderIds but not in currentFolderIds)
    const foldersToAdd = newFolderIds.filter(
      (id) => !currentFolderIds.includes(id)
    );

    // Folders to remove from (in currentFolderIds but not in newFolderIds)
    const foldersToRemove = currentFolderIds.filter(
      (id) => !newFolderIds.includes(id)
    );

    // Add to new folders
    for (const folderId of foldersToAdd) {
      await addConversationToFolder(folderId, conversationId);
    }

    // Remove from unselected folders
    for (const folderId of foldersToRemove) {
      await removeConversationFromFolder(folderId, conversationId);
    }

    await loadFolders();
    await loadConversations();
  };

  const handleSaveFolder = async (folder: any) => {
    // Folders are saved in the dialog component
    // Refresh the folders and conversations
    await loadFolders();
    await loadConversations();
    setFolderDialogOpen(false);
    setSelectedFolder(null);
  };

  // Helper to wrap selectConversation with mobile callback
  const handleSelectConversation = (id: string | null) => {
    selectConversation(id);
    onConversationSelect?.();
  };

  return (
    <div className="flex h-full w-full md:w-72 lg:w-80 flex-col border-r bg-card">
      {/* User Profile Section */}
      <div className="border-b">
        <UserProfileDropdown />
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1 items-center justify-start pl-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={() => {
              handleSelectConversation(null);
              // Focus input is handled in ChatContent via useEffect on currentConversationId
            }}
          >
            <span className="text-sm font-medium">
              New Chat {activeProjectId ? "in Project" : ""}
            </span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleCreateFolder}
            title="New Folder"
          >
            <FolderPlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            title="Search"
            onClick={() => setSearchDialogOpen(true)}
          >
            <Search className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto pt-4">
        {!activeProjectId ? (
          <div className="px-2 mb-4">
            <ProjectList
              projects={projects}
              activeProjectId={activeProjectId || undefined}
              onSelectProject={(id) =>
                selectProject(id === activeProjectId ? null : id)
              }
              onCreateProject={createProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
            />
          </div>
        ) : (
          <div className="px-4 mb-4">
            <Button
              variant="ghost"
              className="w-full justify-start px-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground"
              onClick={() => selectProject(null)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to all chats
            </Button>
            <div className="flex items-center gap-2 px-2 py-1">
              <FolderIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-lg tracking-tight">
                {projects.find((p) => p.id === activeProjectId)?.name ||
                  "Project"}
              </h2>
            </div>
          </div>
        )}
        <div className="px-4"></div>

        {/* Pinned Conversations */}
        {conversations.some((c) => c.isPinned) && (
          <div className="mb-4">
            <div className="px-4 mb-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
              <PinIcon className="h-3 w-3" />
              Pinned
            </div>
            <div className="space-y-1 px-2">
              {conversations
                .filter(
                  (c) =>
                    c.isPinned &&
                    (!activeProjectId || c.projectId === activeProjectId)
                )
                .map((conversation) => (
                  <div key={conversation.id} className="group relative">
                    <button
                      className={cn(
                        "flex w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-10",
                        currentConversationId === conversation.id && "bg-muted "
                      )}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate pl-1">
                            {conversation.title}
                          </span>
                        </div>
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-9 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinConversation(conversation.id);
                      }}
                      title="Unpin conversation"
                    >
                      <PinIcon className="h-4 w-4 fill-current" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleAddToFolder(conversation.id)}
                        >
                          Add to folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRename(conversation.id)}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTagClick(conversation.id)}
                        >
                          Edit tags
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteSimple(conversation.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Visual separator */}
        {(folders.length > 0 ||
          (() => {
            const groupedConversationIds = new Set(
              folders.flatMap((f) => f.conversationIds)
            );
            const ungroupedConversations = conversations.filter(
              (c) =>
                !groupedConversationIds.has(c.id) &&
                !c.isPinned &&
                (!activeProjectId || c.projectId === activeProjectId)
            );
            return ungroupedConversations.length > 0;
          })()) && <></>}

        {/* Folders Section - Show grouped conversations */}
        {folders.map((folder) => {
          const folderConversations = conversations.filter(
            (c) =>
              folder.conversationIds.includes(c.id) &&
              !c.isPinned &&
              (!activeProjectId || c.projectId === activeProjectId)
          );

          // Even if empty, we might want to show the folder so users can add to it?
          // But original logic hid it. Let's keep hiding if empty for now, unless we want to allow managing empty folders.
          if (folderConversations.length === 0) return null;

          return (
            <Collapsible
              key={folder.id}
              className="my-2 px-2 group/collapsible"
            >
              <div className="mb-1 flex items-center justify-between px-2 group">
                <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-sm font-semibold text-foreground pl-2 hover:opacity-80">
                  <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <FolderIcon className="h-4 w-4 text-muted-foreground/70" />
                  <span>{folder.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({folderConversations.length})
                  </span>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={(e) => handleEditFolder(folder, e)}
                    title="Edit folder"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    title="Delete folder"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  {folderConversations.map((conversation) => (
                    <div key={conversation.id} className="group/convo relative">
                      <button
                        className={cn(
                          "flex w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-10"
                        )}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                      >
                        <div className="flex w-full flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate pl-1">
                              {conversation.title}
                            </span>
                          </div>
                        </div>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-9 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/convo:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinConversation(conversation.id);
                        }}
                        title="Pin conversation"
                      >
                        <PinIcon className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/convo:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAddToFolder(conversation.id)}
                          >
                            Add to folder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRename(conversation.id)}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTagClick(conversation.id)}
                          >
                            Edit tags
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSimple(conversation.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete conversation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Time-based conversation sections (Today, Yesterday, etc.) - Only show ungrouped */}
        <ConversationList
          conversations={conversations.filter(
            (c) =>
              !c.isPinned &&
              (!activeProjectId || c.projectId === activeProjectId)
          )}
          folders={folders}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onTogglePin={togglePinConversation}
          onAddToFolder={handleAddToFolder}
          onEditTags={handleTagClick}
          onRename={handleRename}
          onDelete={handleDeleteSimple}
        />
        
        {hasMoreConversations && (
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => loadMoreConversations()}
              disabled={isLoadingMoreConversations}
            >
              {isLoadingMoreConversations ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>

      {tagDialogOpen && selectedConversationId && (
        <TagDialog
          conversationId={selectedConversationId}
          currentTags={
            conversations.find((c) => c.id === selectedConversationId)?.tags ||
            []
          }
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
          allConversations={conversations}
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
            await handleUpdateFolderMembership(
              selectedConversationForFolder,
              folderIds
            );
            setAddToFolderDialogOpen(false);
            setSelectedConversationForFolder(null);
          }}
          conversationId={selectedConversationForFolder}
          existingFolders={foldersForAddToFolder}
        />
      )}

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        conversations={conversations}
        allTags={allTags}
        onSelectConversation={handleSelectConversation}
      />

      {renameDialogOpen && conversationToRename && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) setConversationToRename(null);
          }}
          initialTitle={
            conversations.find((c) => c.id === conversationToRename)?.title ||
            ""
          }
          onSave={handleSaveRename}
        />
      )}

      {conversationToDelete && (
        <DeleteConversationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          conversationTitle={conversationToDelete.title}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

interface ChatContentProps {
  onMenuClick?: () => void;
}

function ChatContent({ onMenuClick }: ChatContentProps = {}) {
  const {
    sendMessage,
    currentConversation,
    currentConversationId,
    editMessage,
    deleteMessage: deleteMessageAction,
    switchToMessageVersion,
    getMessageVersions,
    isLoading: contextIsLoading,
    branchConversation,
    getMessages,
    conversations,
    folders,
    setConversationContext,
    clearConversationContext,
  } = useChatContext();
  
  // Use custom hooks for separated state management
  const messageState = useMessageState();
  const editState = useMessageEdit();
  const streamingState = useStreaming();
  
  // Destructure for convenience
  const { messages, setMessages, messageVersions, setMessageVersions } = messageState;
  const { 
    isEditing, setIsEditing, 
    editingMessageId, 
    editContent, setEditContent,
    editContext, setEditContext,
    startEdit, cancelEdit 
  } = editState;
  const {
    streamingMessageId,
    streamingContent,
    startStreaming,
    updateStreamContent,
    finishStreaming
  } = streamingState;
  
  // Other local state
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Auto-focus input when starting a new chat
  useEffect(() => {
    if (!currentConversationId) {
      // Small timeout to ensure DOM is ready and state is settled
      const timer = setTimeout(() => {
        const input = document.getElementById("main-chat-input");
        if (input) {
          input.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [currentConversationId]);

  const isLoading = isSending || isEditing || !!isDeleting || contextIsLoading;

  // Local context state (used ONLY for new conversations)
  const [localContext, setLocalContext] = useState<
    { type: "conversation" | "folder"; id: string; title: string }[]
  >([]);

  // Derived active context (source of truth) - optimized with better dependencies
  const activeContext = useMemo(() => {
    if (currentConversationId) {
      const ctx: { type: "conversation" | "folder"; id: string; title: string }[] = [];
      
      currentConversation?.activeReferencedConversations?.forEach(c => {
        ctx.push({ type: "conversation", id: c.id, title: c.title });
      });
      
      currentConversation?.activeReferencedFolders?.forEach(f => {
        ctx.push({ type: "folder", id: f.id, title: f.name });
      });
      
      return ctx;
    }
    return localContext;
  }, [
    currentConversationId,
    // Use JSON.stringify to prevent re-computation on reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(currentConversation?.activeReferencedConversations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(currentConversation?.activeReferencedFolders),
    localContext
  ]);

  // Reset local context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
    }
  }, [currentConversationId]);

  const handleContextChange = useCallback(async (newContext: typeof localContext) => {
    if (currentConversationId) {
      const conversationRefs = newContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));
      const folderRefs = newContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      await setConversationContext(currentConversationId, conversationRefs, folderRefs);
    } else {
      setLocalContext(newContext);
    }
  }, [currentConversationId, setConversationContext]);

  const handleSubmit = useCallback(async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);

    try {
      const referencedConversations = activeContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFolders = activeContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      const result = await sendMessage(
        text,
        files,
        referencedConversations,
        referencedFolders
      );

      if (!result) return;

      const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

      // Optimistically add messages using returned IDs
      if (userMessageId && assistantMessageId) {
        const timestamp = Date.now();
        
        const optimisticUserMessage: ChatMessage = {
          id: userMessageId,
          conversationId,
          role: 'user',
          content: text,
          attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
          referencedConversations,
          referencedFolders,
          createdAt: timestamp,
          timestamp,
          userId: '',
          versionNumber: 1
        };

        const optimisticAssistantMessage: ChatMessage = {
          id: assistantMessageId,
          conversationId,
          role: 'assistant',
          content: '',
          createdAt: timestamp,
          timestamp,
          userId: '',
          versionNumber: 1
        };

        messageState.addMessages([optimisticUserMessage, optimisticAssistantMessage]);
        startStreaming(assistantMessageId);
      }

      // Read the stream with throttling
      const decoder = new TextDecoder();
      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateStreamContent(fullContent);
        }
      } catch (err) {
        console.error("Error reading stream:", err);
      } finally {
        finishStreaming();
        
        // Update final content
        if (assistantMessageId) {
          messageState.updateMessage(assistantMessageId, { content: fullContent });
        }
      }

    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  }, [activeContext, sendMessage, messageState, startStreaming, updateStreamContent, finishStreaming]);

  // ... (rest of the component)

  // ... (handleSubmit remains same)

  const handleStartEdit = useCallback((message: ChatMessage) => {
    if (isLoading) return;
    
    // Populate initial context from message references
    const initialContext: {
      type: "conversation" | "folder";
      id: string;
      title: string;
    }[] = [];
    if (message.referencedConversations) {
      initialContext.push(
        ...message.referencedConversations.map((c) => ({
          type: "conversation" as const,
          id: c.id,
          title: c.title,
        }))
      );
    }
    if (message.referencedFolders) {
      initialContext.push(
        ...message.referencedFolders.map((f) => ({
          type: "folder" as const,
          id: f.id,
          title: f.name,
        }))
      );
    }
    
    startEdit(message, initialContext);

    // Focus and select all text after state update
    setTimeout(() => {
      const textarea = document.querySelector(
        "textarea[autofocus]"
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 0);
  }, [isLoading, startEdit]);

  const handleCancelEdit = useCallback(() => {
    if (isEditing) return;
    cancelEdit();
  }, [isEditing, cancelEdit]);

  const handleSaveEdit = async () => {
    if (!editingMessageId || isEditing || !editContent.trim()) return;
    setIsEditing(true);
    
    try {
      const referencedConversations = editContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFolders = editContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      // Clear edit UI immediately for better UX
      cancelEdit();

      // Save the edit to server (creates a new message version)
      const result = await editMessage(
        editingMessageId,
        editContent,
        undefined,
        referencedConversations,
        referencedFolders
      );

      // Fetch updated messages ONCE to get the new conversation state with the edited version
      const updatedMessages = await getMessages(currentConversationId!);
      // Filter to show only active versions (no duplicates)
      const filteredMessages = filterActiveVersions(updatedMessages);
      setMessages(filteredMessages);

      // Check if we need to generate an AI response
      // If the edited message created a new path ending with a user message, generate AI response
      const lastMsg = filteredMessages[filteredMessages.length - 1];
      
      if (lastMsg && lastMsg.role === "user") {
        // Generate AI response using the consolidated /api/chat endpoint
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: currentConversationId,
              messageId: lastMsg.id,  // Use messageId instead of message content
            }),
          });

          if (response.ok && response.body) {
            // Extract assistant message ID from headers
            const assistantMessageId = response.headers.get('X-Assistant-Message-Id');
            
            if (assistantMessageId) {
              // Create optimistic assistant placeholder
              const timestamp = Date.now();
              const optimisticAssistant: ChatMessage = {
                id: assistantMessageId,
                conversationId: currentConversationId!,
                role: 'assistant',
                content: '',
                createdAt: timestamp,
                timestamp,
                userId: '',
                versionNumber: 1
              };

              messageState.addMessages([optimisticAssistant]);
              startStreaming(assistantMessageId);

              // Read and display the stream
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let fullContent = "";

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value, { stream: true });
                  fullContent += chunk;
                  updateStreamContent(fullContent);
                }
              } finally {
                // Clear streaming state
                finishStreaming();

                // Optimistic update instead of DB fetch!
                messageState.updateMessage(assistantMessageId, { content: fullContent });
              }
            }
          }
        } catch (aiError) {
          console.error("Failed to generate AI response:", aiError);
          finishStreaming();
        }
      }

    } catch (error) {
      console.error("Failed to save edit:", error);
      // Revert optimistic update on error by fetching from server
      try {
        const revertedMessages = await getMessages(currentConversationId!);
        const filteredRevertedMessages = filterActiveVersions(revertedMessages);
        setMessages(filteredRevertedMessages);
      } catch (fetchError) {
        console.error("Failed to revert after error:", fetchError);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (isLoading) return;
    setIsDeleting(messageId);
    try {
      await deleteMessageAction(messageId);
    } finally {
      setIsDeleting(null);
    }
  }, [isLoading, deleteMessageAction]);

  const handleBranchFromMessage = useCallback(async (messageId: string) => {
    if (isLoading) return;

    if (confirm("Create a new conversation from this point?")) {
      try {
        await branchConversation(messageId);
      } catch (err) {
        console.error("Failed to branch conversation:", err);
      }
    }
  }, [isLoading, branchConversation]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Reload messages (can be called from version switching)
  const reloadMessages = useCallback(async () => {
    if (!currentConversation) {
      setMessages([]);
      setMessageVersions(new Map());
      return;
    }

    try {
      const loadedMessages = await getMessages(currentConversation.id);
      console.log("✅ Loaded", loadedMessages.length, "messages");
      // Filter to show only active versions (no duplicates)
      const filteredMessages = filterActiveVersions(loadedMessages);
      setMessages(filteredMessages);

      // Load versions for each message (load from all versions, not just active)
      const versionsMap = new Map<string, ChatMessage[]>();
      for (const message of loadedMessages) {
        const rootId = message.versionOf || message.id;
        if (!versionsMap.has(rootId)) {
          const versions = await getMessageVersions(rootId);
          versionsMap.set(rootId, versions);
        }
      }
      setMessageVersions(versionsMap);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
      setMessageVersions(new Map());
    }
  }, [currentConversation?.id, getMessages, getMessageVersions]);

  // Load messages from conversation path
  useEffect(() => {
    // Skip if we're in the middle of an edit to prevent race conditions
    if (isEditing) return;

    reloadMessages();
  }, [currentConversation?.id, isEditing, reloadMessages]); // Only depend on ID, not entire object

  return (
    <main className="flex h-screen flex-col overflow-hidden relative">
      {/* Floating Mobile Menu Button - positioned absolutely */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-black/80 hover:bg-black text-white shadow-lg backdrop-blur-sm"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Top Section: Messages & Title */}
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* Title for New Chat - Fades out when conversation starts */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-16 transition-opacity duration-500 ease-in-out pointer-events-none",
              !currentConversationId ? "opacity-100" : "opacity-0"
            )}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-foreground/80 mb-1">
              simplychat.
            </h1>
          </div>

          {/* Messages Container - Fades in/Visible when conversation active */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-in-out",
              currentConversationId ? "opacity-100 z-10" : "opacity-0 -z-10"
            )}
          >
            <ChatContainerRoot className="h-full px-3 md:px-4 lg:px-6">
               <ChatContainerContent className="space-y-6 md:space-y-8 lg:space-y-10 px-0 sm:px-2 md:px-4 pb-4">
                <MessageList
                  messages={messages}
                  isSending={isSending}
                  streamingMessageId={streamingMessageId}
                  streamingContent={streamingContent}
                  editingMessageId={editingMessageId}
                  onStartEdit={handleStartEdit}
                  onDeleteMessage={handleDeleteMessage}
                  onBranchFromMessage={handleBranchFromMessage}
                />
              </ChatContainerContent>
            </ChatContainerRoot>
          </div>
        </div>

        {/* Input Section - Always rendered, moves with flex layout */}
        <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pb-safe-bottom z-20">
          {activeContext.length > 0 && (
            <div
              className={cn(
                "mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2 px-0 md:px-1 transition-all duration-500",
                !currentConversationId ? "justify-center" : "justify-start"
              )}
            >
              {activeContext.map((c, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-1 md:gap-1.5 bg-primary/5 hover:bg-primary/10 pl-2 md:pl-2.5 pr-1 md:pr-1.5 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs border border-primary/10 transition-all duration-200"
                >
                  {c.type === "folder" ? (
                    <FolderIcon className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-500" />
                  ) : (
                    <MessageSquare className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary" />
                  )}
                  <span className="font-medium text-foreground/80 max-w-[80px] md:max-w-[120px] truncate">
                    {c.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3.5 w-3.5 md:h-4 md:w-4 ml-0.5 rounded-full hover:bg-background/50 hover:text-destructive opacity-50 group-hover:opacity-100 transition-all"
                    onClick={() =>
                      handleContextChange(
                        activeContext.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 md:h-7 px-2 text-[10px] md:text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleContextChange([])}
              >
                Clear all
              </Button>
            </div>
          )}

          <PromptInputWithFiles
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={
              !currentConversationId ? "Message..." : "Type a message..."
            }
            className={cn(
              "glass relative z-20 w-full rounded-2xl md:rounded-3xl border border-border/50 p-0 transition-all duration-500",
              !currentConversationId ? "shadow-lg" : "shadow-sm hover:shadow-md"
            )}
            context={activeContext}
            onContextChange={handleContextChange}
            currentConversationId={currentConversationId}
            conversations={conversations}
            folders={folders}
          />
        </div>

        {/* Bottom Spacer - The Animator */}
        {/* When no conversation (New Chat), this spacer grows to push input up */}
        {/* When conversation active, it shrinks to provide small padding */}
        <div
          className={cn(
            "transition-[flex-grow] duration-500 ease-in-out",
            !currentConversationId ? "flex-[0.8]" : "flex-none h-3 md:h-4"
          )}
        />
      </div>
    </main>
  );
}

function FullChatApp() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <ChatProvider>
        <div className="flex h-screen w-full overflow-hidden">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:flex">
            <ChatSidebar />
          </div>

          {/* Mobile Sidebar - Drawer */}
          <SheetTitle>{""}</SheetTitle>
          <SheetContent
            side="left"
            className="w-[280px] sm:w-[320px] p-0 md:hidden"
          >
            <ChatSidebar
              onConversationSelect={() => setMobileMenuOpen(false)}
            />
          </SheetContent>

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatContent onMenuClick={() => setMobileMenuOpen(true)} />
          </div>
        </div>
      </ChatProvider>
    </Sheet>
  );
}

export default function ChatPage() {
  return <FullChatApp />;
}
