"use client";

import { MessageList } from "@/components/chat/message-list";
import {
  VirtualizedMessageList,
  type VirtualizedMessageListRef,
} from "@/components/chat/virtualized-message-list";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import type { SubChat } from "@/lib/services/cloud-db";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ui/message";
import { Button } from "@/components/ui/button";
import { GuestChatProvider, useGuestChatContext, useGuestStreamingContext, type GuestMessage } from "@/lib/hooks/guest-chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useStreaming } from "@/lib/hooks/use-streaming";
import { GuestSidebar } from "@/components/guest/guest-sidebar";
import { GuestBanner } from "@/components/guest-banner";
import { GuestUpgradeModal } from "@/components/guest-upgrade-modal";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { ContextPicker } from "@/components/context-picker";
import { TagDialog } from "@/components/tag-dialog";
import {
  Folder as FolderIcon,
  MessageSquare,
  X,
  Loader2,
  Plus,
  Tag,
  ChevronDown,
} from "lucide-react";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { toast } from "sonner";

// Helper function to filter messages to show only active versions
function filterActiveVersions(messages: any[]): any[] {
  const activeMessages: any[] = [];
  const versionGroups = new Map<string, any[]>();

  messages.forEach((msg) => {
    const _rootId = msg.versionOf || msg.id;
    if (!versionGroups.has(_rootId)) {
      versionGroups.set(_rootId, []);
    }
    versionGroups.get(_rootId)!.push(msg);
  });

  versionGroups.forEach((versions) => {
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest;
    });
    activeMessages.push(activeVersion);
  });

  return activeMessages.sort((a, b) => a.timestamp - b.timestamp);
}

// Context Badges component
type ContextItem = {
  type: "conversation" | "folder";
  id: string;
  title: string;
  status?: "loading" | "loaded";
};

