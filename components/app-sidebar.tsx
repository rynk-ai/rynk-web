"use client";


import {useState, useEffect, useCallback} from "react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Plus,
  Search,
  FolderPlus,
  PinIcon,
  MoreHorizontal,
  Folder as FolderIcon,
  ChevronRight,
  Users,
  GitBranch,
  ChevronLeft,
  Pencil,
  Trash,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/lib/hooks/chat-context";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { ConversationList } from "@/components/conversation-list";
import { ProjectList } from "@/components/project-list";
import { ConversationListItem } from "@/components/sidebar/conversation-list-item";
import { FolderListItem } from "@/components/sidebar/folder-list-item";
import { FolderDialog } from "@/components/folder-dialog";
import { DeleteConversationDialog } from "@/components/delete-conversation-dialog";
import { TagDialog } from "@/components/tag-dialog";
import { SearchDialog } from "@/components/search-dialog";
import { AddToFolderDialog } from "@/components/add-to-folder-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CloudConversation as Conversation,
  Folder,
} from "@/lib/services/cloud-db";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  
  // Extract projectId from URL if on /project/[id] route
  const activeProjectId = pathname?.startsWith('/project/') 
    ? pathname.split('/')[2] 
    : null;

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
    loadMoreConversations,
    hasMoreConversations,
    isLoadingMoreConversations,
    selectProject,
  } = useChatContext();

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

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
    const initProjects = async () => {
      setIsLoadingProjects(true);
      await loadProjects();
      setIsLoadingProjects(false);
    };
    initProjects();
  }, [loadProjects]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingConversations(true);
      setIsLoadingFolders(true);
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
      setIsLoadingConversations(false);
      setIsLoadingFolders(false);
    };
    fetchData();
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
  const handleSelectConversation = (id: string | null, conversation?: Conversation) => {
    selectConversation(id, conversation);
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        {/* User Profile Section */}  
        <UserProfileDropdown />
      </SidebarHeader>

      <SidebarContent className="">
        <div className="flex flex-col gap-2 p-2">
          <div className="flex gap-1">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2 px-3 shadow-none border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground transition-all"
              onClick={() => {
                // Just clear the conversation selection
                // The conversation will be created when user sends first message
                handleSelectConversation(null);
              }}
            >
              <Plus className="size-4 text-muted-foreground" />
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
                  <FolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchDialogOpen(true)}
                >
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {!activeProjectId ? (
            <div className="mb-2">
              {isLoadingProjects ? (
                <div className="px-4 py-2 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" />
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          ) : (
            <div className="px-4 mb-4">
              <Button
                variant="ghost"
                className="w-full justify-start px-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/chat';
                  }
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to all chats
              </Button>
              <div className="flex items-center gap-2 py-1">
                <FolderIcon className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-lg tracking-tight">
                  {projects.find((p) => p.id === activeProjectId)?.name ||
                    "Project"}
                </h2>
              </div>
            </div>
          )}




          {/* Folders Section - Show grouped conversations */}
          <div className="px-3 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-muted-foreground tracking-tight">Folders</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="sr-only">What are folders?</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <p>
                      Folders help you organize your chats by grouping related conversations together.
                      You can reference these organized chats in your conversation input to maintain context across your chats.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCreateFolder}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">New Folder</span>
              </Button>
            </div>
          </div>

          {isLoadingFolders ? (
            <div className="px-5 space-y-3 mb-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <div className="pl-6 space-y-1.5">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div className="text-xs text-center text-muted-foreground py-4 px-4">
              No folders yet.
              <br />
              Create one to organize your chats!
            </div>
          ) : (

            folders.map((folder) => (
              <FolderListItem
                key={folder.id}
                folder={folder}
                conversations={conversations}
                currentConversationId={currentConversationId}
                activeProjectId={activeProjectId || null}
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
              <div className="px-3 mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                Pinned
              </div>
              <div className="space-y-0.5 px-2">
                {conversations
                  .filter(
                    (c) =>
                      c.isPinned &&
                      (!activeProjectId || c.projectId === activeProjectId)
                  )
                  .map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={currentConversationId === conversation.id}
                      onSelect={handleSelectConversation}
                      onTogglePin={togglePinConversation}
                      showMenu={false}
                    />
                  ))}
              </div>
            </div>
          )}



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
            isLoading={isLoadingConversations}
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
      </SidebarContent>

      {/* Dialogs */}
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
    </Sidebar>
  );
}
