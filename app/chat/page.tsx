"use client";

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Button } from "@/components/ui/button";
import { AssistantSkeleton } from "@/components/ui/assistant-skeleton";
import { useChatContext } from "@/lib/hooks/chat-context";
import { ChatProvider } from "@/lib/hooks/chat-context";
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
import { InlineTitleEdit } from "@/components/inline-title-edit";
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

interface ChatSidebarProps {
  onConversationSelect?: () => void;
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
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

  const handleDeleteSimple = async (conversationId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId);
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
              if (selectedProjectId) {
                createConversation(selectedProjectId);
              }
            }}
          >
            <span className="text-sm font-medium">
              New Chat {selectedProjectId ? "in Project" : ""}
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
        {!selectedProjectId ? (
          <div className="px-2 mb-4">
            <ProjectList
              projects={projects}
              activeProjectId={selectedProjectId || undefined}
              onSelectProject={(id) =>
                setSelectedProjectId(id === selectedProjectId ? null : id)
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
              onClick={() => setSelectedProjectId(null)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to all chats
            </Button>
            <div className="flex items-center gap-2 px-2 py-1">
              <FolderIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-lg tracking-tight">
                {projects.find((p) => p.id === selectedProjectId)?.name ||
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
                    (!selectedProjectId || c.projectId === selectedProjectId)
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
                (!selectedProjectId || c.projectId === selectedProjectId)
            );
            return ungroupedConversations.length > 0;
          })()) && <></>}

        {/* Folders Section - Show grouped conversations */}
        {folders.map((folder) => {
          const folderConversations = conversations.filter(
            (c) =>
              folder.conversationIds.includes(c.id) &&
              !c.isPinned &&
              (!selectedProjectId || c.projectId === selectedProjectId)
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
              (!selectedProjectId || c.projectId === selectedProjectId)
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
    deleteMessage,
    switchToMessageVersion,
    getMessageVersions,
    isLoading: contextIsLoading,
    renameConversation,
    branchConversation,
    getMessages,
    conversations,
    folders,
    setConversationContext,
    clearConversationContext,
  } = useChatContext();
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Loaded from path
  const [messageVersions, setMessageVersions] = useState<
    Map<string, ChatMessage[]>
  >(new Map());
  const [isRenaming, setIsRenaming] = useState(false);

  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [streamingContent, setStreamingContent] = useState<string>("");

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

  // Derived active context (source of truth)
  const activeContext = useMemo(() => {
    if (currentConversationId) {
      // For existing conversations, use persistent context from backend
      const ctx: {
        type: "conversation" | "folder";
        id: string;
        title: string;
      }[] = [];
      if (currentConversation?.activeReferencedConversations) {
        ctx.push(
          ...currentConversation.activeReferencedConversations.map((c) => ({
            type: "conversation" as const,
            id: c.id,
            title: c.title,
          }))
        );
      }
      if (currentConversation?.activeReferencedFolders) {
        ctx.push(
          ...currentConversation.activeReferencedFolders.map((f) => ({
            type: "folder" as const,
            id: f.id,
            title: f.name,
          }))
        );
      }
      return ctx;
    } else {
      // For new conversations, use local state
      return localContext;
    }
  }, [currentConversationId, currentConversation, localContext]);

  // Reset local context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
    }
  }, [currentConversationId]);

  const handleContextChange = async (newContext: typeof localContext) => {
    if (currentConversationId) {
      // Directly update persistent context
      const conversations = newContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));
      const folders = newContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      // Optimistic update could be done here if we had a way to mutate currentConversation locally
      // For now, we rely on the backend update + revalidation which is fast enough
      await setConversationContext(
        currentConversationId,
        conversations,
        folders
      );
    } else {
      // Update local state for new conversation
      setLocalContext(newContext);
    }
  };

  const handleSubmit = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);

    try {
      // Always pass the active context to sendMessage so it's recorded on the message
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

      const { streamReader, conversationId } = result;

      // Fetch real messages immediately from server
      // Server has already saved both user and assistant placeholder messages
      try {
        const realMessages = await getMessages(conversationId);
        setMessages(realMessages);
        
        // Find the assistant message ID for streaming
        const assistantMsg = realMessages.find(m => m.role === 'assistant' && !m.content);
        if (assistantMsg) {
          setStreamingMessageId(assistantMsg.id);
        }
        setStreamingContent("");
        
      } catch (err) {
        console.error("Failed to load messages:", err);
        return;
      }

      // Read the stream
      const decoder = new TextDecoder();
      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      } catch (err) {
        console.error("Error reading stream:", err);
      } finally {
        // Stream finished - fetch final messages to get completed assistant response
        setStreamingMessageId(null);
        setStreamingContent("");
        
        try {
          const finalMessages = await getMessages(conversationId);
          setMessages(finalMessages);
        } catch (err) {
          console.error("Failed to load messages after stream:", err);
          // Fallback: update the streaming message with final content
          setMessages((prev) => 
            prev.map((m) => {
              if (m.role === 'assistant' && !m.content) {
                return { ...m, content: fullContent };
              }
              return m;
            })
          );
        }
      }

    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // ... (rest of the component)

  const [editContext, setEditContext] = useState<
    { type: "conversation" | "folder"; id: string; title: string }[]
  >([]);

  // ... (handleSubmit remains same)

  const handleStartEdit = (message: ChatMessage) => {
    if (isLoading) return;
    setEditingMessageId(message.id);
    setEditContent(message.content);

    // Populate editContext from message references
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
    setEditContext(initialContext);

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
  };

  const handleCancelEdit = () => {
    if (isEditing) return;
    setEditingMessageId(null);
    setEditContent("");
    setEditContext([]);
  };

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

      // OPTIMISTIC UPDATE: Update the message locally for instant feedback
      setMessages(prev => prev.map(m => 
        m.id === editingMessageId 
          ? { 
              ...m, 
              content: editContent, 
              referencedConversations, 
              referencedFolders 
            }
          : m
      ));
      
      // Clear edit UI immediately for better UX
      setEditingMessageId(null);
      setEditContent("");
      setEditContext([]);

      // Save the edit to server (creates a new message version)
      const result = await editMessage(
        editingMessageId,
        editContent,
        undefined,
        referencedConversations,
        referencedFolders
      );
      
      // Fetch updated messages once to get the new conversation state
      const updatedMessages = await getMessages(currentConversationId!);
      setMessages(updatedMessages);
      
      // Check if we need to generate an AI response
      // If the edited message created a new path ending with a user message, generate AI response
      const lastMsg = updatedMessages[updatedMessages.length - 1];
      
      if (lastMsg && lastMsg.role === "user") {
        // Generate AI response using the chat API
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: currentConversationId,
              message: lastMsg.content,
              attachments: lastMsg.attachments || [],
              referencedConversations: lastMsg.referencedConversations || [],
              referencedFolders: lastMsg.referencedFolders || [],
            }),
          });
          
          if (response.ok && response.body) {
            // The server creates the assistant message, so we need to fetch to get it
            const messagesWithAssistant = await getMessages(currentConversationId!);
            setMessages(messagesWithAssistant);
            
            // Find the new assistant message for streaming tracking
            const assistantMsg = messagesWithAssistant.find(
              m => m.role === 'assistant' && !m.content
            );
            if (assistantMsg) {
              setStreamingMessageId(assistantMsg.id);
            }
            setStreamingContent("");
            
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
                setStreamingContent(fullContent);
              }
            } finally {
              // Clear streaming state
              setStreamingMessageId(null);
              setStreamingContent("");
              
              // SINGLE final fetch to sync with server
              // This ensures we have the complete, saved assistant response
              const finalMessages = await getMessages(currentConversationId!);
              setMessages(finalMessages);
            }
          }
        } catch (aiError) {
          console.error("Failed to generate AI response:", aiError);
          setStreamingMessageId(null);
          setStreamingContent("");
        }
      }
      
    } catch (error) {
      console.error("Failed to save edit:", error);
      // Revert optimistic update on error by fetching from server
      try {
        const revertedMessages = await getMessages(currentConversationId!);
        setMessages(revertedMessages);
      } catch (fetchError) {
        console.error("Failed to revert after error:", fetchError);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (isLoading) return;
    setIsDeleting(messageId);
    try {
      await deleteMessage(messageId);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBranchFromMessage = async (messageId: string) => {
    if (isLoading) return;

    if (confirm("Create a new conversation from this point?")) {
      try {
        await branchConversation(messageId);
      } catch (err) {
        console.error("Failed to branch conversation:", err);
      }
    }
  };

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

  // Load messages from conversation path
  useEffect(() => {
    const loadMessages = async () => {
      // Skip if we're in the middle of an edit to prevent race conditions
      if (isEditing) return;
      
      if (!currentConversation) {
        setMessages([]);
        setMessageVersions(new Map());
        return;
      }

      console.log("🔍 Loading messages from path:", currentConversation.id);
      console.log("🔍 Path:", currentConversation.path);

      try {
        const loadedMessages = await getMessages(currentConversation.id);
        console.log("✅ Loaded", loadedMessages.length, "messages");
        setMessages(loadedMessages);

        // Load versions for each message
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
    };

    loadMessages();
  }, [currentConversation?.id, isEditing, getMessages, getMessageVersions]); // Only depend on ID, not entire object

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-14 md:h-16 w-full shrink-0 items-center gap-3 border-b px-3 md:px-4">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 shrink-0"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex flex-col w-full group min-w-0">
          <div className="text-foreground font-medium flex items-center gap-2 min-w-0 w-full">
            {currentConversationId ? (
              <div className="flex items-center gap-2 w-full min-w-0">
                <InlineTitleEdit
                  title={currentConversation?.title || "Untitled"}
                  onSave={async (newTitle) => {
                    await renameConversation(currentConversationId, newTitle);
                    setIsRenaming(false);
                  }}
                  isEditing={isRenaming}
                  onEditChange={setIsRenaming}
                  className="text-base md:text-lg font-semibold text-foreground bg-transparent"
                />
                {!isRenaming && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => setIsRenaming(true)}
                    title="Rename conversation"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </header>

      {/* Rename Dialog removed */}

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
                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const isLastMessage = index === messages.length - 1;

                  return (
                    <Message
                      key={message.id}
                      className={cn(
                        "mx-auto flex w-full max-w-4xl flex-col gap-2 px-0",
                        isAssistant ? "items-start" : "items-end"
                      )}
                    >
                      {isAssistant ? (
                        // Assistant Message
                        isLastMessage &&
                        isSending &&
                        (!message.content ||
                          message.content.trim().length < 3) ? (
                          <AssistantSkeleton />
                        ) : (
                          <div className="group flex w-full flex-col gap-0">
                            <Markdown className="prose prose-slate dark:prose-invert max-w-none">
                              {streamingMessageId === message.id
                                ? streamingContent
                                : message.content}
                            </Markdown>
                            <MessageActions
                              className={cn(
                                "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                isLastMessage && "opacity-100"
                              )}
                            >
                              <MessageAction tooltip="Copy" delayDuration={100}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      message.content
                                    )
                                  }
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </MessageAction>
                              <MessageAction
                                tooltip="Branch from here"
                                delayDuration={100}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    handleBranchFromMessage(message.id)
                                  }
                                >
                                  <GitBranch className="h-4 w-4" />
                                </Button>
                              </MessageAction>
                            </MessageActions>
                          </div>
                        )
                      ) : (
                        // User Message
                        <div className="group flex flex-col items-end gap-1">
                          {/* Context Badges */}
                          {(message.referencedConversations?.length ?? 0) > 0 ||
                          (message.referencedFolders?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1.5 justify-end mb-1 max-w-[85%] sm:max-w-[75%]">
                              {message.referencedFolders?.map((f) => (
                                <div
                                  key={`f-${f.id}`}
                                  className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] border border-blue-500/20"
                                >
                                  <FolderIcon size={10} />
                                  <span className="font-medium truncate max-w-[100px]">
                                    {f.name}
                                  </span>
                                </div>
                              ))}
                              {message.referencedConversations?.map((c) => (
                                <div
                                  key={`c-${c.id}`}
                                  className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] border border-primary/20"
                                >
                                  <MessageSquare size={10} />
                                  <span className="font-medium truncate max-w-[100px]">
                                    {c.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex flex-col items-end w-full">
                            {/* Edit Mode */}
                            {editingMessageId === message.id ? (
                              <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full flex justify-end">
                                <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] w-full">
                                  <div className="relative group">
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => {
                                        setEditContent(e.target.value);
                                        const textarea = e.target;
                                        textarea.style.height = "auto";
                                        textarea.style.height =
                                          Math.min(textarea.scrollHeight, 300) +
                                          "px";
                                      }}
                                      onKeyDown={handleKeyDown}
                                      placeholder="Edit your message..."
                                      className="w-full min-h-[48px] max-h-[300px] rounded-3xl px-5 py-3 bg-muted text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all duration-200 leading-relaxed placeholder:text-muted-foreground/50"
                                      autoFocus
                                    />
                                  </div>

                                  {/* Edit Context Picker */}
                                  <div className="flex flex-col gap-2">
                                    {editContext.length > 0 && (
                                      <div className="flex flex-wrap gap-2 px-1 justify-end">
                                        {editContext.map((c, i) => (
                                          <div
                                            key={i}
                                            className="group flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 pl-2.5 pr-1.5 py-1.5 rounded-full text-xs border border-primary/10 transition-all duration-200"
                                          >
                                            {c.type === "folder" ? (
                                              <FolderIcon className="h-3 w-3 text-blue-500" />
                                            ) : (
                                              <MessageSquare className="h-3 w-3 text-primary" />
                                            )}
                                            <span className="font-medium text-foreground/80 max-w-[120px] truncate">
                                              {c.title}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-4 w-4 ml-0.5 rounded-full hover:bg-background/50 hover:text-destructive opacity-50 group-hover:opacity-100 transition-all"
                                              onClick={() =>
                                                setEditContext((prev) =>
                                                  prev.filter(
                                                    (_, idx) => idx !== i
                                                  )
                                                )
                                              }
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 justify-end">
                                      <ContextPicker
                                        selectedItems={editContext}
                                        onSelectionChange={setEditContext}
                                        conversations={conversations}
                                        folders={folders}
                                        currentConversationId={
                                          currentConversationId
                                        }
                                        trigger={
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                          >
                                            <Plus className="h-3 w-3" />
                                            Add Context
                                          </Button>
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="flex gap-2 justify-end items-center">
                                    <div className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5 opacity-70">
                                      <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs shadow-sm">
                                        Cmd
                                      </kbd>
                                      <span className="text-[11px]">
                                        Enter save
                                      </span>
                                      <span className="text-muted-foreground/40">
                                        {" "}
                                        •{" "}
                                      </span>
                                      <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs shadow-sm">
                                        Esc
                                      </kbd>
                                      <span className="text-[11px]">
                                        cancel
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      disabled={isLoading}
                                      className="h-8 px-3"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={
                                        !editContent.trim() || isLoading
                                      }
                                      className="h-8 px-4"
                                    >
                                      {isLoading ? (
                                        <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <MessageContent className="bg-muted text-foreground rounded-2xl md:rounded-3xl px-4 md:px-5 py-2.5 md:py-3 prose prose-slate dark:prose-invert shadow-sm hover:shadow-md transition-shadow duration-200">
                                {message.content}
                              </MessageContent>
                            )}
                          </div>

                          {/* File Attachments */}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 justify-end max-w-[85%] sm:max-w-[75%] mt-1">
                                {message.attachments.map((file, i) => (
                                  <div key={i} className="relative group/file">
                                    {file.type.startsWith("image/") ? (
                                      <div className="relative rounded-lg overflow-hidden border border-border/50 shadow-sm">
                                        <img
                                          src={
                                            file instanceof File
                                              ? URL.createObjectURL(file)
                                              : file.url
                                          }
                                          alt={file.name}
                                          className="h-20 w-auto object-cover transition-transform hover:scale-105"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 bg-muted/50 border border-border/50 px-3 py-2 rounded-lg text-xs text-muted-foreground">
                                        <Paperclip className="h-3 w-3" />
                                        <span className="max-w-[100px] truncate">
                                          {file.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Version Indicator */}
                          {editingMessageId !== message.id &&
                            (() => {
                              const rootId = message.versionOf || message.id;
                              const versions =
                                messageVersions.get(rootId) || [];
                              return versions.length > 1 ? (
                                <div className="flex justify-end mt-1">
                                  <VersionIndicator
                                    message={message}
                                    versions={versions}
                                    onSwitchVersion={switchToMessageVersion}
                                    isLoading={isLoading}
                                  />
                                </div>
                              ) : null;
                            })()}

                          {/* User Message Actions */}
                          {editingMessageId !== message.id && (
                            <MessageActions
                              className={cn(
                                "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                isLastMessage && "opacity-100"
                              )}
                            >
                              <MessageAction tooltip="Edit">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() => handleStartEdit(message)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </MessageAction>
                              <MessageAction tooltip="Copy">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      message.content
                                    )
                                  }
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </MessageAction>
                              <MessageAction tooltip="Delete">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full text-destructive hover:text-destructive"
                                  onClick={() =>
                                    confirm(
                                      "Are you sure you want to delete this message?"
                                    ) && handleDeleteMessage(message.id)
                                  }
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </MessageAction>
                            </MessageActions>
                          )}
                        </div>
                      )}
                    </Message>
                  );
                })}
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
