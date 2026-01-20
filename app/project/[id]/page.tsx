"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import {
  VirtualizedMessageList,
  type VirtualizedMessageListRef,
} from "@/components/chat/virtualized-message-list";
import { useIndexingQueue } from "@/lib/hooks/use-indexing-queue";
import {
  uploadFile as uploadFileAction,
  initiateMultipartUpload as initiateMultipartUploadAction,
  uploadPart as uploadPartAction,
  completeMultipartUpload as completeMultipartUploadAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useChatContext, useStreamingContext } from "@/lib/hooks/chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { useChatController } from "@/lib/hooks/use-chat-controller";
import { useSmartInput } from "@/lib/hooks/use-smart-input";
import { useSubChats } from "@/lib/hooks/use-sub-chats";
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
  use
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { TagDialog } from "@/components/tag-dialog";
import { PiPlus, PiMagnifyingGlass } from "react-icons/pi";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { toast } from "sonner";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
// import { createStreamProcessor } from "@/lib/utils/stream-parser"; // Removed
import { CommandBar } from "@/components/ui/command-bar";
import { NoCreditsOverlay } from "@/components/credit-warning";
import { FocusModeToggle } from "@/components/focus-mode";

import { processStreamChunk } from "@/lib/utils/stream-parser";

// Extracted shared components
import { filterActiveVersions } from "@/lib/utils/filter-active-versions";
import { TagSection } from "@/components/chat/tag-section";
import { ScrollToBottomButton } from "@/components/chat/scroll-to-bottom-button";
import { ChatBackground } from "@/components/chat/chat-background";

interface ChatContentProps {
  onMenuClick?: () => void;
}

