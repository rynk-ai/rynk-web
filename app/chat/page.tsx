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
import { useChatContext } from "@/lib/hooks/chat-context";
import { ChatProvider } from "@/lib/hooks/chat-context";
import type {
  Message as ChatMessage,
  Conversation,
} from "@/lib/services/indexeddb";
import { TagDialog } from "@/components/tag-dialog";
import {
  Copy,
  Pencil,
  Pin,
  PinIcon,
  Plus,
  PlusIcon,
  Search,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash,
  Check,
  X,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { FilePreviewList } from "@/components/file-preview";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { dbService } from "@/lib/services/indexeddb";
import { VersionIndicator } from "@/components/ui/version-indicator";

function groupConversationsByTime(conversations: Conversation[]) {
  const now = Date.now();
  const groups: Record<string, Conversation[]> = {
    today: [],
    yesterday: [],
    last7Days: [],
    lastMonth: [],
  };

  conversations.forEach((conv) => {
    const updatedAt = conv.updatedAt || conv.createdAt;
    const diff = now - updatedAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      groups.today.push(conv);
    } else if (days === 1) {
      groups.yesterday.push(conv);
    } else if (days <= 7) {
      groups.last7Days.push(conv);
    } else {
      groups.lastMonth.push(conv);
    }
  });

  const result: { period: string; conversations: Conversation[] }[] = [];
  if (groups.today.length > 0) {
    result.push({ period: "Today", conversations: groups.today });
  }
  if (groups.yesterday.length > 0) {
    result.push({ period: "Yesterday", conversations: groups.yesterday });
  }
  if (groups.last7Days.length > 0) {
    result.push({ period: "Last 7 days", conversations: groups.last7Days });
  }
  if (groups.lastMonth.length > 0) {
    result.push({ period: "Last month", conversations: groups.lastMonth });
  }

  return result;
}

