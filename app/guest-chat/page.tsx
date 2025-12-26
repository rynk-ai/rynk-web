"use client";

import {
  VirtualizedMessageList,
  type VirtualizedMessageListRef,
} from "@/components/chat/virtualized-message-list";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import type { SurfaceType } from "@/lib/services/domain-types";
import { Button } from "@/components/ui/button";
import {
  GuestChatProvider,
  useGuestChatContext,
  useGuestStreamingContext,
} from "@/lib/hooks/guest-chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useStreaming } from "@/lib/hooks/use-streaming";
import { useLatest } from "@/lib/hooks/use-latest";
import { useGuestSubChats } from "@/lib/hooks/use-guest-sub-chats";
import { GuestSidebar } from "@/components/guest/guest-sidebar";
import { GuestUpgradeModal } from "@/components/guest-upgrade-modal";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  Suspense,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { TagDialog } from "@/components/tag-dialog";
import { PiPlus } from "react-icons/pi";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { toast } from "sonner";

// Extracted shared components
import { filterActiveVersionsGeneric } from "@/lib/utils/filter-active-versions";
import { TagSection } from "@/components/chat/tag-section";
import { ScrollToBottomButton } from "@/components/chat/scroll-to-bottom-button";

// Context Item type
type ContextItem = {
  type: "conversation" | "folder";
  id: string;
  title: string;
  status?: "loading" | "loaded";
};

// Helper to use generic filter with guest messages
const filterActiveVersions = (messages: any[]) => filterActiveVersionsGeneric(messages);

interface GuestChatContentProps {
  onMenuClick?: () => void;
}