const ContextBadges = memo(function ContextBadges({
  context,
  onRemove,
  onClearAll,
}: {
  context: ContextItem[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
}) {
  if (context.length === 0) return null;

  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5 transition-all duration-300 justify-start">
      {context.map((c, i) => {
        const isLoading = c.status === "loading";
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary/70 px-3 py-1.5 rounded-full text-xs transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : c.type === "folder" ? (
              <FolderIcon className="h-3 w-3 text-blue-500" />
            ) : (
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground max-w-[100px] truncate">
              {c.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-0.5 rounded-full hover:bg-background/60 hover:text-destructive opacity-60 hover:opacity-100 transition-all"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(i);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClearAll();
        }}
      >
        Clear all
      </Button>
    </div>
  );
});

interface GuestChatContentProps {
  onMenuClick?: () => void;
}

const GuestChatContent = memo(function GuestChatContent({ onMenuClick }: GuestChatContentProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id") || undefined;

  const {
    sendMessage,
    sendChatRequest,
    createConversation,
    currentConversation,
    currentConversationId,
    selectConversation,
    isLoading: contextIsLoading,
    getMessages,
    conversations,
    folders,
    updateConversationTags,
    getAllTags,
    statusPills,
    searchResults,
    streamingMessageId: globalStreamingMessageId,
    loadingConversations,
    creditsRemaining,
    showUpgradeModal,
    setShowUpgradeModal,
  } = useGuestChatContext();

  // Use custom hooks for separated state management
  const messageState = useMessageState();
  const streamingState = useStreaming();

  // Keyboard awareness for mobile
  const keyboardHeight = useKeyboardAwarePosition();

  const {
    messages,
    setMessages,
    messageVersions,
    setMessageVersions,
    addMessages,
    replaceMessage,
    removeMessage,
  } = messageState;

  const {
    streamingMessageId,
    streamingContent,
    startStreaming,
    updateStreamContent,
    finishStreaming,
  } = streamingState;

  // Local state
  const [isSending, setIsSending] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [quotedMessage, setQuotedMessage] = useState<{
    messageId: string;
    quotedText: string;
    authorRole: "user" | "assistant";
  } | null>(null);

  // Sub-chat state
  const [subChats, setSubChats] = useState<SubChat[]>([]);
  const [activeSubChat, setActiveSubChat] = useState<SubChat | null>(null);
  const [subChatSheetOpen, setSubChatSheetOpen] = useState(false);
  const [subChatLoading, setSubChatLoading] = useState(false);
  const [subChatStreamingContent, setSubChatStreamingContent] = useState("");
  const [subChatSearchResults, setSubChatSearchResults] = useState<any>(null);

  // Set of message IDs that have sub-chats
  const messageIdsWithSubChats = useMemo(() => {
    return new Set(subChats.map(sc => sc.sourceMessageId));
  }, [subChats]);

  // Context state
  const [localContext, setLocalContext] = useState<ContextItem[]>([]);
  const activeContext = localContext;

  // Refs
  const virtuosoRef = useRef<VirtualizedMessageListRef>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const currentTags = (currentConversation?.tags as string[]) || [];

  // Load tags
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

  // Handle URL-based conversation selection
  useEffect(() => {
    if (chatId && chatId !== currentConversationId) {
      selectConversation(chatId);
    } else if (!chatId && currentConversationId) {
      selectConversation(null);
    }
  }, [chatId, currentConversationId, selectConversation]);

  // Reset state for new chat
  useEffect(() => {
    if (!currentConversationId && !chatId) {
      setMessages([]);
      setMessageVersions(new Map());
      setQuotedMessage(null);
      setLocalContext([]);
    }
  }, [currentConversationId, chatId]);

  // Reset context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
      setQuotedMessage(null);
    }
  }, [currentConversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      (async () => {
        try {
          const result = await getMessages(currentConversationId);
          if (result.messages) {
            const loadedMessages = result.messages as any[];
            const filteredMessages = filterActiveVersions(loadedMessages);
            
            // ✅ PRESERVE OPTIMISTIC MESSAGES & FIX RACE CONDITION
            setMessages((prev) => {
              // 1. Merge DB messages with local state to prevent overwriting fresh content with stale DB data
              const mergedMessages = filteredMessages.map((serverMsg) => {
                const localMsg = prev.find((m) => m.id === serverMsg.id);
                // If local message has content and server message is empty (and is assistant), keep local content
                // This handles the race condition where server hasn't finished writing to DB yet
                if (
                  localMsg &&
                  localMsg.role === "assistant" &&
                  localMsg.content &&
                  !serverMsg.content
                ) {
                  return { ...serverMsg, content: localMsg.content };
                }
                return serverMsg;
              });

              // 2. Find optimistic messages (not in server response)
              const serverIds = new Set(filteredMessages.map(m => m.id));
              const optimistic = prev.filter((m) => !serverIds.has(m.id));

              // 3. Deduplicate: Don't add optimistic messages if they likely exist in the loaded messages
              const uniqueOptimistic = optimistic.filter((opt) => {
                const isDuplicate = mergedMessages.some((serverMsg) => {
                  // Match by role
                  if (serverMsg.role !== opt.role) return false;
                  // For user messages, content must match (trimmed)
                  if (
                    opt.role === "user" &&
                    serverMsg.content?.trim() !== opt.content?.trim()
                  )
                    return false;
                  // Timestamp check (relaxed to 60 seconds to handle clock skew)
                  return Math.abs((serverMsg.timestamp || 0) - (opt.timestamp || 0)) < 60000;
                });
                return !isDuplicate;
              });

              // 4. Combine and sort by timestamp
              const combined = [...mergedMessages, ...uniqueOptimistic];
              return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            });
          }
        } catch (err) {
          console.error("Failed to load messages:", err);
        }
      })();
    }
  }, [currentConversationId, getMessages, setMessages]);

  const handleContextChange = useCallback((newContext: ContextItem[]) => {
    setLocalContext(newContext);
  }, []);

  const handleQuote = useCallback(
    (text: string, messageId: string, role: "user" | "assistant") => {
      setQuotedMessage({ messageId, quotedText: text, authorRole: role });
      setTimeout(() => {
        const input = document.getElementById("main-chat-input");
        if (input) input.focus();
      }, 100);
    },
    []
  );

  const handleClearQuote = useCallback(() => {
    setQuotedMessage(null);
  }, []);

  const handleTagClick = () => setTagDialogOpen(true);

  const handleSaveTags = async (tags: string[]) => {
    if (!currentConversationId) return;
    await updateConversationTags(currentConversationId, tags);
    await loadTags();
  };

  // Sub-chat handlers
  const loadSubChats = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/guest/sub-chats?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json() as { subChats?: any[] };
        setSubChats(data.subChats || []);
      }
    } catch (err) {
      console.error("Failed to load sub-chats:", err);
    }
  }, []);

  const handleOpenSubChat = useCallback(
    async (text: string, messageId: string, _role: "user" | "assistant", fullMessageContent: string) => {
      if (!currentConversationId) return;

      try {
        // Check if there's an existing sub-chat for this exact text and message
        const existing = subChats.find(
          sc => sc.sourceMessageId === messageId && sc.quotedText === text
        );

        if (existing) {
          setActiveSubChat(existing);
          setSubChatSheetOpen(true);
          return;
        }

        // Create new sub-chat
        const response = await fetch("/api/guest/sub-chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: currentConversationId,
            sourceMessageId: messageId,
            quotedText: text,
            fullMessageContent: fullMessageContent,
          }),
        });

        if (response.ok) {
          const data = await response.json() as { subChat?: any };
          const newSubChat = data.subChat;
          setSubChats(prev => [newSubChat, ...prev]);
          setActiveSubChat(newSubChat);
          setSubChatSheetOpen(true);
        }
      } catch (err) {
        console.error("Failed to create sub-chat:", err);
        toast.error("Failed to create sub-chat");
      }
    },
    [currentConversationId, subChats]
  );

  const handleViewSubChats = useCallback(
    (messageId: string) => {
      const messageSubChats = subChats.filter(sc => sc.sourceMessageId === messageId);
      if (messageSubChats.length > 0) {
        setActiveSubChat(messageSubChats[0]);
        setSubChatSheetOpen(true);
      }
    },
    [subChats]
  );

  const handleOpenExistingSubChat = useCallback(
    (subChat: SubChat) => {
      setActiveSubChat(subChat);
      setSubChatSheetOpen(true);
    },
    []
  );

  const handleDeleteSubChat = useCallback(
    async (subChatId: string) => {
      try {
        const response = await fetch(`/api/guest/sub-chats/${subChatId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setSubChats(prev => prev.filter(sc => sc.id !== subChatId));
          if (activeSubChat?.id === subChatId) {
            setSubChatSheetOpen(false);
            setActiveSubChat(null);
          }
        }
      } catch (err) {
        console.error("Failed to delete sub-chat:", err);
        toast.error("Failed to delete sub-chat");
      }
    },
    [activeSubChat]
  );

  const handleSubChatMessage = useCallback(
    async (content: string) => {
      if (!activeSubChat) return;

      setSubChatLoading(true);
      setSubChatStreamingContent("");
      setSubChatSearchResults(null);

      try {
        // Add user message optimistically
        const userMessage = {
          id: `msg_${Date.now()}`,
          role: "user" as const,
          content,
          createdAt: Date.now(),
        };

        setActiveSubChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, userMessage],
        } : null);

        // Send to API (simplified for guests - no streaming for sub-chats)
        const response = await fetch(`/api/guest/sub-chats/${activeSubChat.id}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          const data = await response.json() as { subChat?: any };
          if (data.subChat) {
            setActiveSubChat(data.subChat);
            setSubChats(prev => prev.map(sc => sc.id === data.subChat.id ? data.subChat : sc));
          }
        }
      } catch (err) {
        console.error("Failed to send sub-chat message:", err);
        toast.error("Failed to send message");
      } finally {
        setSubChatLoading(false);
        setSubChatStreamingContent("");
      }
    },
    [activeSubChat]
  );

  // Load sub-chats when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadSubChats(currentConversationId);
    } else {
      setSubChats([]);
    }
  }, [currentConversationId, loadSubChats]);

  // Message submission
  const handleSubmit = useCallback(
    async (text: string, files: File[]) => {
      if (!text.trim()) return;
      
      // Files not supported for guest
      if (files.length > 0) {
        toast.info("File uploads require signing in");
      }

      // Check credits
      if (creditsRemaining !== null && creditsRemaining <= 0) {
        setShowUpgradeModal(true);
        return;
      }

      setIsSending(true);

      const tempUserMessageId = crypto.randomUUID();
      const tempAssistantMessageId = crypto.randomUUID();
      const timestamp = Date.now();

      const referencedConversationsList = activeContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFoldersList = activeContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      // Optimistic UI
      const optimisticUserMessage = {
        id: tempUserMessageId,
        conversationId: currentConversationId || crypto.randomUUID(),
        role: "user" as const,
        content: text,
        attachments: [],
        timestamp,
        versionNumber: 1,
        referencedConversations: referencedConversationsList,
        referencedFolders: referencedFoldersList,
      };

      const optimisticAssistantMessage = {
        id: tempAssistantMessageId,
        conversationId: currentConversationId || crypto.randomUUID(),
        role: "assistant" as const,
        content: "",
        attachments: [],
        timestamp: timestamp + 1,
        versionNumber: 1,
      };

      addMessages([optimisticUserMessage as any, optimisticAssistantMessage as any]);
      startStreaming(tempAssistantMessageId);
      setLocalContext([]);
      setQuotedMessage(null);

      try {
        const result = await sendChatRequest(
          text,
          [],
          referencedConversationsList,
          referencedFoldersList,
          currentConversationId || undefined,
          tempUserMessageId,
          tempAssistantMessageId
        );

        if (!result) {
          throw new Error("Failed to send message");
        }

        const { streamReader, conversationId } = result;

        // Update URL if new conversation
        if (!currentConversationId && conversationId) {
          router.replace(`/guest-chat?id=${conversationId}`, { scroll: false });
        }

        // Stream response
        let fullContent = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateStreamContent(fullContent);
          
          replaceMessage(tempAssistantMessageId, {
            id: tempAssistantMessageId,
            conversationId,
            role: "assistant",
            content: fullContent,
            attachments: [],
            timestamp: timestamp + 1,
            versionNumber: 1,
          } as any);
        }

        finishStreaming();

      } catch (err: any) {
        console.error("Failed to send message:", err);
        
        if (err.message?.includes("credit")) {
          setShowUpgradeModal(true);
        } else {
          toast.error("Failed to send message");
        }
        
        // Remove optimistic messages on error
        removeMessage(tempUserMessageId);
        removeMessage(tempAssistantMessageId);
        finishStreaming();
      } finally {
        setIsSending(false);
      }
    },
    [
      currentConversationId,
      activeContext,
      sendChatRequest,
      startStreaming,
      updateStreamContent,
      finishStreaming,
      replaceMessage,
      removeMessage,
      router,
      creditsRemaining,
      setShowUpgradeModal,
    ]
  );

  const isLoading = isSending || contextIsLoading;

  // Filtered messages for display
  const filteredMessages = useMemo(() => {
    return filterActiveVersions(messages);
  }, [messages]);

  return (
    <main className="flex h-full flex-col overflow-hidden relative overscroll-none">
      {/* Guest Upgrade Modal */}
      <GuestUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        guestConversationData={{
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          messageCount: messages.length,
        }}
      />

      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Top Section: Messages & Title */}
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* Title for New Chat - Fades out when conversation starts */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out pointer-events-none",
              !currentConversationId
                ? "opacity-100 translate-y-0 pb-24"
                : "opacity-0 -translate-y-10 pb-24",
            )}
          >
            <TextShimmer
              spread={5}
              duration={4}
              className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground/80 mb-10 leading-tight animate-in-up"
            >
              rynk.
            </TextShimmer>
          </div>

          {/* Messages Container - Fades in/Visible when conversation active */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-in-out",
              currentConversationId ? "opacity-100 z-10" : "opacity-0 -z-10",
            )}
          >
            <div className="relative h-full flex flex-col px-2 md:px-3 lg:px-4">
              {/* Messages List - Virtuoso handles its own scrolling */}
              <div className="flex-1 relative">
                <VirtualizedMessageList
                  ref={virtuosoRef}
                  messages={filteredMessages}
                  isSending={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false)}
                  streamingMessageId={globalStreamingMessageId || streamingMessageId}
                  streamingContent={streamingContent}
                  editingMessageId={null}
                  onStartEdit={() => toast.info("Message editing requires signing in")}
                  onDeleteMessage={() => toast.info("Message deletion requires signing in")}
                  onBranchFromMessage={() => toast.info("Branching requires signing in")}
                  onQuote={handleQuote}
                  onOpenSubChat={handleOpenSubChat}
                  messageIdsWithSubChats={messageIdsWithSubChats}
                  subChats={subChats}
                  onViewSubChats={handleViewSubChats}
                  onOpenExistingSubChat={handleOpenExistingSubChat}
                  onDeleteSubChat={handleDeleteSubChat}
                  messageVersions={messageVersions}
                  onSwitchVersion={async () => { toast.info("Message versions require signing in") }}
                  statusPills={statusPills}
                  searchResults={searchResults}
                  onIsAtBottomChange={setIsScrolledUp}
                />
              </div>

              {/* Tag Dialog */}
              {tagDialogOpen && currentConversationId && (
                <TagDialog
                  conversationId={currentConversationId}
                  currentTags={currentTags}
                  allTags={allTags}
                  onSave={handleSaveTags}
                  onClose={() => setTagDialogOpen(false)}
                />
              )}

              {/* Scroll to Bottom Button */}
              {!isScrolledUp && messages.length > 0 ? (
                <Button
                  variant="outline"
                  className="absolute bottom-[150px] left-1/2 -translate-x-1/2 z-30 rounded-full shadow-lg bg-background/60 backdrop-blur-sm hover:bg-background/80 border-border/50 hover:border-border transition-all duration-300 px-4 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-8 fade-in"
                  onClick={() => virtuosoRef.current?.scrollToBottom()}
                  title="Scroll to bottom"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Scroll to Bottom</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="absolute bottom-[150px] left-1/2 -translate-x-1/2 z-30 rounded-full shadow-lg bg-background/60 backdrop-blur-sm border-border/50 transition-all duration-300 px-4 py-2 flex items-center gap-2 animate-out slide-out-to-bottom-8 fade-out pointer-events-none"
                  style={{ opacity: 0 }}
                  onClick={() => {}}
                  title=""
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Scroll to Bottom</span>
                </Button>
              )}
            </div>
            <div className="absolute w-full h-32 bg-gradient-to-t from-background/75 to-transparent bottom-0 z-[15]"></div>
          </div>
        </div>

        {/* Input Section - Always rendered, absolute positioned at bottom */}
        <div
          ref={inputContainerRef}
          className={cn(
            "absolute left-0 right-0 w-full transition-all duration-500 ease-in-out z-20",
            !currentConversationId ? "bottom-1/3" : "bottom-0 mb-4",
          )}
          style={{
            transform: `translateY(-${
              currentConversationId
                ? keyboardHeight
                : Math.max(
                    0,
                    keyboardHeight -
                      (typeof window !== "undefined"
                        ? window.innerHeight * 0.33
                        : 200),
                  )
            }px)`,
          }}
        >
          {/* Background for input section */}
          <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto px-4 pb-safe-bottom pt-4">
            <ContextBadges
              context={activeContext}
              onRemove={(index) => handleContextChange(activeContext.filter((_, idx) => idx !== index))}
              onClearAll={() => handleContextChange([])}
            />

            <PromptInputWithFiles
              onSubmit={handleSubmit}
              isLoading={currentConversationId ? loadingConversations.has(currentConversationId) : false}
              placeholder="Ask anything..."
              disabled={currentConversationId ? loadingConversations.has(currentConversationId) : false}
              context={activeContext}
              onContextChange={handleContextChange}
              currentConversationId={currentConversationId}
              conversations={conversations as any}
              folders={folders as any}
              quotedMessage={quotedMessage}
              onClearQuote={handleClearQuote}
              className="pb-4"
              // Hide only file upload button for guests (context picker still available)
              hideFileUpload={true}
            />
          </div>
        </div>
      </div>

      {/* Sub-Chat Sheet */}
      <SubChatSheet
        open={subChatSheetOpen}
        onOpenChange={setSubChatSheetOpen}
        subChat={activeSubChat}
        onSendMessage={handleSubChatMessage}
        isLoading={subChatLoading}
        streamingContent={subChatStreamingContent}
        searchResults={subChatSearchResults}
      />
    </main>
  );
});

