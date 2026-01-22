"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import {
  VirtualizedMessageList,
  type VirtualizedMessageListRef,
} from "@/components/chat/virtualized-message-list";
import { useIndexingQueue } from "@/lib/hooks/use-indexing-queue";
// Actions removed - moved to useChatController
import { Button } from "@/components/ui/button";
import { useChatContext, useStreamingContext } from "@/lib/hooks/chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
// import { useStreaming } from "@/lib/hooks/use-streaming"; // DEPRECATED
import { useSubChats } from "@/lib/hooks/use-sub-chats";
import { useChatController } from "@/lib/hooks/use-chat-controller";
// useLatest removed - moved to useChatController
import type { CloudMessage as ChatMessage } from "@/lib/services/cloud-db";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarTrigger,
  useSidebar,
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
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { TagDialog } from "@/components/tag-dialog";
import { PiPlus, PiMagnifyingGlass, PiCaretDown as ChevronDown } from "react-icons/pi";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { toast } from "sonner";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import { CommandBar } from "@/components/ui/command-bar";
import { ShareDialog } from "@/components/share-dialog";
import { NoCreditsOverlay } from "@/components/credit-warning";
import { FocusModeToggle } from "@/components/focus-mode";
import { ONBOARDING_CONVERSATION_TITLE } from "@/lib/services/onboarding-content";
// createStreamProcessor removed - moved to useChatController

// Extracted shared components
import { filterActiveVersions } from "@/lib/utils/filter-active-versions";
import { TagSection } from "@/components/chat/tag-section";
import { ScrollToBottomButton } from "@/components/chat/scroll-to-bottom-button";

import { MessagesLoadingSkeleton } from "@/components/chat/messages-loading-skeleton";
import { ChatInputSection } from "@/components/chat/chat-input-section";
import { ChatBackground } from "@/components/chat/chat-background";

interface ChatContentProps {
  onMenuClick?: () => void;
}


