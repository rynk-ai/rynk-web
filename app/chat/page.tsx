"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import { MessageList } from "@/components/chat/message-list";
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
} from "@/app/actions"; // Import direct action
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ui/message";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Button } from "@/components/ui/button";
import { AssistantSkeleton } from "@/components/ui/assistant-skeleton";
import { useChatContext, useStreamingContext } from "@/lib/hooks/chat-context";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useStreaming } from "@/lib/hooks/use-streaming";
import { useSubChats } from "@/lib/hooks/use-sub-chats";
import { useLatest } from "@/lib/hooks/use-latest";
import type { CloudMessage as ChatMessage, SubChat } from "@/lib/services/cloud-db";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { EmptyStateChat } from "@/components/chat/empty-state-chat";
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
import { Markdown } from "@/components/ui/markdown";
import { FilePreviewList } from "@/components/file-preview";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { VersionIndicator } from "@/components/ui/version-indicator";
import { ContextPicker } from "@/components/context-picker";
import { TagDialog } from "@/components/tag-dialog";
import {
  Folder as FolderIcon,
  MessageSquare,
  X,
  Loader2,
  Tag,
  Tags,
  BookmarkPlus,
  Plus,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { Loader } from "@/components/ui/loader";
import { SavedSurfacesPill } from "@/components/surfaces";
import { toast } from "sonner";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import { CommandBar } from "@/components/ui/command-bar";
import { Search, Command } from "lucide-react";

// Helper function to filter messages to show only active versions
function filterActiveVersions(messages: ChatMessage[]): ChatMessage[] {
  const activeMessages: ChatMessage[] = [];
  const versionGroups = new Map<string, ChatMessage[]>();

  // Group messages by their version root
  messages.forEach((msg) => {
    const _rootId = msg.versionOf || msg.id;
    if (!versionGroups.has(_rootId)) {
      versionGroups.set(_rootId, []);
    }
    versionGroups.get(_rootId)!.push(msg);
  });

  // For each version group, select the active version (highest versionNumber)
  versionGroups.forEach((versions) => {
    // Find the active version by looking for the one that appears in the current messages array
    // or pick the one with the highest versionNumber as fallback
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest;
    });
    activeMessages.push(activeVersion);
  });

  // Sort by timestamp to maintain conversation order
  return activeMessages.sort((a, b) => a.timestamp - b.timestamp);
}