// Header component
const GuestChatHeader = memo(function GuestChatHeader() {
  const { selectConversation, creditsRemaining } = useGuestChatContext();
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    router.push("/guest-chat");
    selectConversation(null);
  }, [router, selectConversation]);

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md border border-border/40 shadow-sm rounded-full p-1">
        <SidebarTrigger className="h-8 w-8 rounded-full hover:bg-muted/80" />
        <Separator orientation="vertical" className="h-4" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/80"
          onClick={handleNewChat}
          title="Start new chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {/* Credit indicator */}
      {creditsRemaining !== null && (
        <div className="bg-background/60 backdrop-blur-md border border-border/40 rounded-full px-3 py-1 text-xs text-muted-foreground">
          {creditsRemaining} messages left
        </div>
      )}
    </div>
  );
});

// Main wrapper with providers
function GuestChatWithProvider() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id") || null;
  const [guestReady, setGuestReady] = useState(false);

  // Initialize guest session before rendering
  useEffect(() => {
    const initGuest = async () => {
      // Check if guest ID already exists
      const existingGuestId = getCookie("guest_id") || localStorage.getItem("guest_id");
      
      if (existingGuestId?.startsWith("guest_")) {
        setGuestReady(true);
        return;
      }

      // Generate new guest ID
      const newGuestId = `guest_${crypto.randomUUID()}`;

      // Store in localStorage
      localStorage.setItem("guest_id", newGuestId);

      // Set cookie (expires in 30 days)
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `guest_id=${newGuestId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      setGuestReady(true);
    };

    initGuest();
  }, []);

  // Show loading state until guest ID is ready
  if (!guestReady) {
    return (
      <SidebarProvider>
        <div className="flex h-full flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <TextShimmer
                spread={5}
                duration={4}
                className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground/80 mb-10"
              >
                rynk.
              </TextShimmer>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <GuestChatProvider initialConversationId={chatId}>
      <SidebarProvider>
        <GuestSidebar />
        <SidebarInset>
          <GuestChatHeader />
          <GuestChatContent />
        </SidebarInset>
      </SidebarProvider>
    </GuestChatProvider>
  );
}

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export default function GuestChatPage() {
  return (
    <Suspense
      fallback={
        <SidebarProvider>
          <div className="flex h-full flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto w-full relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <TextShimmer
                  spread={5}
                  duration={4}
                  className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground/80 mb-10"
                >
                  rynk.
                </TextShimmer>
              </div>
            </div>
          </div>
        </SidebarProvider>
      }
    >
      <GuestChatWithProvider />
    </Suspense>
  );
}