const ChatContent = memo(
  function ChatContent({ onMenuClick }: ChatContentProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    // Read chatId from search params (?id=...) or path params
    const chatId = searchParams.get("id") || undefined;
    const {
      sendMessage,
      uploadAttachments,
      sendChatRequest,
      createConversation,
      currentConversation,
      currentConversationId,
      selectConversation,
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
      updateConversationTags,
      getAllTags,
      // Reasoning mode
      reasoningMode,
      toggleReasoningMode,
      streamingMessageId: globalStreamingMessageId,
      loadingConversations,
      // Credits
      userCredits,
    } = useChatContext();

    // Get streaming-specific values from separate context to avoid re-renders
    const { statusPills, searchResults, contextCards, setStatusPills, setSearchResults, setContextCards } = useStreamingContext();

    // Use custom hooks for separated state management
    const messageState = useMessageState<ChatMessage>();
    const editState = useMessageEdit();
    // const streamingState = useStreaming(); // REMOVED



    // Keyboard awareness for mobile
    const keyboardHeight = useKeyboardAwarePosition();

    // Destructure for convenience
    const {
      messages,
      setMessages,
      messageVersions,
      setMessageVersions,
      replaceMessage,
      removeMessage,
    } = messageState;
    const {
      isEditing,
      setIsEditing,
      editingMessageId,
      editContent,
      setEditContent,
      editAttachments,
      setEditAttachments,
      editContext,
      setEditContext,
      startEdit,
      cancelEdit,
    } = editState;
    // Old streaming state destructuring removed
    // Local messages & context state
    const [localContext, setLocalContext] = useState<
      {
        type: "conversation" | "folder";
        id: string;
        title: string;
        status?: "loading" | "loaded";
      }[]
    >([]);
    
    // Deep Research State
    const [isDeepResearch, setIsDeepResearch] = useState(false);

    // Indexing Queue (Unified) - Moved up for Controller
    const indexingState = useIndexingQueue(); 
    const { jobs } = indexingState;

    // Quote state
    const [quotedMessage, setQuotedMessage] = useState<{
      messageId: string;
      quotedText: string;
      authorRole: "user" | "assistant";
    } | null>(null);

    // ✅ Initialize Chat Controller
    const {
      isSending,
      isSavingEdit,
      isDeleting,
      isCreatingConversationRef,
      handleSubmit,
      handleSaveEdit,
      handleDeleteMessage,
      handleBranchFromMessage,
      streamingState: {
          streamingMessageId,
          streamingContent,
      }
    } = useChatController({
      chatId,

      localContext,
      setLocalContext,
      setQuotedMessage,
      messageState,
      editState,
      // streamingState, // REMOVED
      indexingState, // Pass unified instance
    });

    // Other local state

    const [isScrolledUp, setIsScrolledUp] = useState(false);

    // Pagination state
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false); // Loading new conversation's messages
    const [messageCursor, setMessageCursor] = useState<string | null>(null);
    const [tagDialogOpen, setTagDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [allTags, setAllTags] = useState<string[]>([]);




    // Sub-chat hook - extracted for better separation of concerns
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
      handleSubChatSendMessage,
    } = useSubChats(currentConversationId);


    const loadTags = useCallback(async () => {
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    }, [getAllTags]);

    // Load all tags when component mounts
    useEffect(() => {
      loadTags();
    }, [loadTags]);

    const handleTagClick = () => {
      setTagDialogOpen(true);
    };

    const handleShareClick = () => {
      setShareDialogOpen(true);
    };

    const handleSaveTags = async (tags: string[]) => {
      if (!currentConversationId) return;
      await updateConversationTags(currentConversationId, tags);
      await loadTags();
    };

    const currentTags = currentConversation?.tags || [];

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

    // Track conversation ID for message loading optimization
    // NOTE: URL-to-state sync is handled by ChatContentWithProvider, not here
    const lastConversationIdRef = useRef(currentConversationId);

    // Auto-redirect new users to the onboarding conversation
    useEffect(() => {
      // Only run if:
      // 1. We are on the "New Chat" page (no current ID)
      // 2. We have exactly 1 conversation loaded
      // 3. That conversation is the Onboarding conversation
      // 4. We haven't already redirected them in this session (allows "New Chat")
      const hasRedirected = sessionStorage.getItem("hasRedirectedToOnboarding");
      
      if (!currentConversationId && conversations.length === 1 && !hasRedirected) {
        const onlyConvo = conversations[0];
        if (onlyConvo.title === ONBOARDING_CONVERSATION_TITLE) {
           console.log("🚀 Redirecting new user to Onboarding Conversation:", onlyConvo.id);
           sessionStorage.setItem("hasRedirectedToOnboarding", "true");
           selectConversation(onlyConvo.id);
           router.replace(`/chat?id=${onlyConvo.id}`);
        }
      }
    }, [currentConversationId, conversations, selectConversation, router]);
    


    const isLoading =
      isSending || isSavingEdit || !!isDeleting || contextIsLoading;

    // Clear messages immediately when switching conversations to prevent flash of old content
    // Track the previous conversation ID to detect switches
    const prevConversationIdForClearRef = useRef<string | null>(currentConversationId);
    
    useEffect(() => {
      const prevId = prevConversationIdForClearRef.current;
      prevConversationIdForClearRef.current = currentConversationId;
      
      // Case 1: Switching FROM one conversation TO ANOTHER
      // GUARD: Skip if we're in the middle of creating a new conversation
      if (prevId !== null && currentConversationId !== null && prevId !== currentConversationId) {
        if (isCreatingConversationRef.current) {
          console.log("[ChatPage] Skipping message clear - creating new conversation", 
            { from: prevId, to: currentConversationId });
          return;
        }
        
        // Check if we have prefetched messages in React Query cache
        const cachedData = queryClient.getQueryData<{ messages: ChatMessage[], nextCursor: string | null }>(
          ["messages", currentConversationId]
        );
        
        if (cachedData?.messages && cachedData.messages.length > 0) {
          // Use cached messages immediately instead of clearing!
          console.log("[ChatPage] Using cached messages instead of clearing:", cachedData.messages.length);
          const filtered = filterActiveVersions(cachedData.messages);
          messageState.setMessages(filtered);
          messageState.setMessageVersions(new Map());
          setQuotedMessage(null);
          setLocalContext([]);
        } else {
          // No cache, clear old messages
          console.log("[ChatPage] No cache, clearing old messages", 
            { from: prevId, to: currentConversationId });
          messageState.setMessages([]);
          messageState.setMessageVersions(new Map());
          setQuotedMessage(null);
          setLocalContext([]);
        }
        return;
      }
      
      // Case 2: Going to new chat (currentConversationId becomes null)
      // ONLY clear if we're not currently sending (to protect optimistic messages during creation)
      if (!currentConversationId) {
        if (isSending) {
          console.log("[ChatPage] Skipping message clear - currently sending new conversation");
          return;
        }
        // Clear messages immediately when conversation is null (trust state, not URL)
        let clearedSomething = false;

        if (messages.length > 0) {
          messageState.setMessages([]);
          clearedSomething = true;
        }
        if (messageVersions.size > 0) {
          messageState.setMessageVersions(new Map());
          clearedSomething = true;
        }
        if (quotedMessage) {
          setQuotedMessage(null);
          clearedSomething = true;
        }
        if (localContext.length > 0) {
          setLocalContext([]);
          clearedSomething = true;
        }

        if (clearedSomething) {
          console.log("[ChatPage] New chat - state cleared (ignoring URL)");
        }
        return;
      }
    }, [currentConversationId, chatId, isSending]);

    // Local context state definition moved up for controller initialization
    
    // Derived active context (source of truth) - now just localContext
    const activeContext = localContext;

    // Reset local context when switching conversations
    useEffect(() => {
      if (currentConversationId) {
        setLocalContext([]);
        setQuotedMessage(null); // Clear any pending quote when switching conversations
      }
    }, [currentConversationId]);

    // Indexing Queue logic removed - moved to useChatController

    const handleContextChange = useCallback(
      async (newContext: typeof localContext) => {
        setLocalContext(newContext);
      },
      [],
    );

    // Quote handlers
    const handleQuote = useCallback(
      (text: string, messageId: string, role: "user" | "assistant") => {
        setQuotedMessage({ messageId, quotedText: text, authorRole: role });

        // Focus input after a short delay
        setTimeout(() => {
          const input = document.getElementById("main-chat-input");
          if (input) {
            input.focus();
          }
        }, 100);
      },
      [],
    );

    const handleClearQuote = useCallback(() => {
      setQuotedMessage(null);
    }, []);

    // NOTE: Sub-chat handlers are now provided by useSubChats hook above

    // Indexing Queue for background PDF processing (needed for UI feedback)
    // Moved up to be available for controller

    // Handle pending query from URL params (?q=...) or localStorage
    useEffect(() => {
      // CRITICAL: Don't process if already sending - prevents duplicate submissions
      if (isSending) {
        console.log("[ChatPage] Skipping query processing - already sending");
        return;
      }

      // Check if we've already processed a query in this session (survives Fast Refresh)
      const alreadyProcessed =
        sessionStorage.getItem("pendingQueryProcessed") === "true";
      if (alreadyProcessed) {
        console.log(
          "[ChatPage] Query already processed in this session, skipping",
        );
        return;
      }

      // First check URL query parameter
      const urlQuery = searchParams.get("q");

      // Then check localStorage
      const localStorageQuery = localStorage.getItem("pendingChatQuery");

      // Use URL param if available, otherwise fall back to localStorage
      const pendingQuery = urlQuery || localStorageQuery;

      // 🔥 FIX: Early return if no pending query to avoid clearing conversation on normal navigation
      if (!pendingQuery || !pendingQuery.trim()) {
        return;
      }

      console.log("[ChatPage] Pending query execution found:", {
        urlQuery,
        localStorageQuery,
        pendingQuery,
        currentConversationId,
        alreadyProcessed,
      });

      // If there's a pending query, clear the current conversation to start fresh
      if (currentConversationId) {
        console.log(
          "[ChatPage] Clearing current conversation to process pending query",
        );
        selectConversation(null);
      }

      // Mark as processed in sessionStorage (survives Fast Refresh)
      sessionStorage.setItem("pendingQueryProcessed", "true");

      console.log("[ChatPage] Scheduling auto-submit for:", pendingQuery);

      // Use a shorter delay and no cleanup function to avoid Fast Refresh cancellation
      setTimeout(() => {
        console.log("[ChatPage] Auto-submitting pending query:", pendingQuery);

        // Auto-submit the pending query
        handleSubmit(pendingQuery, []);

        // Clear localStorage AFTER submit
        if (localStorageQuery) {
          console.log("[ChatPage] Clearing localStorage after submit");
          localStorage.removeItem("pendingChatQuery");
          localStorage.removeItem("pendingChatFilesCount");
        }

        // Clear URL param AFTER submit
        if (urlQuery) {
          console.log("[ChatPage] Clearing URL param after submit");
          router.replace("/chat");
        }

        // Clear the session flag after successful submission
        sessionStorage.removeItem("pendingQueryProcessed");
      }, 100);

      // No cleanup function - let the timer complete even during Fast Refresh
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentConversationId, searchParams, router, isSending, handleSubmit]);

    // Ref for the input container to handle scroll locking
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const virtuosoRef = useRef<VirtualizedMessageListRef>(null);

    // Prevent body scroll when touching the input container (except for textarea)
    useEffect(() => {
      const container = inputContainerRef.current;
      if (!container) return;

      const handleTouchMove = (e: TouchEvent) => {
        // Find if the target is a textarea or inside one
        const target = e.target as HTMLElement;
        const isTextarea = target.closest("textarea");

        if (!isTextarea) {
          // If not touching a textarea, prevent default to stop body scroll
          e.preventDefault();
        }
        // If it IS a textarea, let it scroll naturally
        // The textarea itself should have overscroll-behavior: contain
      };

      // Add non-passive listener to be able to call preventDefault
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });

      return () => {
        container.removeEventListener("touchmove", handleTouchMove);
      };
    }, []);

    const handleStartEdit = useCallback(
      (message: ChatMessage) => {
        if (isLoading || isEditing) return;

        // Populate initial context from message references
        const initialContext: {
          type: "conversation" | "folder";
          id: string;
          title: string;
          status?: "loading" | "loaded";
        }[] = [];
        if (message.referencedConversations) {
          initialContext.push(
            ...message.referencedConversations.map((c) => ({
              type: "conversation" as const,
              id: c.id,
              title: c.title,
            })),
          );
        }
        if (message.referencedFolders) {
          initialContext.push(
            ...message.referencedFolders.map((f) => ({
              type: "folder" as const,
              id: f.id,
              title: f.name,
            })),
          );
        }

        startEdit(message, initialContext);

        // Focus and select all text after state update
        setTimeout(() => {
          const textarea = document.getElementById(
            "main-chat-input",
          ) as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            textarea.select();
          }
        }, 0);
      },
      [isLoading, startEdit, isEditing],
    );

    const handleCancelEdit = useCallback(() => {
      cancelEdit();
    }, [cancelEdit]);

    // Handler logic moved to useChatController

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

    // Load more messages (pagination)
    const loadMoreMessages = useCallback(async () => {
      if (!currentConversation || isLoadingMore || !hasMoreMessages) return;

      setIsLoadingMore(true);
      try {
        const { messages: olderMessages, nextCursor } = await getMessages(
          currentConversation.id,
          50,
          messageCursor || undefined,
        );

        if (olderMessages.length > 0) {
          const filteredOlder = filterActiveVersions(olderMessages);

          // Prepend older messages
          setMessages((prev) => [...filteredOlder, ...prev]);

          // Load versions for older messages
          const currentVersionsMap = new Map<string, ChatMessage[]>(
            messageVersions,
          );
          for (const message of olderMessages) {
            const rootId = message.versionOf || message.id;
            if (!currentVersionsMap.has(rootId)) {
              const versions = await getMessageVersions(rootId);
              currentVersionsMap.set(rootId, versions);
            }
          }
          setMessageVersions(currentVersionsMap);

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
    }, [
      // Only depend on conversation ID - getMessages and getMessageVersions are stable
      currentConversation?.id,
      // State variables that affect logic
      isLoadingMore,
      hasMoreMessages,
      messageCursor,
      // State setters are stable
      setMessages,
      setMessageVersions,
      setMessageCursor,
      setHasMoreMessages,
      setIsLoadingMore,
    ]);

    // Track which conversation the current messages in state belong to
    const messagesConversationIdRef = useRef<string | null>(null);

    // Reload messages (can be called from version switching)
    const reloadMessages = useCallback(
      async (conversationId?: string) => {
        // Use provided conversationId or fall back to current conversation
        const targetConversationId = conversationId || currentConversation?.id;

        if (!targetConversationId) {
          setMessages([]);
          setMessageVersions(new Map());
          setHasMoreMessages(true); // Reset pagination state
          setMessageCursor(null); // Reset pagination state
          messagesConversationIdRef.current = null;
          return;
        }

        // CRITICAL: Track if we're loading a DIFFERENT conversation
        // If so, we should NOT merge with prev (which contains old conversation's messages)
        const isLoadingSameConversation = messagesConversationIdRef.current === targetConversationId;
        
        // Update the ref to track which conversation we're loading for
        messagesConversationIdRef.current = targetConversationId;

        // Show loading state when switching to a different conversation
        // BUT only if we don't have cached data from prefetch
        if (!isLoadingSameConversation) {
          // Check React Query cache for prefetched messages
          const cachedData = queryClient.getQueryData<{ messages: ChatMessage[], nextCursor: string | null }>(
            ["messages", targetConversationId]
          );
          
          if (cachedData?.messages && cachedData.messages.length > 0) {
            // We have cached data! Use it immediately without loading state
            console.log("🚀 [reloadMessages] Using cached messages from prefetch:", cachedData.messages.length);
            const filteredCached = filterActiveVersions(cachedData.messages);
            setMessages(filteredCached);
            messagesConversationIdRef.current = targetConversationId;
            // Still fetch fresh data in background, but don't show loading
          } else {
            // No cache, show loading state
            setIsLoadingConversation(true);
          }
        }

        try {
          const { messages: loadedMessages, nextCursor } =
            await queryClient.fetchQuery({
              queryKey: ["messages", targetConversationId],
              queryFn: () => getMessages(targetConversationId),
              staleTime: 1000 * 60 * 2, // 2 minutes - match prefetch configuration
            });
          console.log(
            "✅ Loaded",
            loadedMessages.length,
            "messages for conversation:",
            targetConversationId,
            "| Same conversation?",
            isLoadingSameConversation,
          );
          
          // CRITICAL: Check if the user has switched to ANOTHER conversation while we were fetching
          // If so, discard these results to prevent stale data flash
          if (messagesConversationIdRef.current !== targetConversationId) {
            console.log("⚠️ [reloadMessages] Discarding stale response - user switched conversations");
            return;
          }
          
          // Filter to show only active versions (no duplicates)
          const filteredMessages = filterActiveVersions(loadedMessages);

          // Set pagination state
          setMessageCursor(nextCursor);
          setHasMoreMessages(!!nextCursor);

          if (!isLoadingSameConversation) {
            // CRITICAL: Don't replace if we're in the middle of creating a new conversation
            // The optimistic messages would be lost (DB hasn't synced yet)
            if (isCreatingConversationRef.current) {
              console.log("🔄 [reloadMessages] Skipping replacement - conversation being created");
              setIsLoadingConversation(false);
              return;
            }
            // SWITCHING CONVERSATIONS: Complete replacement, no merging with old messages
            console.log("🔄 [reloadMessages] Switching conversations - replacing all messages");
            setMessages(filteredMessages);
            setIsLoadingConversation(false); // Clear loading state
          } else {
            // RELOADING SAME CONVERSATION: Merge to preserve optimistic updates
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

              // 2. Identify optimistic messages (those present locally but not in server response)
              const serverIds = new Set(mergedMessages.map((m) => m.id));
              const optimistic = prev.filter((m) => !serverIds.has(m.id));

              // Deduplicate: Don't add optimistic messages if they (likely) exist in the loaded messages
              // This prevents "flash of duplicates" if server returns the message before we replace the temp one
              const uniqueOptimistic = optimistic.filter((opt) => {
                // Only keep optimistic messages that belong to the CURRENT conversation
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
                  return Math.abs(serverMsg.createdAt - opt.createdAt) < 60000;
                });

                return !isDuplicate;
              });

              // Ensure optimistic messages are always strictly after the latest server message
              let maxServerTs = mergedMessages.reduce(
                (max, m) => Math.max(max, m.timestamp || 0),
                0,
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
          }

          // Load versions for each message in PARALLEL (instead of sequential await)
          const versionsMap = new Map<string, ChatMessage[]>();
          const rootIds = [
            ...new Set(
              loadedMessages.map((m) => m.versionOf || m.id)
            ),
          ];

          // Fetch all versions in parallel
          const versionResults = await Promise.all(
            rootIds.map(async (rootId) => {
              const versions = await getMessageVersions(rootId);
              return [rootId, versions] as const;
            })
          );

          // Build the map from parallel results
          for (const [rootId, versions] of versionResults) {
            versionsMap.set(rootId, versions);
          }
          setMessageVersions(versionsMap);
        } catch (err) {
          console.error("Failed to load messages:", err);
          setMessages([]);
          setMessageVersions(new Map());
          setIsLoadingConversation(false); // Clear loading state on error
        }
      },
      [
        // Only depend on conversation ID - getMessages and getMessageVersions are stable
        currentConversation?.id,
        // State setters are stable
        setMessages,
        setMessageVersions,
        setMessageCursor,
        setHasMoreMessages,
      ],
    );

    // Wrapper for switchToMessageVersion that refreshes versions map
    const handleSwitchVersion = useCallback(
      async (messageId: string) => {
        if (!currentConversationId) return;

        console.log(
          "🔄 [handleSwitchVersion] Switching to version:",
          messageId,
        );

        // Call the context function to switch version
        await switchToMessageVersion(messageId);

        // Reload messages to reflect the switched version
        await reloadMessages(currentConversationId);

        // Reload versions map for all messages with versions - PARALLEL FETCH
        console.log("🔄 [handleSwitchVersion] Refreshing versions map (parallel)...");
        const { messages: reloadedMessages } = await getMessages(
          currentConversationId,
        );
        
        // Get unique root IDs to avoid duplicate fetches
        const rootIds = [...new Set(
          reloadedMessages.map((m) => m.versionOf || m.id)
        )];
        
        // Fetch all versions in parallel
        const versionResults = await Promise.all(
          rootIds.map(async (rootId) => {
            const versions = await getMessageVersions(rootId);
            return [rootId, versions] as const;
          })
        );
        
        // Build the map from parallel results
        const versionsMap = new Map<string, ChatMessage[]>();
        for (const [rootId, versions] of versionResults) {
          if (versions.length > 1) {
            versionsMap.set(rootId, versions);
          }
        }

        setMessageVersions(versionsMap);
        console.log(
          "✅ [handleSwitchVersion] Versions map refreshed, count:",
          versionsMap.size,
        );
      },
      [
        currentConversationId,
        switchToMessageVersion,
        reloadMessages,
        getMessages,
        getMessageVersions,
      ],
    );

    // Track current conversation ID to avoid stale closures
    const currentConversationIdRef = useRef(currentConversationId);

    // Load messages from conversation path
    useEffect(() => {
      currentConversationIdRef.current = currentConversationId;
    }, [currentConversationId]);

    // Track previous conversation ID to only reload when it ACTUALLY changes
    const prevLoadedConversationIdRef = useRef<string | null>(null);

    useEffect(() => {
      // Use ref to get the latest conversation ID, avoiding stale closures
      const conversationId = currentConversationIdRef.current;
      
      // FIX: Handle null/undefined conversation ID
      if (!conversationId) {
          // Explicitly clear the tracking ref so pending requests for the old ID are discarded
          if (messagesConversationIdRef.current) {
              console.log("[ChatPage] Clearing conversation tracking ref (preventing stale load)");
              messagesConversationIdRef.current = null;
          }
          return;
      }

      // CRITICAL FIX: Update the ref BEFORE the early returns!
      // This prevents reloadMessages from being called after streaming completes.
      // Without this, the ref wouldn't be set during the guarded return,
      // and when isSending becomes false, reloadMessages would be incorrectly called.
      const previouslyLoaded = prevLoadedConversationIdRef.current;
      prevLoadedConversationIdRef.current = conversationId;

      // Skip if we're in the middle of an edit to prevent race conditions
      // Also skip if sending to prevent overwriting stream with partial DB data
      // Note: We intentionally do NOT watch streamingMessageId here because when streaming ends,
      // the message is already in local state with full content and reasoning_metadata.
      // Reloading from DB would overwrite that with stale data.
      if (isEditing || isSending || isSavingEdit) {
        console.log("[ChatPage] Skipping reloadMessages - currently sending/editing");
        return;
      }

      // Only reload if conversation ID ACTUALLY changed
      // This prevents unnecessary fetches when editing/sending states change
      if (conversationId === previouslyLoaded) {
        return;
      }

      // Check if we switched conversations (state has messages from another conversation)
      if (messages.length > 0 && messages[0].conversationId !== conversationId) {
        console.log("[ChatPage] Switching conversation, clearing state...");
        setMessages([]);
        setMessageVersions(new Map());
      }

      console.log(
        "🔄 [ChatPage] Loading messages for conversation:",
        conversationId,
      );
      reloadMessages(conversationId);
    }, [
      currentConversationId, // Only depend on the ID, not reloadMessages itself
      isEditing,
      isSending,
      isSavingEdit,
      // Note: streamingMessageId intentionally NOT included - see comment above
    ]); // Reload when conversation changes

    return (
      <main className="flex h-full flex-col overflow-hidden relative overscroll-none">
        {/* Chat Background */}
        <ChatBackground />

        <div className="flex flex-1 flex-col relative overflow-hidden">
          {/* Top Section: Messages & Title */}
          <div className="flex-1 overflow-y-auto w-full relative">

            {/* Messages Container - Fades in/Visible when conversation active OR when sending (optimistic messages) */}
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500 ease-in-out",
                (currentConversationId || isSending || messages.length > 0) ? "opacity-100 z-10" : "opacity-0 -z-10",
              )}
            >
              <div className="relative h-full flex flex-col">

                {/* Saved Surfaces Indicator - REMOVED */}

                <div className="flex-1 relative">
                  {/* Tag Section - Show when conversation is loaded */}
                  {currentConversationId && (
                    <TagSection
                      conversationId={currentConversationId}
                      tags={currentTags}
                      onTagClick={handleTagClick}
                      onShareClick={handleShareClick}
                    />
                  )}
                  
                  {/* Show skeleton when loading new conversation 
                      BUT NOT when:
                      - Currently sending (isSending) - we have optimistic messages to show
                      - Messages already exist - we're mid-stream or have content
                  */}
                  {isLoadingConversation && !isSending && messages.length === 0 ? (
                    <MessagesLoadingSkeleton />
                  ) : (
                    <VirtualizedMessageList
                      ref={virtuosoRef}
                      messages={messages}
                      isSending={isSending}
                      streamingMessageId={streamingMessageId}
                      streamingContent={streamingContent}
                      editingMessageId={editingMessageId}
                      onStartEdit={handleStartEdit}
                      onDeleteMessage={handleDeleteMessage}
                      onBranchFromMessage={handleBranchFromMessage}
                      onQuote={handleQuote}
                      onOpenSubChat={handleOpenSubChat}
                      onViewSubChats={handleViewSubChats}
                      onOpenExistingSubChat={handleOpenExistingSubChat}
                      onDeleteSubChat={handleDeleteSubChat}
                      messageIdsWithSubChats={messageIdsWithSubChats}
                      subChats={subChats}
                      messageVersions={messageVersions}
                      onSwitchVersion={handleSwitchVersion}
                      onLoadMore={loadMoreMessages}
                      isLoadingMore={isLoadingMore}
                      statusPills={statusPills}
                      searchResults={searchResults}
                      contextCards={contextCards}
                      onIsAtBottomChange={setIsScrolledUp}
                      // Surface trigger props
                      conversationId={currentConversationId}
                      savedSurfaces={currentConversation?.surfaceStates}
                      // Credit indicator
                      userCredits={userCredits}
                      isOnboarding={currentConversation?.title === ONBOARDING_CONVERSATION_TITLE}
                    />
                  )}
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

                {/* Share Dialog */}
                {currentConversationId && (
                  <ShareDialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                    conversationId={currentConversationId}
                    conversationTitle={currentConversation?.title}
                  />
                )}
              </div>
              <div className="absolute w-full h-32 bg-gradient-to-t from-background/75 to-transparent bottom-0 z-[100] pointer-events-none"></div>
            </div>
          </div>

          {/* Input Section - Always rendered, absolute positioned at bottom */}
          <div
            ref={inputContainerRef}
            className={cn(
              "absolute left-0 right-0 w-full transition-all duration-300 ease-out z-20",
              (!currentConversationId && !isSending && messages.length === 0)
                ? "bottom-1/3 sm:bottom-3/7" 
                : "bottom-0",
            )}
            style={{
              
            }}
          >
            {/* Background for input section */}
            <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto pb-safe-bottom">
               {/* Scroll to Bottom Button - Absolute atop the input container */}
               <div className="absolute top-0 left-0 right-0 -translate-y-full pointer-events-none flex justify-center pb-2 z-10">
                  <div className="pointer-events-auto transition-transform duration-200">
                    <ScrollToBottomButton
                      visible={!isScrolledUp && messages.length > 0 && !!currentConversationId}
                      onClick={() => virtuosoRef.current?.scrollToBottom()}
                      className="static transform-none shadow-md border border-border/10"
                    />
                  </div>
               </div>

              {/* Show editContext when editing, activeContext otherwise */}

              {/* Input container with optional no-credits overlay */}
              <div className="relative">
                {/* No Credits Overlay - shows when 0 credits */}
                {userCredits !== null && userCredits <= 0 && (
                  <NoCreditsOverlay />
                )}

                <PromptInputWithFiles
                  onSubmit={handleSubmit}
                  isLoading={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false)}
                  placeholder="Ask anything..."
                  disabled={isSending || (currentConversationId ? loadingConversations.has(currentConversationId) : false) || (userCredits !== null && userCredits <= 0)}
                  context={activeContext}
                  onContextChange={handleContextChange}
                  currentConversationId={currentConversationId}
                  conversations={conversations}
                  folders={folders}
                  // Edit mode props
                  editMode={isEditing}
                  initialValue={editContent}
                  initialAttachments={editAttachments}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={handleSaveEdit}
                  isSubmittingEdit={isSavingEdit}
                  // State sync
                  onValueChange={isEditing ? setEditContent : undefined}
                  onFilesChange={isEditing ? setEditAttachments : undefined}
                  // Quote props
                  quotedMessage={quotedMessage}
                  onClearQuote={handleClearQuote}
                  isDeepResearch={isDeepResearch}
                  onDeepResearchChange={setIsDeepResearch} 
                  className={cn(
                    "relative z-10 w-full rounded-3xl border border-border/60 transition-all duration-300 shadow-lg hover:shadow-xl bg-background",
                    !currentConversationId
                      ? "shadow-xl"
                      : "shadow-sm hover:shadow-md",
                    userCredits !== null && userCredits <= 0 && "opacity-50 pointer-events-none"
                  )}
                />
              </div>
            </div>
          </div>


        </div>

        {/* Sub-Chat Sheet */}
        <SubChatSheet
          open={subChatSheetOpen}
          onOpenChange={setSubChatSheetOpen}
          subChat={activeSubChat}
          onSendMessage={handleSubChatSendMessage}
          isLoading={subChatLoading}
          streamingContent={subChatStreamingContent}
          searchResults={subChatSearchResults}
        />
      </main>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for ChatContent memoization
    // Only re-render if onMenuClick prop changes
    // All other state is internal to the component
    return prevProps.onMenuClick === nextProps.onMenuClick;
  },
);