// Memoized TagSection component to prevent re-renders when parent state changes
const TagSection = memo(function TagSection({
  conversationId,
  tags,
  onTagClick,
}: {
  conversationId: string;
  tags: string[];
  onTagClick: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayTags = showAll ? tags : tags.slice(0, 3);
  const hasMore = tags.length > 3;

  return (
    <div className="absolute top-4 right-5 z-30">
      <div className="flex items-center gap-2">
        {/* Tags Display */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[320px]">
            {displayTags.map((tag, index) => (
              <button
                key={index}
                onClick={onTagClick}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary/90 hover:bg-primary/15 rounded-md border border-primary/20 transition-all cursor-pointer"
              >
                <span className="text-primary/60">#</span>
                {tag}
              </button>
            ))}
            {hasMore && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                +{tags.length - 3} more
              </button>
            )}
            {showAll && hasMore && (
              <button
                onClick={() => setShowAll(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Add Tag Button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-7 w-7 rounded-lg transition-all",
            tags.length > 0
              ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          onClick={onTagClick}
          title={tags.length > 0 ? "Edit tags" : "Add tags"}
        >
          {tags.length > 0 ? (
            <Tag className="h-3.5 w-3.5" />
          ) : (
            <BookmarkPlus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
});



interface ChatContentProps {
  onMenuClick?: () => void;
}

const ChatContent = memo(
  function ChatContent({ onMenuClick }: ChatContentProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
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
    } = useChatContext();

    // Get streaming-specific values from separate context to avoid re-renders
    const { statusPills, searchResults, contextCards } = useStreamingContext();

    // Use custom hooks for separated state management
    const messageState = useMessageState();
    const editState = useMessageEdit();
    const streamingState = useStreaming();

    // Surface mode state for prompt input dropdown
    const [surfaceMode, setSurfaceMode] = useState<'chat' | 'learning' | 'guide' | 'research'>('chat');

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
    const {
      streamingMessageId,
      streamingContent,
      startStreaming,
      updateStreamContent,
      finishStreaming,
    } = streamingState;

    // Other local state
    const [isSending, setIsSending] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isScrolledUp, setIsScrolledUp] = useState(false);

    // Pagination state
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [messageCursor, setMessageCursor] = useState<string | null>(null);
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
    const lastChatIdRef = useRef(chatId);
    const lastConversationIdRef = useRef(currentConversationId);

    // Handle chatId from React Router - auto-select conversation when URL changes
    useEffect(() => {
      const prevChatId = lastChatIdRef.current;
      lastChatIdRef.current = chatId;

      // Auto-select if URL changed (browser navigation or direct URL access)
      // But NOT if URL is changing to match already-selected conversation
      if (chatId !== prevChatId && chatId !== currentConversationId) {
        console.log("[ChatPage] Auto-selecting conversation from URL:", chatId);
        selectConversation(chatId || null);
      } else if (!chatId && currentConversationId && prevChatId) {
        // URL cleared (e.g., going to /chat) and we have a conversation selected
        console.log("[ChatPage] Clearing conversation (new chat)");
        selectConversation(null);
      }
    }, [chatId, currentConversationId, selectConversation]);

    const isLoading =
      isSending || isSavingEdit || !!isDeleting || contextIsLoading;

    // Simple state reset when starting a new chat
    // This clears messages when currentConversationId becomes null
    // BUT: Don't clear if there's a chatId in the URL (refresh case)
    useEffect(() => {
      if (!currentConversationId) {
        // Only clear if there's NO chatId in URL (i.e., intentional new chat)
        if (!chatId) {
          console.log("[ChatPage] New chat - clearing state");
          // Clear all state to show fresh empty state
          messageState.setMessages([]);
          messageState.setMessageVersions(new Map());
          setQuotedMessage(null);
          setLocalContext([]);
        } else {
          console.log("[ChatPage] Waiting for conversation to load from URL:", chatId);
        }
      }
    }, [currentConversationId, chatId]);

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

    // Indexing Queue for background PDF processing
    const { jobs, enqueueFile } = useIndexingQueue();

    // Keep a ref to jobs for the polling interval to access latest state
    const jobsRef = useRef(jobs);
    useEffect(() => {
      jobsRef.current = jobs;
    }, [jobs]);

    // Show toast when indexing starts/progresses
    useEffect(() => {
      const processingJobs = jobs.filter((j: any) => j.status === "processing");
      if (processingJobs.length > 0) {
        // The hook handles the toast updates internally, but we can add extra UI here if needed
      }
    }, [jobs]);

    // Helper: Wait for PDF indexing to complete
    const waitForIndexing = useCallback((jobId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          // Use ref to get latest jobs state
          const job = jobsRef.current.find((j) => j.id === jobId);

          if (job?.status === "completed") {
            clearInterval(checkInterval);
            resolve();
          } else if (job?.status === "failed") {
            clearInterval(checkInterval);
            reject(new Error(job.error || "Indexing failed"));
          }
        }, 500); // Check every 500ms

        // Timeout after 5 minutes
        setTimeout(
          () => {
            clearInterval(checkInterval);
            reject(new Error("Indexing timeout"));
          },
          5 * 60 * 1000,
        );
      });
    }, []);

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

    // Stable refs to avoid stale closures in callbacks
    // Using useLatest instead of useRef + useEffect pattern
    const sendChatRequestRef = useLatest(sendChatRequest);
    const messageStateRef = useLatest(messageState);
    const startStreamingRef = useLatest(startStreaming);
    const updateStreamContentRef = useLatest(updateStreamContent);
    const finishStreamingRef = useLatest(finishStreaming);
    const replaceMessageRef = useLatest(replaceMessage);
    const removeMessageRef = useLatest(removeMessage);
    const enqueueFileRef = useLatest(enqueueFile);
    const waitForIndexingRef = useLatest(waitForIndexing);
    const statusPillsRef = useLatest(statusPills);
    const searchResultsRef = useLatest(searchResults);

    const handleSubmit = useCallback(
      async (text: string, files: File[]) => {
        if (!text.trim() && files.length === 0) return;

        setIsSending(true);

        // ✅ OPTIMISTIC UI: Create temp IDs and messages
        const tempUserMessageId = crypto.randomUUID();
        const tempAssistantMessageId = crypto.randomUUID();
        const timestamp = Date.now();

        const referencedConversationsList = activeContext
          .filter((c) => c.type === "conversation")
          .map((c) => ({ id: c.id, title: c.title }));

        const referencedFoldersList = activeContext
          .filter((c) => c.type === "folder")
          .map((c) => ({ id: c.id, name: c.title }));

        const optimisticUserMessage: ChatMessage = {
          id: tempUserMessageId,
          conversationId: currentConversationId || crypto.randomUUID(),
          role: "user",
          content: text,
          attachments: files.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          })),
          referencedConversations: referencedConversationsList,
          referencedFolders: referencedFoldersList,
          createdAt: timestamp,
          timestamp,
          userId: "",
          versionNumber: 1,
        };

        const optimisticAssistantMessage: ChatMessage = {
          id: tempAssistantMessageId,
          conversationId: currentConversationId || crypto.randomUUID(),
          role: "assistant",
          content: "", // Empty content initially (loading state)
          createdAt: timestamp + 1,
          timestamp: timestamp + 1,
          userId: "",
          versionNumber: 1,
        };

        // Add optimistic messages IMMEDIATELY
        messageStateRef.current.addMessages([
          optimisticUserMessage,
          optimisticAssistantMessage,
        ]);

        // Clear context and quote immediately
        setLocalContext([]);
        setQuotedMessage(null);

        try {
          // 1. Upload files & Start Indexing PARALLEL
          let uploadedAttachments: any[] = [];
          let effectiveConversationId = currentConversationId;

          if (files.length > 0) {
            // Check if we have any large PDFs which require a real conversation ID for indexing
            const hasLargePDFs = files.some(
              (f) => f.type === "application/pdf" && f.size >= 500 * 1024,
            );

            // If we have large PDFs and no conversation ID, create one NOW
            if (hasLargePDFs && !effectiveConversationId) {
              console.log(
                "🆕 [ChatPage] Creating new conversation for PDF indexing...",
              );
              try {
                const newConversationId = await createConversation();
                effectiveConversationId = newConversationId;
                // Update optimistic messages with real ID
                messageStateRef.current.updateMessage(tempUserMessageId, {
                  conversationId: effectiveConversationId,
                });
                messageStateRef.current.updateMessage(tempAssistantMessageId, {
                  conversationId: effectiveConversationId,
                });
                // Navigate to the new conversation
                router.push(
                  `/chat?id=${encodeURIComponent(newConversationId)}`,
                );
              } catch (err) {
                console.error(
                  "❌ [ChatPage] Failed to create conversation:",
                  err,
                );
                throw err;
              }
            }

            // Process files in parallel
            const processingPromises = files.map(async (file) => {
              const isLargePDF =
                file.type === "application/pdf" && file.size >= 500 * 1024;

              // Start Upload
              // Use Presigned URL to avoid Worker body limits
              // Start Upload
              // Use Multipart Upload (via Worker) to avoid body limits
              const uploadPromise = (async () => {
                const CHUNK_SIZE = 6 * 1024 * 1024;
                if (file.size <= CHUNK_SIZE) {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await uploadFileAction(fd);
                  return res.url;
                } else {
                  const { uploadId, key } = await initiateMultipartUploadAction(
                    file.name,
                    file.type,
                  );
                  const parts = [];
                  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

                  for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, file.size);
                    const chunk = file.slice(start, end);
                    const fd = new FormData();
                    fd.append("chunk", chunk);
                    const part = await uploadPartAction(
                      key,
                      uploadId,
                      i + 1,
                      fd,
                    );
                    parts.push(part);
                  }
                  return await completeMultipartUploadAction(
                    key,
                    uploadId,
                    parts,
                  );
                }
              })();

              // Start Indexing (if large PDF)
              let indexingPromise: Promise<void> | undefined;
              if (isLargePDF && effectiveConversationId) {
                const jobId = await enqueueFileRef.current(
                  file,
                  effectiveConversationId,
                  tempUserMessageId,
                  uploadPromise,
                );
                if (jobId) {
                  indexingPromise = waitForIndexingRef.current(jobId);
                }
              }

              try {
                // Wait for upload to complete
                const url = await uploadPromise;

                return {
                  attachment: {
                    file,
                    url,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    isLargePDF,
                  },
                  indexingPromise,
                };
              } catch (e) {
                console.error("Upload failed for", file.name, e);
                return null;
              }
            });

            // Wait for all uploads and indexing initiations
            const results = await Promise.all(processingPromises);
            const validResults = results.filter(Boolean) as any[];

            // Extract attachments
            uploadedAttachments = validResults.map((r) => r.attachment);

            // Wait for indexing to complete (so AI has context)
            const indexingPromises = validResults
              .map((r) => r.indexingPromise)
              .filter(Boolean);
            if (indexingPromises.length > 0) {
              console.log(
                `⏳ [ChatPage] Waiting for ${indexingPromises.length} indexing jobs...`,
              );
              await Promise.all(indexingPromises);
              console.log("✅ [ChatPage] Indexing complete");
            }
          }

          // 3. Send Chat Request
          const result = await sendChatRequestRef.current(
            text,
            uploadedAttachments,
            referencedConversationsList,
            referencedFoldersList,
            effectiveConversationId || undefined,
            tempUserMessageId,
            tempAssistantMessageId,
          );

          if (!result) {
            removeMessageRef.current(tempUserMessageId);
            removeMessageRef.current(tempAssistantMessageId);
            return;
          }

          const {
            streamReader,
            conversationId,
            userMessageId,
            assistantMessageId,
          } = result;
          console.log("📦 [handleSubmit] Got result from sendChatRequest", {
            conversationId,
            userMessageId,
            assistantMessageId,
          });

          // Navigate to new conversation if it was just created
          // (i.e., if we didn't have a conversation before)
          if (
            !currentConversationId &&
            conversationId &&
            conversationId !== chatId
          ) {
            console.log(
              "🆕 [handleSubmit] New conversation created, navigating:",
              conversationId,
            );
            
            // If surface mode is selected (not chat), navigate to surface page
            if (surfaceMode !== 'chat') {
              console.log(
                `🎯 [handleSubmit] Surface mode "${surfaceMode}" selected, navigating to surface`,
              );
              const query = encodeURIComponent(text.slice(0, 500));
              router.push(`/surface/${surfaceMode}/${conversationId}?q=${query}`);
              // Reset surface mode to chat for next interaction
              setSurfaceMode('chat');
            } else {
              router.push(`/chat?id=${encodeURIComponent(conversationId)}`);
            }
          }

          // Replace optimistic messages with real ones
          if (userMessageId && userMessageId !== tempUserMessageId) {
            const realUserMessage = {
              ...optimisticUserMessage,
              id: userMessageId,
              conversationId,
            };
            replaceMessageRef.current(tempUserMessageId, realUserMessage);
          }

          if (
            assistantMessageId &&
            assistantMessageId !== tempAssistantMessageId
          ) {
            const realAssistantMessage = {
              ...optimisticAssistantMessage,
              id: assistantMessageId,
              conversationId,
            };
            replaceMessageRef.current(
              tempAssistantMessageId,
              realAssistantMessage,
            );
          }

          // Start streaming
          console.log("▶️ [handleSubmit] Starting streaming", {
            assistantMessageId,
          });
          if (assistantMessageId) {
            startStreamingRef.current(assistantMessageId);
          }

          const decoder = new TextDecoder();
          let fullContent = "";
          console.log("📖 [handleSubmit] Starting to read stream");

          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) {
                console.log(
                  "✅ [handleSubmit] Stream complete, total length:",
                  fullContent.length,
                );
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              updateStreamContentRef.current(fullContent);
            }
          } catch (err) {
            console.error("❌ [handleSubmit] Error reading stream:", err);
          } finally {
            console.log("🏁 [handleSubmit] Stream finished, updating message");
            // CRITICAL: Update message content AND reasoning metadata BEFORE clearing streaming state
            // This prevents the flash where sources disappear between stream end and message update
            if (assistantMessageId) {
              messageStateRef.current.updateMessage(assistantMessageId, {
                content: fullContent,
                // Persist reasoning metadata so sources display immediately after stream completes
                // CRITICAL: Use refs to get current values, not stale closure values!
                reasoning_metadata: {
                  statusPills: statusPillsRef.current,
                  searchResults: searchResultsRef.current,
                },
              });
            }
            // CRITICAL: Batch finishStreaming and setIsSending together using requestAnimationFrame
            // This ensures message update has propagated AND both visual state changes happen in the same frame
            // Prevents cascading re-renders that cause flicker
            requestAnimationFrame(() => {
              finishStreamingRef.current(fullContent);
              setIsSending(false);
            });
          }
        } catch (err: any) {
          console.error("Failed to send message:", err);

          // Check for insufficient credits error
          if (err?.message?.includes("Insufficient credits")) {
            toast.error("Insufficient credits", {
              description:
                "Please add more credits to continue using the chat.",
              duration: 5000,
            });
          } else {
            // Generic error toast for other errors
            toast.error("Failed to send message", {
              description:
                err?.message ||
                "An unexpected error occurred. Please try again.",
              duration: 4000,
            });
          }

          // Rollback on error
          removeMessageRef.current(tempUserMessageId);
          removeMessageRef.current(tempAssistantMessageId);
          // Also need to clear sending state on error
          setIsSending(false);
        }
      },
      // Only include dependencies that can change and affect the callback
      // Using refs for most dependencies to prevent recreation
      [
        activeContext,
        currentConversationId,
        router,
        createConversation,
        uploadFileAction,
        initiateMultipartUploadAction,
        uploadPartAction,
        completeMultipartUploadAction,
        surfaceMode,
      ],
    );

    // Handle pending query from URL params (?q=...) or localStorage
    useEffect(() => {
      // Skip if we're switching conversations (avoid double execution during switch)
      const isSwitching =
        lastConversationIdRef.current !== currentConversationId &&
        lastConversationIdRef.current !== null &&
        currentConversationId !== null;

      if (isSwitching) {
        lastConversationIdRef.current = currentConversationId;
        return;
      }

      lastConversationIdRef.current = currentConversationId;

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
        if (urlQuery) {
          console.log("[ChatPage] Clearing URL param after submit");
          router.replace("/chat");
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

    const handleSaveEdit = async (
      newContent?: string,
      newFiles?: (File | any)[],
    ) => {
      // Use passed content if available, otherwise fallback to state (for safety)
      const contentToEdit = newContent ?? editContent;
      const attachmentsToEdit = newFiles ?? editAttachments;

      if (
        !editingMessageId ||
        isSavingEdit ||
        (!contentToEdit.trim() && attachmentsToEdit.length === 0)
      )
        return;

      // ✅ STEP 1: Store edit state in local variables BEFORE resetting state
      const messageIdToEdit = editingMessageId;
      const contextToEdit = editContext;
      const conversationId = currentConversationId;

      console.log("🔧 [handleSaveEdit] Starting edit:", {
        messageIdToEdit,
        conversationId,
        contentLength: contentToEdit.length,
        contextItems: contextToEdit.length,
      });

      setIsSavingEdit(true);

      try {
        // ✅ STEP 2: Extract context from STORED state (not reset state)
        const referencedConversations = contextToEdit
          .filter((c) => c.type === "conversation")
          .map((c) => ({ id: c.id, title: c.title }));

        const referencedFolders = contextToEdit
          .filter((c) => c.type === "folder")
          .map((c) => ({ id: c.id, name: c.title }));

        console.log("📦 [handleSaveEdit] Extracted context:", {
          referencedConversations: referencedConversations.length,
          referencedFolders: referencedFolders.length,
        });

        // ✅ STEP 3: Clear edit UI immediately for better UX (but AFTER extracting data)
        cancelEdit();

        // ✅ STEP 4: Create new message version
        console.log("💾 [handleSaveEdit] Creating message version...");
        const result = await editMessage(
          messageIdToEdit,
          contentToEdit,
          attachmentsToEdit,
          referencedConversations,
          referencedFolders,
        );

        if (!result?.newMessage) {
          throw new Error("Failed to create message version");
        }

        // ✅ STEP 5: The new message (active version)
        const newMessage = result.newMessage;
        console.log("✅ [handleSaveEdit] New message created:", {
          originalId: messageIdToEdit,
          newMessageId: newMessage.id,
          conversationPath: result.conversationPath,
        });

        // ✅ STEP 6: Fetch updated messages ONCE to get the new conversation state
        console.log("📥 [handleSaveEdit] Fetching updated messages...");
        const { messages: updatedMessages } = await getMessages(
          conversationId!,
        );
        const filteredMessages = filterActiveVersions(updatedMessages);
        setMessages(filteredMessages);
        console.log("📋 [handleSaveEdit] Messages updated:", {
          totalMessages: updatedMessages.length,
          filteredMessages: filteredMessages.length,
        });

        // ✅ STEP 6.5: Update messageVersions Map for the edited message group
        // This is critical for showing the version indicator
        const rootId = messageIdToEdit; // The original message ID (root of versions)
        const allVersions = await getMessageVersions(rootId);

        console.log("🔄 [handleSaveEdit] Updating versions map:", {
          rootId,
          versionCount: allVersions.length,
        });

        setMessageVersions((prev) => {
          const updated = new Map(prev);
          updated.set(rootId, allVersions);
          return updated;
        });

        // ✅ STEP 7: Check if we need to generate an AI response
        // Only generate if the edited message is at the END of the conversation
        const isEditedMessageLast =
          newMessage &&
          filteredMessages[filteredMessages.length - 1]?.id === newMessage.id;

        console.log("🤔 [handleSaveEdit] Should generate AI response?", {
          isEditedMessageLast,
          lastMessageId: filteredMessages[filteredMessages.length - 1]?.id,
          newMessageId: newMessage.id,
        });

        if (isEditedMessageLast) {
          // ✅ STEP 8: Generate AI response using the NEW message ID
          try {
            console.log("🤖 [handleSaveEdit] Generating AI response for:", {
              conversationId,
              messageId: newMessage.id, // ✅ Uses NEW message ID, not old one!
            });

            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId: conversationId,
                messageId: newMessage.id, // ✅ CRITICAL: Use NEW message ID
              }),
            });

            if (response.ok && response.body) {
              console.log("✅ [handleSaveEdit] AI response started");

              // Extract assistant message ID from headers
              const assistantMessageId = response.headers.get(
                "X-Assistant-Message-Id",
              );

              if (assistantMessageId) {
                console.log(
                  "📨 [handleSaveEdit] Assistant message ID:",
                  assistantMessageId,
                );

                // Create optimistic assistant placeholder
                const timestamp = Date.now();
                const optimisticAssistant: ChatMessage = {
                  id: assistantMessageId,
                  conversationId: conversationId!,
                  role: "assistant",
                  content: "",
                  createdAt: timestamp,
                  timestamp,
                  userId: "",
                  versionNumber: 1,
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
                  console.log(
                    "✅ [handleSaveEdit] AI response complete, length:",
                    fullContent.length,
                  );
                } finally {
                  // CRITICAL: Update message BEFORE clearing streaming state to prevent flicker
                  messageState.updateMessage(assistantMessageId, {
                    content: fullContent,
                    // Persist reasoning metadata so sources display immediately
                    // CRITICAL: Use refs to get current values, not stale closure values!
                    reasoning_metadata: {
                      statusPills: statusPillsRef.current,
                      searchResults: searchResultsRef.current,
                    },
                  });
                  // Batch finishStreaming and setIsSavingEdit using requestAnimationFrame
                  requestAnimationFrame(() => {
                    finishStreaming(fullContent);
                    setIsSavingEdit(false);
                    setIsEditing(false);
                  });
                }
              }
            } else {
              console.error(
                "❌ [handleSaveEdit] AI response error:",
                response.status,
                response.statusText,
              );
              setIsSavingEdit(false);
              setIsEditing(false);
            }
          } catch (aiError) {
            console.error(
              "❌ [handleSaveEdit] Failed to generate AI response:",
              aiError,
            );
            finishStreaming();
            setIsSavingEdit(false);
            setIsEditing(false);
          }
        }
      } catch (error: any) {
        console.error("❌ [handleSaveEdit] Failed to save edit:", error);

        // Check for insufficient credits error
        if (error?.message?.includes("Insufficient credits")) {
          toast.error("Insufficient credits", {
            description:
              "Please add more credits to continue editing messages.",
            duration: 5000,
          });
        } else {
          // Generic error toast for other errors
          toast.error("Failed to save edit", {
            description:
              error?.message ||
              "An unexpected error occurred. Please try again.",
            duration: 4000,
          });
        }

        // Revert optimistic update on error by fetching from server
        try {
          const { messages: revertedMessages } = await getMessages(
            conversationId!,
          );
          const filteredRevertedMessages =
            filterActiveVersions(revertedMessages);
          setMessages(filteredRevertedMessages);
        } catch (fetchError) {
          console.error("Failed to revert after error:", fetchError);
        }
        setIsSavingEdit(false);
        setIsEditing(false);
      }
      console.log("🏁 [handleSaveEdit] Edit operation complete");
    };

    const handleDeleteMessage = useCallback(
      async (messageId: string) => {
        if (isLoading || isEditing) return;
        setIsDeleting(messageId);

        try {
          // Get the message to find its version root before deleting
          const message = messages.find((m) => m.id === messageId);
          const rootId = message ? message.versionOf || message.id : null;

          await deleteMessageAction(messageId);

          // After successful delete, update versions map if this was a versioned message
          if (rootId) {
            const remainingVersions = await getMessageVersions(rootId);

            console.log(
              "🗑️ [handleDeleteMessage] Updating versions map after delete:",
              {
                rootId,
                remainingVersions: remainingVersions.length,
              },
            );

            setMessageVersions((prev) => {
              const updated = new Map(prev);
              if (remainingVersions.length > 1) {
                updated.set(rootId, remainingVersions);
              } else {
                updated.delete(rootId); // Remove if only 1 version left
              }
              return updated;
            });
          }
        } finally {
          setIsDeleting(null);
        }
      },
      [isLoading, isEditing, messages, deleteMessageAction, getMessageVersions],
    );

    const handleBranchFromMessage = useCallback(
      async (messageId: string) => {
        if (isLoading || isEditing) return;

        if (confirm("Create a new conversation from this point?")) {
          try {
            const newConversationId = await branchConversation(messageId);
            // Navigate to the new conversation
            router.push(`/chat?id=${encodeURIComponent(newConversationId)}`);
          } catch (err) {
            console.error("Failed to branch conversation:", err);
          }
        }
      },
      [isLoading, branchConversation, router],
    );

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
          return;
        }

        try {
          const { messages: loadedMessages, nextCursor } =
            await getMessages(targetConversationId);
          console.log(
            "✅ Loaded",
            loadedMessages.length,
            "messages for conversation:",
            targetConversationId,
          );
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

            // 2. Identify optimistic messages (those present locally but not in server response)
            const serverIds = new Set(mergedMessages.map((m) => m.id));
            const optimistic = prev.filter((m) => !serverIds.has(m.id));

            // Deduplicate: Don't add optimistic messages if they (likely) exist in the loaded messages
            // This prevents "flash of duplicates" if server returns the message before we replace the temp one
            const uniqueOptimistic = optimistic.filter((opt) => {
              // ✅ CRITICAL FIX: Only keep optimistic messages that belong to the CURRENT conversation
              // This prevents messages from the previous conversation from "leaking" into the new one
              // when switching conversations (since they wouldn't be in the server response for the new conversation)
              if (opt.conversationId !== targetConversationId) {
                return false;
              }

              const isDuplicate = mergedMessages.some((serverMsg) => {
                // Match by role
                if (serverMsg.role !== opt.role) return false;

                // For user messages, content must match (trimmed)
                if (opt.role === "user") {
                  return serverMsg.content?.trim() === opt.content?.trim();
                }

                // For assistant messages, if the server message has content, assume it replaces the empty/partial optimistic one
                // OR if the content matches exactly
                if (opt.role === "assistant") {
                  // precise match
                  if (serverMsg.content === opt.content) return true;
                  // server has content, optimistic is empty/loading -> duplicate (server has the real data)
                  if (serverMsg.content && !opt.content) return true;
                }

                // Timestamp check (relaxed to 60 seconds to handle clock skew) as a fallback if content logic didn't catch it
                return Math.abs(serverMsg.createdAt - opt.createdAt) < 60000;
              });

              return !isDuplicate;
            });

            // FIX: Ensure optimistic messages are always strictly after the latest server message
            // This handles cases where server clock is ahead of client clock
            let maxServerTs = mergedMessages.reduce(
              (max, m) => Math.max(max, m.timestamp || 0),
              0,
            );

            const adjustedOptimistic = uniqueOptimistic.map((opt) => {
              if ((opt.timestamp || 0) <= maxServerTs) {
                maxServerTs += 1; // Increment to ensure strict ordering
                return { ...opt, timestamp: maxServerTs };
              }
              return opt;
            });

            // If we have optimistic messages, append them to the loaded messages
            // We can also sort if we want to be extra safe, but appending adjusted ones is fine
            return [...mergedMessages, ...adjustedOptimistic];
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

        // Reload versions map for all messages with versions
        console.log("🔄 [handleSwitchVersion] Refreshing versions map...");
        const { messages: reloadedMessages } = await getMessages(
          currentConversationId,
        );
        const versionsMap = new Map<string, ChatMessage[]>();

        for (const msg of reloadedMessages) {
          const rootId = msg.versionOf || msg.id;
          if (!versionsMap.has(rootId)) {
            const versions = await getMessageVersions(rootId);
            if (versions.length > 1) {
              versionsMap.set(rootId, versions);
            }
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

    useEffect(() => {
      // Skip if we're in the middle of an edit to prevent race conditions
      // Also skip if sending to prevent overwriting stream with partial DB data
      // Note: We intentionally do NOT watch streamingMessageId here because when streaming ends,
      // the message is already in local state with full content and reasoning_metadata.
      // Reloading from DB would overwrite that with stale data.
      if (isEditing || isSending || isSavingEdit) return;

      // Use ref to get the latest conversation ID, avoiding stale closures
      const conversationId = currentConversationIdRef.current;
      if (!conversationId) return;

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
        <div className="flex flex-1 flex-col relative overflow-hidden">
          {/* Top Section: Messages & Title */}
          <div className="flex-1 overflow-y-auto w-full relative">
           

            {/* Messages Container - Fades in/Visible when conversation active */}
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500 ease-in-out",
                currentConversationId ? "opacity-100 z-10" : "opacity-0 -z-10",
              )}
            >
              <div className="relative h-full flex flex-col px-2 md:px-3 lg:px-4">
                {jobs.filter(
                  (j) => j.status === "processing" || j.status === "parsing",
                ).length > 0 && (
                  <div className="absolute  top-2 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5 shadow-sm text-xs font-medium text-foreground">
                      <Loader
                        variant="text-shimmer"
                        size="sm"
                        text={(() => {
                          const processingJob = jobs.find(
                            (j) => j.status === "processing",
                          );
                          return processingJob?.fileName
                            ? `Indexing ${processingJob.fileName}... ${processingJob.progress}%`
                            : "Preparing PDF...";
                        })()}
                      />
                    </div>
                  </div>
                )}

                {/* Saved Surfaces Indicator - Show when conversation has saved surfaces */}
                {currentConversationId  && (
                  <SavedSurfacesPill
                    conversationId={currentConversationId}
                    surfaceStates={currentConversation?.surfaceStates}
                  />
                )}

                <div className="flex-1 relative">
                  {/* Tag Section - Show when conversation is loaded */}
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
                {!isScrolledUp && messages.length > 0 && (
                  <Button
                    variant="ghost"
                    className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 rounded-full shadow-lg bg-background hover:bg-accent border border-border transition-all duration-300 px-4 py-2.5 flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in"
                    onClick={() => virtuosoRef.current?.scrollToBottom()}
                    title="Scroll to bottom"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Scroll to Bottom
                    </span>
                  </Button>
                )}
              </div>
              <div className="absolute w-full h-32 bg-gradient-to-t from-background/75 to-transparent bottom-0 z-[100]"></div>
            </div>
          </div>

          {/* Input Section - Always rendered, absolute positioned at bottom */}
          <div
            ref={inputContainerRef}
            className={cn(
              "absolute left-0 right-0 w-full transition-all duration-300 ease-out z-20",
              !currentConversationId 
                ? "bottom-1/3 sm:bottom-2/7" 
                : "bottom-0",
            )}
            style={{
              
            }}
          >
            {/* Background for input section */}
            <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto pb-safe-bottom">
              {/* Show editContext when editing, activeContext otherwise */}

              <PromptInputWithFiles
                onSubmit={handleSubmit}
                isLoading={currentConversationId ? loadingConversations.has(currentConversationId) : false}
                placeholder="Ask anything..."
                disabled={currentConversationId ? loadingConversations.has(currentConversationId) : false}
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
                reasoningMode={reasoningMode}
                onToggleReasoningMode={toggleReasoningMode}
                surfaceMode={surfaceMode}
                onSurfaceModeChange={(mode) => setSurfaceMode(mode as 'chat' | 'learning' | 'guide' | 'research')}
                className={cn(
                  "relative z-10 w-full rounded-3xl border border-border/60 transition-all duration-300 shadow-lg hover:shadow-xl bg-background",
                  !currentConversationId
                    ? "shadow-xl"
                    : "shadow-sm hover:shadow-md",
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
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full flex-col overflow-hidden relative">
              <div className="flex-1 overflow-y-auto w-full relative">
                {/* Empty State - rynk branding */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TextShimmer
                    spread={5}
                    duration={4}
                    className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground/80 mb-10 leading-tight animate-in-up"
                  >
                    rynk.
                  </TextShimmer>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      }
    >
      <ChatContentWithProvider />
    </Suspense>
  );
}

// Separate component that uses useSearchParams and ChatProvider
// This ensures useSearchParams is wrapped in Suspense
// AppSidebar and ChatHeader are inside to share the same ChatProvider context
function ChatContentWithProvider() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id") || null;
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const router = useRouter();

  return (
    <ChatProvider initialConversationId={chatId}>
      <SidebarProvider>
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
      </SidebarProvider>
    </ChatProvider>
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
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 animate-in-down">
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
          <Plus className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-5 bg-border/50" />
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          onClick={() => setCommandBarOpen(true)}
          title="Search (⌘K)"
        >
          <Search className="h-5 w-5" />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/50 rounded">
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