const ChatContent = memo(
  function ChatContent({ onMenuClick }: ChatContentProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
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
      // Credits
      userCredits,
    } = useChatContext();

    // Get streaming-specific values from separate context to avoid re-renders
    const { statusPills, searchResults, contextCards, setStatusPills, setSearchResults, setContextCards } = useStreamingContext();

    // Use custom hooks for separated state management
    const messageState = useMessageState<ChatMessage>();
    const editState = useMessageEdit();
    // const streamingState = useStreaming(); // DEPRECATED - Removed in favor of useChatStream

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
    // Get projectId from pathname for routing
    const projectId = typeof window !== "undefined" 
        ? window.location.pathname.split("/")[2] 
        : null;
    const routePrefix = projectId ? `/project/${projectId}` : "/chat";

    
    // Use Indexing Queue (Unified instance)
    const indexingState = useIndexingQueue();
    const { jobs } = indexingState;

    // Use Controller
    const {
        isSending,
        isSavingEdit,
        isDeleting,
        isCreatingConversationRef,
        handleSubmit,
        handleSaveEdit,
        handleDeleteMessage,
        handleBranchFromMessage,
        streamingState,
    } = useChatController({
        chatId: currentConversationId || undefined,

        localContext: [],
        setLocalContext: () => {},
        setQuotedMessage: () => {},
        messageState,
        editState,
        routePrefix,
        indexingState, // Pass unified instance
    });

    const {
        isStreaming,
        streamingMessageId,
        streamingContent,
    } = streamingState;

    // Unified Stream Handler managed by controller
    // We access context values for display
    const activeStatusPills = statusPills;
    const activeSearchResults = searchResults;

    // Refs for stable access
    // const statusPillsRef = useRef(statusPills); // Removed
    // const searchResultsRef = useRef(searchResults); // Removed

    // Other local state
    // Local State
    const [isScrolledUp, setIsScrolledUp] = useState(false);

    // Pagination state
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [messageCursor, setMessageCursor] = useState<string | null>(null);
    const [isDeepResearch, setIsDeepResearch] = useState(false);
    const [tagDialogOpen, setTagDialogOpen] = useState(false);
    const [allTags, setAllTags] = useState<string[]>([]);

    // Quote state
    const [quotedMessage, setQuotedMessage] = useState<{
      messageId: string;
      quotedText: string;
      authorRole: "user" | "assistant";
    } | null>(null);

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

    // Track conversation ID to detect browser navigation
    const lastChatIdRef = useRef(currentConversationId);
    


    // Handle chatId from URL - auto-select conversation when URL changes
    useEffect(() => {
      const prevChatId = lastChatIdRef.current;
      lastChatIdRef.current = currentConversationId;

      // Auto-select if URL changed (browser navigation or direct URL access)
      // But NOT if URL is changing to match already-selected conversation
      if (currentConversationId !== prevChatId) {
        console.log("[ProjectPage] Conversation changed:", {
          prev: prevChatId,
          current: currentConversationId,
        });
      }
    }, [currentConversationId]);

    const isLoading =
      isSending || isSavingEdit || !!isDeleting || contextIsLoading;

    // Clear messages when switching conversations or starting new chat
    // Track the previous conversation ID to detect switches
    const prevConversationIdForClearRef = useRef<string | null>(currentConversationId);
    
    useEffect(() => {
      const prevId = prevConversationIdForClearRef.current;
      prevConversationIdForClearRef.current = currentConversationId;
      
      // Case 1: Switching FROM one conversation TO ANOTHER
      // GUARD: Skip if we're in the middle of creating a new conversation
      if (prevId !== null && currentConversationId !== null && prevId !== currentConversationId) {
        if (isCreatingConversationRef.current) {
          console.log("[ProjectPage] Skipping message clear - creating new conversation", 
            { from: prevId, to: currentConversationId });
          return;
        }
        
        // Check if we have prefetched messages in React Query cache
        const cachedData = queryClient.getQueryData<{ messages: ChatMessage[], nextCursor: string | null }>(
          ["messages", currentConversationId]
        );
        
        if (cachedData?.messages && cachedData.messages.length > 0) {
          // Use cached messages immediately instead of clearing!
          console.log("[ProjectPage] Using cached messages instead of clearing:", cachedData.messages.length);
          const filtered = filterActiveVersions(cachedData.messages);
          messageState.setMessages(filtered);
          messageState.setMessageVersions(new Map());
          setQuotedMessage(null);
          setLocalContext([]);
        } else {
          // No cache, clear old messages
          console.log("[ProjectPage] No cache, clearing old messages", 
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
          console.log("[ProjectPage] Skipping message clear - currently sending new conversation");
          return;
        }
        console.log("[ProjectPage] New chat - clearing state");
        messageState.setMessages([]);
        messageState.setMessageVersions(new Map());
        setQuotedMessage(null);
        setLocalContext([]);
      }
    }, [currentConversationId, isSending]);

    // Local context state (used for all conversations now, transient)
    // Added 'status' field to track loading state for minimal progress feedback
    const [localContext, setLocalContext] = useState<
      {
        type: "conversation" | "folder";
        id: string;
        title: string;
        status?: "loading" | "loaded";
      }[]
    >([]);

    // Derived active context (source of truth) - now just localContext
    const activeContext = localContext;

    // Reset local context when switching conversations
    useEffect(() => {
      if (currentConversationId) {
        setLocalContext([]);
        setQuotedMessage(null); // Clear any pending quote when switching conversations
      }
    }, [currentConversationId]);

    // Handle chatId from URL - auto-select conversation when URL changes
    useEffect(() => {
      const prevChatId = lastChatIdRef.current;
      lastChatIdRef.current = currentConversationId;

      // Auto-select if URL changed (browser navigation or direct URL access)
      // But NOT if URL is changing to match already-selected conversation
      if (currentConversationId !== prevChatId) {
        console.log("[ProjectPage] Conversation changed:", {
          prev: prevChatId,
          current: currentConversationId,
        });
      }
    }, [currentConversationId]);

    // Helper: Wait for PDF indexing
    // Controller handles this internally now
    // But we might need to display progress?
    // Controller uses useIndexingQueue directly.
    // So UI component IndexingProgressBadge will react to global useIndexingQueue state.

    // Local Context State
    // We need to pass setLocalContext to controller if we want controller to clear it
    // But ChatContent has `setLocalContext` state.
    // The controller takes `localContext` and `setLocalContext`.
    // We need to pass them to controller above.

    // Let's fix the controller usage call above to pass these.
    
    // Quote handlers
    // Passed to controller above?
    // Controller takes `setQuotedMessage`.
    // We have `setQuotedMessage` state.

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

    // handleSubmit replaced by controller
    // But controller's handleSubmit takes (text, files).
    // PromptInputWithFiles sends (text, files).
    // Perfect.

    // Handle pending query from URL params (?q=...) or localStorage
    // Get projectId from pathname (since we're in /project/[id])
    const projectIdFromPathname =
      typeof window !== "undefined"
        ? window.location.pathname.split("/")[2]
        : null;

    useEffect(() => {
      // Check if we've already processed a query in this session (survives Fast Refresh)
      const alreadyProcessed =
        sessionStorage.getItem("pendingQueryProcessed") === "true";
      if (alreadyProcessed) {
        console.log(
          "[ProjectPage] Query already processed in this session, skipping",
        );
        return;
      }

      // First check URL query parameter
      const urlQuery = searchParams.get("q");

      // Then check localStorage
      const localStorageQuery = localStorage.getItem("pendingChatQuery");

      // Use URL param if available, otherwise fall back to localStorage
      const pendingQuery = urlQuery || localStorageQuery;

      console.log("[ChatPage] Pending query check:", {
        urlQuery,
        localStorageQuery,
        pendingQuery,
        currentConversationId,
        alreadyProcessed,
      });

      // 🔥 FIX: Early return if no pending query to avoid clearing conversation on normal navigation
      if (!pendingQuery || !pendingQuery.trim()) {
        return;
      }

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
        if (urlQuery && projectIdFromPathname) {
          console.log("[ProjectPage] Clearing URL param after submit");
          router.replace(`/project/${projectIdFromPathname}`);
        }

        // Clear the session flag after successful submission
        sessionStorage.removeItem("pendingQueryProcessed");
      }, 100);

      // No cleanup function - let the timer complete even during Fast Refresh
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentConversationId, searchParams, router]);

    // Ref for the input container to handle scroll locking
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const virtuosoRef = useRef<VirtualizedMessageListRef>(null);
    // Track current conversation ID to detect switches
    const currentConversationIdRef = useRef(currentConversationId);

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
      [isLoading, startEdit],
    );

    const handleCancelEdit = useCallback(() => {
      cancelEdit();
    }, [cancelEdit]);




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

          // Load versions for older messages - PARALLEL FETCH
          const currentVersionsMap = new Map<string, ChatMessage[]>(
            messageVersions,
          );
          const rootIds = [...new Set(
            olderMessages.map((m) => m.versionOf || m.id)
          )].filter((rootId) => !currentVersionsMap.has(rootId));
          
          const versionResults = await Promise.all(
            rootIds.map(async (rootId) => {
              const versions = await getMessageVersions(rootId);
              return [rootId, versions] as const;
            })
          );
          
          for (const [rootId, versions] of versionResults) {
            currentVersionsMap.set(rootId, versions);
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
      currentConversation,
      isLoadingMore,
      hasMoreMessages,
      messageCursor,
      getMessages,
      getMessageVersions,
      messageVersions,
      setMessages,
      setMessageVersions,
    ]);

    // Reload messages (can be called from version switching)
    const reloadMessages = useCallback(async () => {
      if (!currentConversation) {
        setMessages([]);
        setMessageVersions(new Map());
        setHasMoreMessages(true); // Reset pagination state
        setMessageCursor(null); // Reset pagination state
        return;
      }

      try {
        const { messages: loadedMessages, nextCursor } = await getMessages(
          currentConversation.id,
        );
        console.log("✅ Loaded", loadedMessages.length, "messages");
        // Filter to show only active versions (no duplicates)
        const filteredMessages = filterActiveVersions(loadedMessages);

        // Set pagination state
        setMessageCursor(nextCursor);
        setHasMoreMessages(!!nextCursor);

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

          const optimistic = prev.filter((m) => m.id.startsWith("temp-"));


          // Deduplicate: Don't add optimistic messages if they (likely) exist in the loaded messages
          // This prevents "flash of duplicates" if server returns the message before we replace the temp one
          const uniqueOptimistic = optimistic.filter((opt) => {
            // ✅ CRITICAL FIX: Only keep optimistic messages that belong to the CURRENT conversation
            // This prevents messages from the previous conversation from "leaking" into the new one
            // when switching conversations (since they wouldn't be in the server response for the new conversation)
            // Note: In project page, currentConversation?.id is the source of truth
            if (currentConversation?.id && opt.conversationId !== currentConversation.id) {
               return false;
            }

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
              return Math.abs(serverMsg.createdAt - opt.createdAt) < 60000;
            });

            return !isDuplicate;
          });

          // If we have optimistic messages, append them to the loaded messages
          return [...mergedMessages, ...uniqueOptimistic];
        });

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
      }
    }, [
      currentConversation?.id,
      getMessages,
      getMessageVersions,
      setMessages,
      setMessageVersions,
    ]);

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
        await reloadMessages();

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

    // Load messages from conversation path
    useEffect(() => {
      const conversationId = currentConversation?.id;
      if (!conversationId) return;

      // CRITICAL FIX: Update the ref BEFORE the early returns!
      // This prevents reloadMessages from being called after streaming completes.
      // Without this, the ref wouldn't be set during the guarded return,
      // and when isSending becomes false, reloadMessages would be incorrectly called.
      const previouslyLoaded = currentConversationIdRef.current;
      currentConversationIdRef.current = conversationId;

      // Skip if we're in the middle of an edit to prevent race conditions
      // Also skip if sending to prevent overwriting stream with partial DB data
      // Note: We intentionally do NOT watch streamingMessageId here because when streaming ends,
      // the message is already in local state with full content and reasoning_metadata.
      // Reloading from DB would overwrite that with stale data.
      if (isEditing || isSending || isSavingEdit) {
        console.log("[ProjectPage] Skipping reloadMessages - currently sending/editing");
        return;
      }

      // Only reload if conversation ID ACTUALLY changed
      if (conversationId === previouslyLoaded) {
        return;
      }

      // Check if we switched conversations (state has messages from another conversation)
      if (messages.length > 0 && messages[0].conversationId !== conversationId) {
        console.log("[ProjectPage] Switching conversation, clearing state...");
        setMessages([]);
        setMessageVersions(new Map());
      }

      reloadMessages();
    }, [
      currentConversation?.id,
      isEditing,
      isSending,
      isSavingEdit,
      // Note: streamingMessageId intentionally NOT included - see comment above
      reloadMessages,
    ]); // Reload when conversation changes, NOT on updatedAt to avoid race conditions

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
                {/* Sticky content at top */}
                <div className="flex-shrink-0 space-y-4">
                  {/* Indexing Progress Badge */}
                  {/* Saved Surfaces Pill - REMOVED */}

                  {/* Tags Section - Fixed Top Right */}
                  {currentConversationId && (
                    <TagSection
                      conversationId={currentConversationId}
                      tags={currentTags}
                      onTagClick={handleTagClick}
                    />
                  )}
                </div>

                {/* Messages List - Virtuoso handles its own scrolling */}
                <div className="flex-1 relative">
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
                    // Credit indicator
                    userCredits={userCredits}
                  />

                  {/* Scroll to Bottom Button */}
                  <ScrollToBottomButton
                    visible={!isScrolledUp && messages.length > 0}
                    onClick={() => virtuosoRef.current?.scrollToBottom()}
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
              {/* Show editContext when editing, activeContext otherwise */}

              {/* Input container with optional no-credits overlay */}
              <div className="relative">
                {/* No Credits Overlay - shows when 0 credits */}
                {userCredits !== null && userCredits <= 0 && (
                  <NoCreditsOverlay />
                )}

                <PromptInputWithFiles
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  placeholder="Ask anything..."
                  disabled={isLoading || (userCredits !== null && userCredits <= 0)}
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
                  hideFileUpload={false}
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
      projects={projects}
      onSelectConversation={handleSelectConversation}
      onSelectProject={handleSelectProject}
      onNewChat={handleNewChat}
      onNewProject={handleNewProject}
      onNewFolder={handleNewFolder}
    />
  );
}

