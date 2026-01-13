"use client";

import {
  VirtualizedMessageList,
  type VirtualizedMessageListRef,
} from "@/components/chat/virtualized-message-list";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";

import { Button } from "@/components/ui/button";
import {
  GuestChatProvider,
  useGuestChatContext,
  useGuestStreamingContext,
  type GuestMessage
} from "@/lib/hooks/guest-chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { useGuestChatController } from "@/lib/hooks/use-guest-chat-controller";
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
// import { createStreamProcessor } from "@/lib/utils/stream-parser"; // Removed
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { toast } from "sonner";
import { ONBOARDING_MESSAGES } from "@/lib/services/onboarding-content";

// Extracted shared components
import { filterActiveVersionsGeneric } from "@/lib/utils/filter-active-versions";
import { TagSection } from "@/components/chat/tag-section";
import { ScrollToBottomButton } from "@/components/chat/scroll-to-bottom-button";
import { ChatBackground } from "@/components/chat/chat-background";

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
  const messageState = useMessageState<GuestMessage>();
  const editState = useMessageEdit(); // Needed for controller

  // Use Controller
  const {
      isSending,
      isSavingEdit,
      handleSubmit,
      handleSaveEdit,
      handleDeleteMessage,
      streamingState,
  } = useGuestChatController({
      messageState,
      editState
  });

  const {
      isStreaming,
      streamingMessageId,
      streamingContent,
  } = streamingState;

  // New Unified Stream Handler (managed by controller now)
  const { 
      statusPills: streamStatusPills,
      searchResults: streamSearchResults,
      contextCards: streamContextCards,
  } = useChatStream({
      // We still need this hook instance just to access the state types correctly?
      // Wait, the controller returns the state. 
      // The controller's useChatStream instance is internal.
      // But we need the values to display.
      // The controller exposes simple streamingState.
      // We might need to expose pill/search updates from controller?
      // Actually, controller updates the Context statusPills/searchResults.
      // So we can just use the context values!
      // BUT, for stream-local updates (before persistence), useChatStream updates its own state
      // AND calls callback.
      // In GuestChatController, we passed onStatusUpdate/onSearchResultsUpdate to update CONTEXT.
      // So `statusPills` from context should be live!
      // Let's verify `useGuestChatController`:
      // onStatusUpdate: (pills) => setStatusPills(pills) -> global context
      // So we don't need a local useChatStream here anymore.
  });

  // Since we rely on context updates now, we can use context values directly.
  // HOWEVER, previous implementation had `streamStatusPills` separate from global `statusPills`.
  // GuestChatProvider separates them?
  // GuestStreamingContext has `statusPills` and `searchResults`.
  // The controller updates these via `setStatusPills` from context.
  // so `statusPills` from `useGuestStreamingContext` IS the source of truth now.
  const activeStatusPills = statusPills;
  const activeSearchResults = searchResults;

  // Keyboard awareness for mobile
  const keyboardHeight = useKeyboardAwarePosition();

  // Destructure for convenience
  const {
    messages,
    setMessages,
    messageVersions,
    setMessageVersions,
  } = messageState;

  // Local state
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);



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

  // Context state (Guest chat doesn't fully support manual context yet inside controller, keeping local for display)
  // Actually guest input hides file upload and context mainly.
  const [localContext, setLocalContext] = useState<ContextItem[]>([]);
  const activeContext = localContext;

  // Refs
  const virtuosoRef = useRef<VirtualizedMessageListRef>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Track conversation ID for detecting navigation
  const lastChatIdRef = useRef<string | undefined>(undefined);
  const lastConversationIdRef = useRef(currentConversationId);

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

    // On initial load (prevChatId === undefined), always sync if needed
    const isInitialLoad = prevChatId === undefined;
    const urlChanged = chatId !== prevChatId;

    if (isInitialLoad || urlChanged) {
      if (chatId !== currentConversationId) {
        console.log("[GuestChat] URL sync:", { from: prevChatId, to: chatId, isInitialLoad });
        selectConversation(chatId || null);
      }
    } else if (!chatId && currentConversationId && prevChatId) {
      console.log("[GuestChat] Clearing conversation (new chat)");
      selectConversation(null);
    }
  }, [chatId, currentConversationId, selectConversation]);

  // Reset state for new chat
  useEffect(() => {
    if (isSending) return;
    
    if (!currentConversationId) {
      if (!chatId) {
        // Show onboarding messages as default state for guest
        const now = Date.now();
        const onboardingMessages = ONBOARDING_MESSAGES.map((msg, index) => ({
          id: `onboarding-${index}`,
          conversationId: 'preview',
          role: msg.role,
          content: msg.content,
          timestamp: now + (index * 100),
          versionNumber: 1,
          createdAt: new Date(now + (index * 100)).toISOString()
        })) as any; // Cast to avoid strict type checks for missing optional fields that aren't needed for display

        setMessages(onboardingMessages);
        setMessageVersions(new Map());
        setQuotedMessage(null);
        setLocalContext([]);
      }
    }
  }, [currentConversationId, chatId, isSending, setMessages, setMessageVersions]);

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

  // Handle pending query from URL params (?q=...) or localStorage
  useEffect(() => {
    const alreadyProcessed = sessionStorage.getItem("pendingQueryProcessed");
    if (alreadyProcessed || isSending) return;

    const urlQuery = searchParams.get("q");
    const localStorageQuery = localStorage.getItem("pendingChatQuery");
    const pendingQuery = urlQuery || localStorageQuery;

    if (!pendingQuery || !pendingQuery.trim()) return;

    sessionStorage.setItem("pendingQueryProcessed", "true");

    setTimeout(() => {
      // Use controller submit
      handleSubmit(pendingQuery);

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

      {/* Chat Background */}
      <ChatBackground />

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
                  messages={messages as any} // Cast for compatibility with CloudMessage prop type
                  isSending={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false)}
                  streamingMessageId={streamingMessageId}
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
                  messageVersions={messageVersions as any}
                  onSwitchVersion={async () => {
                    toast.info("Message versions require signing in");
                  }}
                  onLoadMore={loadMoreMessages}
                  isLoadingMore={isLoadingMore}
                  statusPills={activeStatusPills}
                  searchResults={activeSearchResults}
                  onIsAtBottomChange={setIsScrolledUp}
                  isOnboarding={!currentConversationId && messages.length > 0}
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
              onSubmit={(text, files) => handleSubmit(text)}
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