function FullChatApp() {
  return (
    <Suspense
      fallback={
        <>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full flex-col overflow-hidden relative">
              <div className="flex-1 overflow-y-auto w-full relative">
                {/* Empty State - rynk branding */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TextShimmer
                    spread={5}
                    duration={4}
                    className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-normal text-foreground/80 mb-10 leading-tight animate-in-up"
                  >
                    rynk.
                  </TextShimmer>
                </div>
              </div>
            </div>
          </SidebarInset>
        </>
      }
    >
      <ChatContentWithProvider />
    </Suspense>
  );
}

// Separate component that uses useSearchParams
// This ensures useSearchParams is wrapped in Suspense
// Uses root-level ChatProvider from layout.tsx for data persistence
function ChatContentWithProvider() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id") || null;
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const router = useRouter();
  const { selectConversation, currentConversationId } = useChatContext();

  // Track previous chatId to detect URL-initiated changes only
  // Initialize with undefined (not chatId) to ensure first render always syncs
  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  
  // Sync URL chatId with context when URL changes
  // CRITICAL: Only sync when chatId (URL) changes, NOT when currentConversationId changes
  // This prevents reverting state when sidebar updates state before URL updates
  useEffect(() => {
    const prevChatId = prevChatIdRef.current;
    prevChatIdRef.current = chatId;
    
    // On initial load (prevChatId === undefined), always sync if needed
    const isInitialLoad = prevChatId === undefined;
    const urlChanged = chatId !== prevChatId;
    
    if (isInitialLoad || urlChanged) {
      // Only update state if it doesn't already match the URL
      if (chatId !== currentConversationId) {
        console.log("[ChatPage] URL sync:", { from: prevChatId, to: chatId, isInitialLoad });
        selectConversation(chatId);
      }
    }
  }, [chatId, currentConversationId, selectConversation]);

  return (
    <>
      <>
        <AppSidebar />
        <SidebarInset>
          <ChatHeaderWithCommandBar 
            commandBarOpen={commandBarOpen}
            setCommandBarOpen={setCommandBarOpen}
          />
          <ChatContent />
          <CommandBarWrapper 
            open={commandBarOpen} 
            onOpenChange={setCommandBarOpen} 
          />
        </SidebarInset>
        <FocusModeToggle />
      </>
    </>
  );
}