// Memoized ChatHeader to prevent re-renders when parent state changes
const ChatHeader = memo(function ChatHeader({
  projectId,
  setCommandBarOpen,
}: {
  projectId?: string;
  setCommandBarOpen: (open: boolean) => void;
}) {
  const { selectConversation } = useChatContext();
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    // Navigate to stay in project context (no conversation selected)
    if (projectId) {
      router.push(`/project/${projectId}`);
    }
    selectConversation(null);
  }, [router, projectId, selectConversation]);

  return (
    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 animate-in-down">
      <div className="flex items-center gap-0.5 p-0.5 transition-all duration-300 bg-background/50 backdrop-blur-sm rounded-md sm:bg-transparent sm:backdrop-blur-none">
        <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator orientation="vertical" className="h-4 bg-border/50" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleNewChat}
          title="Start new chat"
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
function ChatContentWithLayout({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id") || null;
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const { selectConversation, currentConversationId, selectProject } = useChatContext();

  // Set active project
  useEffect(() => {
    selectProject(projectId);
    return () => selectProject(null); // Clear on unmount
  }, [projectId, selectProject]);

  // Track previous chatId to detect URL-initiated changes only
  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  
  // Sync URL chatId with context when URL changes
  useEffect(() => {
    const prevChatId = prevChatIdRef.current;
    prevChatIdRef.current = chatId;
    
    const isInitialLoad = prevChatId === undefined;
    const urlChanged = chatId !== prevChatId;
    
    if (isInitialLoad || urlChanged) {
      if (chatId !== currentConversationId) {
        console.log("[ProjectPage] URL sync:", { from: prevChatId, to: chatId, isInitialLoad });
        selectConversation(chatId);
      }
    }
  }, [chatId, currentConversationId, selectConversation]);

  return (
    <>
      <CommandBarWrapper open={commandBarOpen} onOpenChange={setCommandBarOpen} />
      <AppSidebar />
      <SidebarInset>
        <ChatHeader projectId={projectId} setCommandBarOpen={setCommandBarOpen} />
        <ChatContent />
      </SidebarInset>
      <FocusModeToggle />
    </>
  );
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  
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
      <ChatContentWithLayout projectId={resolvedParams.id} />
    </Suspense>
  );
}