function ChatSidebar() {
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
  } = useChatContext();

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  };

  const handleTagClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setTagDialogOpen(true);
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!selectedConversationId) return;
    await updateConversationTags(selectedConversationId, tags);
    await loadTags();
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId);
    }
  };

  const handlePin = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinConversation(conversationId);
  };

  const groupedConversations = groupConversationsByTime(conversations);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <Button
            variant="outline"
            className=" flex w-full items-center gap-2"
            onClick={createConversation}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
          <Button variant="ghost" className="size-8">
            <Search className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto pt-4">
        <div className="px-4"></div>

        {/* Tag Filter */}
        <div className="px-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Tags
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (currentConversationId) {
                  handleTagClick(currentConversationId);
                }
              }}
              disabled={!currentConversationId}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 10).map((tag) => {
              const count = conversations.filter((c) =>
                c.tags?.includes(tag),
              ).length;
              return (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const filtered = conversations.filter((c) =>
                      c.tags?.includes(tag),
                    );
                    if (filtered.length > 0) {
                      selectConversation(filtered[0].id);
                    }
                  }}
                >
                  {tag} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {groupedConversations.length === 0 ? (
          <div className="px-4 text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.period} className="my-2 px-2">
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                {group.period}
              </div>
              <div className="space-y-2 px-2 ">
                {group.conversations.map((conversation) => (
                  <div key={conversation.id} className="group relative">
                    <button
                      className={cn(
                        "flex w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-20",
                        currentConversationId === conversation.id && "bg-muted",
                      )}
                      onClick={() => selectConversation(conversation.id)}
                    >
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{conversation.title}</span>
                        </div>
                        {conversation.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {conversation.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagClick(conversation.id);
                                }}
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handlePin(conversation.id, e)}
                      >
                        {conversation.isPinned ? (
                          <PinIcon className="h-4 w-4 text-primary" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(conversation.id);
                        }}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleDelete(conversation.id, e)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
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
    </div>
  );
}

function ChatContent() {
  const {
    sendMessage,
    currentConversation,
    currentConversationId,
    editMessage,
    deleteMessage,
    switchToMessageVersion,
    getMessageVersions,
    isLoading: contextIsLoading,
  } = useChatContext();
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Loaded from path
  const [messageVersions, setMessageVersions] = useState<Map<string, ChatMessage[]>>(new Map());

  const isLoading = isSending || isEditing || !!isDeleting || contextIsLoading;

  const handleSubmit = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);

    try {
      await sendMessage(text, files);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartEdit = (message: ChatMessage) => {
    if (isLoading) return;
    setEditingMessageId(message.id);
    setEditContent(message.content);
    // Focus and select all text after state update
    setTimeout(() => {
      const textarea = document.querySelector(
        "textarea[autofocus]",
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
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || isEditing || !editContent.trim()) return;
    setIsEditing(true);
    try {
      await editMessage(editingMessageId, editContent);
      setEditingMessageId(null);
      setEditContent("");
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
      if (!currentConversation) {
        setMessages([]);
        setMessageVersions(new Map());
        return;
      }

      console.log("🔍 Loading messages from path:", currentConversation.id);
      console.log("🔍 Path:", currentConversation.path);

      try {
        const loadedMessages = await dbService.getConversationMessages(
          currentConversation.id,
        );
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
  }, [currentConversation]);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <div className="flex flex-col">
          <div className="text-foreground font-medium">
            {currentConversation?.title || "SimpleChat"}
          </div>
        </div>
      </header>

      <div className="flex h-screen flex-col overflow-hidden">
        <ChatContainerRoot className="relative flex-1 space-y-0 overflow-y-auto px-4">
          <ChatContainerContent className="space-y-12 px-4 ">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastMessage = index === messages.length - 1;

              return (
                <Message
                  key={message.id}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6",
                    isAssistant ? "items-start" : "items-end",
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      <Markdown className="prose prose-slate dark:prose-invert max-w-none">
                        {message.content}
                      </Markdown>
                      <MessageActions
                        className={cn(
                          "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                          isLastMessage && "opacity-100",
                        )}
                      >
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() =>
                              navigator.clipboard.writeText(message.content)
                            }
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Upvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsUp />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Downvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsDown />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <div className="relative w-full">
                        {/* Edit mode overlay - slides in */}
                        {editingMessageId === message.id && (
                          <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                            {/* Edit mode - styled like the original message but editable */}
                            <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] w-full">
                              <div className="relative group">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => {
                                    setEditContent(e.target.value);
                                    // Auto-resize textarea
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
                                  style={{ height: "auto" }}
                                />
                              </div>
                              <div className="flex gap-2 justify-end items-center">
                                <div className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5 opacity-70">
                                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs shadow-sm">
                                    ⌘
                                  </kbd>
                                  <span className="text-[11px]">Enter</span>
                                  <span className="text-muted-foreground/40">
                                    save
                                  </span>
                                  <span className="text-muted-foreground/30">
                                    •
                                  </span>
                                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs shadow-sm">
                                    Esc
                                  </kbd>
                                  <span className="text-[11px]">cancel</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={isLoading}
                                    className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim() || isLoading}
                                    className="h-8 px-4 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
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
                          </div>
                        )}

                        {/* View mode - slides out when editing */}
                        {editingMessageId !== message.id && (
                          <div
                            className={cn(
                              "animate-in fade-in-0 duration-200",
                              editingMessageId ? "fade-out-0" : "",
                            )}
                          >
                            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%] prose prose-slate dark:prose-invert">
                              {message.content}
                            </MessageContent>
                          </div>
                        )}
                      </div>

                      {/* File attachments - only show in view mode */}
                      {editingMessageId !== message.id &&
                        message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mt-2">
                            <FilePreviewList
                              files={message.attachments}
                              showRemove={false}
                            />
                          </div>
                        )}

                      {/* Only show actions when NOT editing */}
                      {editingMessageId !== message.id && (
                        <MessageActions
                          className={cn(
                            "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                          )}
                        >
                          {/* Version indicator - show for messages with versions */}
                          {(() => {
                            const rootId = message.versionOf || message.id;
                            const versions = messageVersions.get(rootId) || [];
                            return (
                              <VersionIndicator
                                message={message}
                                versions={versions}
                                onSwitchVersion={switchToMessageVersion}
                                isLoading={isLoading}
                              />
                            );
                          })()}

                          <MessageAction tooltip="Edit" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleStartEdit(message)}
                            >
                              <Pencil />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Delete" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={async () => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this message?",
                                  )
                                ) {
                                  await deleteMessage(message.id);
                                }
                              }}
                            >
                              <Trash />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() =>
                                navigator.clipboard.writeText(message.content)
                              }
                            >
                              <Copy />
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
        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
          <PromptInputWithFiles
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder="Ask anything"
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 shadow-xs"
          />
        </div>
      </div>
    </main>
  );
}

function FullChatApp() {
  return (
    <ChatProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatContent />
        </div>
      </div>
    </ChatProvider>
  );
}

export default function ChatPage() {
  return <FullChatApp />;
}