// Command Bar wrapper that accesses chat context
function CommandBarWrapper({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { 
    conversations, 
    selectConversation, 
    currentConversationId,
    folders,
    projects,
  } = useChatContext();
  const router = useRouter();

  const handleSelectConversation = useCallback((id: string) => {
    selectConversation(id);
    router.push(`/chat?id=${encodeURIComponent(id)}`);
  }, [selectConversation, router]);

  const handleSelectProject = useCallback((id: string) => {
    router.push(`/project/${id}`);
  }, [router]);

  const handleNewChat = useCallback(() => {
    selectConversation(null);
    router.push('/chat');
  }, [selectConversation, router]);

  const handleNewProject = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-create-project-dialog"));
  }, []);

  const handleNewFolder = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-create-folder-dialog"));
  }, []);

  // Listen for sidebar search button click
  useEffect(() => {
    const handleOpen = () => onOpenChange(true);
    window.addEventListener("open-command-bar", handleOpen);
    return () => window.removeEventListener("open-command-bar", handleOpen);
  }, [onOpenChange]);

  return (
    <CommandBar
      open={open}
      onOpenChange={onOpenChange}
      conversations={conversations.map(c => ({
        id: c.id,
        title: c.title || 'Untitled',
        isPinned: c.isPinned,
        updatedAt: c.updatedAt,
        projectId: c.projectId,
      }))}
      projects={projects?.map(p => ({
        id: p.id,
        name: p.name,
      })) || []}
      folders={folders?.map(f => ({
        id: f.id,
        name: f.name,
        conversationIds: f.conversationIds,
      })) || []}
      onSelectConversation={handleSelectConversation}
      onSelectProject={handleSelectProject}
      onNewChat={handleNewChat}
      onNewProject={handleNewProject}
      onNewFolder={handleNewFolder}
    />
  );
}

// Memoized ChatHeader with Command Bar trigger
const ChatHeaderWithCommandBar = memo(function ChatHeaderWithCommandBar({
  commandBarOpen,
  setCommandBarOpen,
}: {
  commandBarOpen: boolean;
  setCommandBarOpen: (open: boolean) => void;
}) {
  const { selectConversation } = useChatContext();
  const { state } = useSidebar();
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    selectConversation(null);
  }, [router, selectConversation]);

  return (
    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 animate-in-down">
      <div className="flex items-center gap-0.5 p-0.5 transition-all duration-300 bg-background/50 backdrop-blur-sm rounded-md sm:bg-transparent sm:backdrop-blur-none">
        <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator orientation="vertical" className="h-4 bg-border/50" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            // New chat
            selectConversation(null);
            router.push("/chat");
          }}
          title="New Chat"
        >
          <PiPlus className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4 bg-border/50" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          onClick={() => setCommandBarOpen(true)}
          title="Search (⌘K)"
        >
          <PiMagnifyingGlass className="h-4 w-4" />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/50 rounded">
            ⌘K
          </kbd>
        </Button>
      </div>
    </div>
  );
});

export default function ChatPage() {
  return <FullChatApp />;
}
