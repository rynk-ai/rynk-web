"use client";


import {useState, useEffect, useCallback} from "react";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/lib/hooks/chat-context";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { ConversationList } from "@/components/conversation-list";
import { ProjectList } from "@/components/project-list";
import { FolderDialog } from "@/components/folder-dialog";
import { DeleteConversationDialog } from "@/components/delete-conversation-dialog";
import { TagDialog } from "@/components/tag-dialog";
import { SearchDialog } from "@/components/search-dialog";
import { AddToFolderDialog } from "@/components/add-to-folder-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import type {
  CloudConversation as Conversation,
  Folder,
} from "@/lib/services/cloud-db";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        {/* User Profile Section */}  
        <UserProfileDropdown />
      </SidebarHeader>

      <SidebarContent className="">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex gap-1.5">
            <Button
              variant="default"
              className="flex-1 items-center justify-start pl-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={() => {
                handleSelectConversation(null);
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
            <div className="mb-2">
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
              <div className="flex items-center gap-2 py-1">
                <FolderIcon className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-lg tracking-tight">
                  {projects.find((p) => p.id === activeProjectId)?.name ||
                    "Project"}
                </h2>
              </div>
            </div>
          )}

          {/* Pinned Conversations */}
          {conversations.some((c) => c.isPinned) && (
            <div className="mb-4">
              <div className="px-3 mb-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
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
                    <div key={conversation.id} className="relative group/item">
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
                        className="absolute right-9 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100 transition-opacity"
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
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100 transition-opacity"
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
                <div className="mb-1 flex items-center justify-between px-2 group/folder">
                  <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-sm font-semibold text-foreground pl-2 hover:opacity-80">
                    <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    <FolderIcon className="h-4 w-4 text-muted-foreground/70" />
                    <span>{folder.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({folderConversations.length})
                    </span>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 transition-opacity">
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
                  <div className="space-y-1 pl-4">
                    {folderConversations.map((conversation) => (
                      <div key={conversation.id} className="group/convo relative">
                        <button
                          className={cn(
                            "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-8"
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/convo:opacity-100 transition-opacity"
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