const GuestChatContent = memo(function GuestChatContent({
  onMenuClick,
}: GuestChatContentProps = {}) {
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
    streamingMessageId: globalStreamingMessageId,
    loadingConversations,
    creditsRemaining,
    showUpgradeModal,
    setShowUpgradeModal,
  } = useGuestChatContext();

  // Get streaming-specific values from separate context to avoid re-renders
  const { statusPills, searchResults } = useGuestStreamingContext();

  // Use custom hooks for separated state management
  const messageState = useMessageState();
  const streamingState = useStreaming();

  // Keyboard awareness for mobile
  const keyboardHeight = useKeyboardAwarePosition();

  // Destructure for convenience
  const {
    messages,
    setMessages,
    messageVersions,
    setMessageVersions,
    addMessages,
    replaceMessage,
    removeMessage,
    updateMessage,
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

  // Surface mode state (for guest, only wiki/quiz are allowed)
  const [surfaceMode, setSurfaceMode] = useState<'chat' | SurfaceType>('chat');

  // Pagination state
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);

  // Quote state
  const [quotedMessage, setQuotedMessage] = useState<{
    messageId: string;
    quotedText: string;
    authorRole: "user" | "assistant";
  } | null>(null);

  // Context state
  const [localContext, setLocalContext] = useState<ContextItem[]>([]);
  const activeContext = localContext;

  // Refs
  const virtuosoRef = useRef<VirtualizedMessageListRef>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Track conversation ID for detecting navigation
  const lastChatIdRef = useRef(chatId);
  const lastConversationIdRef = useRef(currentConversationId);

  // Stable refs to avoid stale closures
  const sendChatRequestRef = useLatest(sendChatRequest);
  const messageStateRef = useLatest(messageState);
  const startStreamingRef = useLatest(startStreaming);
  const updateStreamContentRef = useLatest(updateStreamContent);
  const finishStreamingRef = useLatest(finishStreaming);
  const replaceMessageRef = useLatest(replaceMessage);
  const removeMessageRef = useLatest(removeMessage);
  const statusPillsRef = useLatest(statusPills);
  const searchResultsRef = useLatest(searchResults);

  // Sub-chat hook
  const {
    subChats,
    activeSubChat,
    subChatSheetOpen,
    setSubChatSheetOpen,
    subChatLoading,
    subChatStreamingContent,
    subChatSearchResults,
    messageIdsWithSubChats,
    handleOpenSubChat,
    handleViewSubChats,
    handleOpenExistingSubChat,
    handleDeleteSubChat,
    handleSubChatSendMessage: handleSubChatMessage,
  } = useGuestSubChats(currentConversationId);

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

  const handleTagClick = () => {
    setTagDialogOpen(true);
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!currentConversationId) return;
    await updateConversationTags(currentConversationId, tags);
    await loadTags();
  };

  const currentTags = currentConversation?.tags || [];

  // Handle URL-based conversation selection
  useEffect(() => {
    const prevChatId = lastChatIdRef.current;
    lastChatIdRef.current = chatId;

    if (chatId !== prevChatId && chatId !== currentConversationId) {
      console.log("[GuestChat] Auto-selecting conversation from URL:", chatId);
      selectConversation(chatId || null);
    } else if (!chatId && currentConversationId && prevChatId) {
      console.log("[GuestChat] Clearing conversation (new chat)");
      selectConversation(null);
    }
  }, [chatId, currentConversationId, selectConversation]);

  // Reset state for new chat
  useEffect(() => {
    // CRITICAL: Don't clear messages if we're currently sending!
    // This prevents wiping out optimistic messages during new conversation creation
    if (isSending) {
      console.log("[GuestChat] Skipping message clear - currently sending");
      return;
    }
    
    if (!currentConversationId) {
      if (!chatId) {
        console.log("[GuestChat] New chat - clearing state");
        setMessages([]);
        setMessageVersions(new Map());
        setQuotedMessage(null);
        setLocalContext([]);
      }
    }
  }, [currentConversationId, chatId, isSending]);

  // Reset context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
      setQuotedMessage(null);
    }
  }, [currentConversationId]);

  // Reload messages function with race condition handling
  const reloadMessages = useCallback(
    async (conversationId?: string) => {
      const targetConversationId = conversationId || currentConversationId;

      if (!targetConversationId) {
        setMessages([]);
        setMessageVersions(new Map());
        setHasMoreMessages(true);
        setMessageCursor(null);
        return;
      }

      try {
        const { messages: loadedMessages, nextCursor } =
          await getMessages(targetConversationId);
        
        const filteredMessages = filterActiveVersions(loadedMessages);

        setMessageCursor(nextCursor);
        setHasMoreMessages(!!nextCursor);

        // Preserve optimistic messages & fix race condition
        setMessages((prev) => {
          const mergedMessages = filteredMessages.map((serverMsg) => {
            const localMsg = prev.find((m) => m.id === serverMsg.id);
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

          const serverIds = new Set(mergedMessages.map((m) => m.id));
          const optimistic = prev.filter((m) => !serverIds.has(m.id));

          const uniqueOptimistic = optimistic.filter((opt) => {
            if (opt.conversationId !== targetConversationId) {
              return false;
            }

            const isDuplicate = mergedMessages.some((serverMsg) => {
              if (serverMsg.role !== opt.role) return false;

              if (opt.role === "user") {
                return serverMsg.content?.trim() === opt.content?.trim();
              }

              if (opt.role === "assistant") {
                if (serverMsg.content === opt.content) return true;
                if (serverMsg.content && !opt.content) return true;
              }

              return Math.abs((serverMsg.timestamp || 0) - (opt.timestamp || 0)) < 60000;
            });

            return !isDuplicate;
          });

          let maxServerTs = mergedMessages.reduce(
            (max, m) => Math.max(max, m.timestamp || 0),
            0
          );

          const adjustedOptimistic = uniqueOptimistic.map((opt) => {
            if ((opt.timestamp || 0) <= maxServerTs) {
              maxServerTs += 1;
              return { ...opt, timestamp: maxServerTs };
            }
            return opt;
          });

          return [...mergedMessages, ...adjustedOptimistic];
        });

        setMessageVersions(new Map());
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
        setMessageVersions(new Map());
      }
    },
    [currentConversationId, getMessages, setMessages, setMessageVersions]
  );

  // Load messages when conversation changes
  const currentConversationIdRef = useRef(currentConversationId);
  // Track previously loaded conversation to prevent double-loading
  const prevLoadedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const conversationId = currentConversationId;
    if (!conversationId) return;

    // CRITICAL FIX: Update the ref BEFORE the early returns!
    // This prevents reloadMessages from being called after streaming completes.
    const previouslyLoaded = prevLoadedConversationIdRef.current;
    prevLoadedConversationIdRef.current = conversationId;
    currentConversationIdRef.current = conversationId;

    if (isSending) {
      console.log("[GuestChat] Skipping reloadMessages - currently sending");
      return;
    }

    // Only reload if conversation ID ACTUALLY changed
    if (conversationId === previouslyLoaded) {
      return;
    }

    if (messages.length > 0 && messages[0].conversationId !== conversationId) {
      console.log("[GuestChat] Switching conversation, clearing state...");
      setMessages([]);
      setMessageVersions(new Map());
    }

    console.log("[GuestChat] Loading messages for conversation:", conversationId);
    reloadMessages(conversationId);
  }, [currentConversationId, isSending]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!currentConversationId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const { messages: olderMessages, nextCursor } = await getMessages(
        currentConversationId,
        50,
        messageCursor || undefined
      );

      if (olderMessages.length > 0) {
        const filteredOlder = filterActiveVersions(olderMessages);
        setMessages((prev) => [...filteredOlder, ...prev]);
        setMessageCursor(nextCursor);
        setHasMoreMessages(!!nextCursor);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentConversationId, isLoadingMore, hasMoreMessages, messageCursor, getMessages, setMessages]);

  const handleContextChange = useCallback((newContext: ContextItem[]) => {
    setLocalContext(newContext);
  }, []);

  // Quote handlers
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

  // Handle empty state suggestion selection
  const handleSelectSuggestion = useCallback((prompt: string) => {
    const input = document.getElementById("main-chat-input") as HTMLTextAreaElement;
    if (input) {
      input.value = prompt;
      input.focus();
      // Trigger a change event to update React state
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    }
  }, []);

  // Message submission handler
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
        referencedConversations: referencedConversationsList,
        referencedFolders: referencedFoldersList,
        timestamp,
        versionNumber: 1,
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

      messageStateRef.current.addMessages([
        optimisticUserMessage as any,
        optimisticAssistantMessage as any,
      ]);
      startStreamingRef.current(tempAssistantMessageId);
      setLocalContext([]);
      setQuotedMessage(null);

      try {
        const result = await sendChatRequestRef.current(
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

        const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

        // SCENARIO 1: New conversation created
        if (!currentConversationId && conversationId) {
          // If surface mode is selected (not chat), navigate to surface page
          if (surfaceMode !== 'chat') {
            console.log(
              `🎯 [GuestChat] Surface mode "${surfaceMode}" selected for new conversation, navigating to surface`
            );
            const query = encodeURIComponent(text.slice(0, 500));
            router.push(`/guest-surface/${surfaceMode}/${conversationId}?q=${query}`);
            setSurfaceMode('chat');
            // Clean up optimistic messages
            removeMessageRef.current(tempUserMessageId);
            removeMessageRef.current(tempAssistantMessageId);
            finishStreamingRef.current();
            setIsSending(false);
            return; // Exit early, surface page will handle generation
          } else {
            // Normal chat - navigate to new conversation
            router.replace(`/guest-chat?id=${conversationId}`, { scroll: false });
          }
        }

        // SCENARIO 2: Existing conversation with surface mode selected
        if (surfaceMode !== 'chat' && currentConversationId) {
          console.log(
            `🎯 [GuestChat] Surface mode "${surfaceMode}" selected mid-conversation, navigating to surface`
          );
          const targetConversationId = conversationId || currentConversationId;
          const query = encodeURIComponent(text.slice(0, 500));
          router.push(`/guest-surface/${surfaceMode}/${targetConversationId}?q=${query}`);
          setSurfaceMode('chat');
          // Remove optimistic messages since surface page will handle its own UI
          removeMessageRef.current(tempUserMessageId);
          removeMessageRef.current(tempAssistantMessageId);
          finishStreamingRef.current();
          setIsSending(false);
          return; // Exit early, surface page will handle generation
        }

        // Replace optimistic message IDs with real ones
        if (userMessageId && userMessageId !== tempUserMessageId) {
          replaceMessageRef.current(tempUserMessageId, {
            ...optimisticUserMessage,
            id: userMessageId,
            conversationId,
          } as any);
        }

        if (assistantMessageId && assistantMessageId !== tempAssistantMessageId) {
          replaceMessageRef.current(tempAssistantMessageId, {
            ...optimisticAssistantMessage,
            id: assistantMessageId,
            conversationId,
          } as any);
          startStreamingRef.current(assistantMessageId);
        }

        // Stream response
        const decoder = new TextDecoder();
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await streamReader.read();
            if (done) {
              console.log("[GuestChat] Stream complete, length:", fullContent.length);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            updateStreamContentRef.current(fullContent);
          }
        } catch (err) {
          console.error("[GuestChat] Error reading stream:", err);
        } finally {
          // Update message with final content and reasoning metadata
          const finalAssistantId = assistantMessageId || tempAssistantMessageId;
          messageStateRef.current.updateMessage(finalAssistantId, {
            content: fullContent,
            reasoning_metadata: {
              statusPills: statusPillsRef.current,
              searchResults: searchResultsRef.current,
            },
          });

          // Batch state updates
          requestAnimationFrame(() => {
            finishStreamingRef.current(fullContent);
            setIsSending(false);
          });
        }
      } catch (err: any) {
        console.error("Failed to send message:", err);

        if (err.message?.includes("credit")) {
          setShowUpgradeModal(true);
        } else {
          toast.error("Failed to send message");
        }

        removeMessageRef.current(tempUserMessageId);
        removeMessageRef.current(tempAssistantMessageId);
        finishStreamingRef.current();
        setIsSending(false);
      }
    },
    [
      currentConversationId,
      activeContext,
      creditsRemaining,
      setShowUpgradeModal,
      router,
      surfaceMode,
    ]
  );

  // Handle pending query from URL params (?q=...) or localStorage
  useEffect(() => {
    // Check if we've already processed a query in this session
    const alreadyProcessed = sessionStorage.getItem("pendingQueryProcessed");
    if (alreadyProcessed || isSending) return;

    // First check URL query parameter
    const urlQuery = searchParams.get("q");

    // Then check localStorage
    const localStorageQuery = localStorage.getItem("pendingChatQuery");

    // Use URL param if available, otherwise fall back to localStorage
    const pendingQuery = urlQuery || localStorageQuery;

    if (!pendingQuery || !pendingQuery.trim()) {
      return;
    }

    // Mark as processed
    sessionStorage.setItem("pendingQueryProcessed", "true");

    // Submit after a small delay
    setTimeout(() => {
      handleSubmit(pendingQuery, []);

      // Cleanup
      if (localStorageQuery) localStorage.removeItem("pendingChatQuery");
      if (urlQuery) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("q");
        router.replace(`/guest-chat?${newParams.toString()}`);
      }

      sessionStorage.removeItem("pendingQueryProcessed");
    }, 100);
  }, [searchParams, router, handleSubmit, isSending]);

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
          

          {/* Messages Container */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-in-out",
              (currentConversationId || isSending || messages.length > 0) ? "opacity-100 z-10" : "opacity-0 -z-10"
            )}
          >
            <div className="relative h-full flex flex-col">
              <div className="flex-1 relative">
                {/* Tag Section */}
                {currentConversationId && (
                  <TagSection
                    conversationId={currentConversationId}
                    tags={currentTags}
                    onTagClick={handleTagClick}
                  />
                )}
                <VirtualizedMessageList
                  ref={virtuosoRef}
                  messages={messages}
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
                  onSwitchVersion={async () => {
                    toast.info("Message versions require signing in");
                  }}
                  onLoadMore={loadMoreMessages}
                  isLoadingMore={isLoadingMore}
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
                  onClose={() => {
                    setTagDialogOpen(false);
                  }}
                />
              )}

              {/* Scroll to Bottom Button */}
              <ScrollToBottomButton
                visible={!isScrolledUp && messages.length > 0}
                onClick={() => virtuosoRef.current?.scrollToBottom()}
              />
            </div>
            <div className="absolute w-full h-32 bg-gradient-to-t from-background/75 to-transparent bottom-0 z-[100] pointer-events-none"></div>
          </div>
        </div>

        {/* Input Section */}
        <div
          ref={inputContainerRef}
          className={cn(
            "absolute left-0 right-0 w-full transition-all duration-300 ease-out z-20",
            (!currentConversationId && !isSending && messages.length === 0)
              ? "bottom-1/3 sm:bottom-3/7" 
              : "bottom-0"
          )}
          style={{
            
          }}
        >
          <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto pb-safe-bottom">
            <PromptInputWithFiles
              onSubmit={handleSubmit}
              isLoading={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false)}
              placeholder="Ask anything..."
              disabled={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false)}
              context={activeContext}
              onContextChange={handleContextChange}
              currentConversationId={currentConversationId}
              conversations={conversations as any}
              folders={folders as any}
              quotedMessage={quotedMessage}
              onClearQuote={handleClearQuote}
              hideFileUpload={true}
              isGuest={true}
              surfaceMode={surfaceMode}
              onSurfaceModeChange={(mode) => setSurfaceMode(mode as 'chat' | SurfaceType)}
              className={cn(
                "relative z-10 w-full rounded-3xl border border-border/60 transition-all duration-300 shadow-lg hover:shadow-xl bg-background",
                !currentConversationId ? "shadow-xl" : "shadow-sm hover:shadow-md"
              )}
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
    <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
      <div className="flex items-center gap-1 bg-background border border-border shadow-sm rounded-full p-1 transition-all duration-300 hover:shadow-md">
        <SidebarTrigger className="h-10 w-10 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator orientation="vertical" className="h-5 bg-border/50" />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleNewChat}
          title="Start new chat"
        >
          <PiPlus className="h-5 w-5" />
        </Button>
      </div>
      {/* Credit indicator */}
      {creditsRemaining !== null && (
        <div className="bg-background border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
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

  // Initialize guest session
  useEffect(() => {
    const initGuest = async () => {
      const existingGuestId =
        getCookie("guest_id") || localStorage.getItem("guest_id");

      if (existingGuestId?.startsWith("guest_")) {
        setGuestReady(true);
        return;
      }

      const newGuestId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem("guest_id", newGuestId);

      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `guest_id=${newGuestId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      setGuestReady(true);
    };

    initGuest();
  }, []);

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
