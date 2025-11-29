"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import { MessageList } from "@/components/chat/message-list";
import { VirtualizedMessageList } from "@/components/chat/virtualized-message-list";
import { useIndexingQueue } from "@/lib/hooks/use-indexing-queue";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ui/message";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Button } from "@/components/ui/button";
import { AssistantSkeleton } from "@/components/ui/assistant-skeleton";
import { useChatContext } from "@/lib/hooks/chat-context";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { useMessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useStreaming } from "@/lib/hooks/use-streaming";
import type {
  CloudMessage as ChatMessage,
} from "@/lib/services/cloud-db";
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
import { ChatContainerContent, ChatContainerRoot } from "@/components/prompt-kit/chat-container";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from "react";
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
  Plus,
  Tag,
  Tags,
  BookmarkPlus,
  Bookmark,
} from "lucide-react";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";


// Helper function to filter messages to show only active versions
function filterActiveVersions(messages: ChatMessage[]): ChatMessage[] {
  const activeMessages: ChatMessage[] = []
  const versionGroups = new Map<string, ChatMessage[]>()

  // Group messages by their version root
  messages.forEach(msg => {
    const _rootId = msg.versionOf || msg.id
    if (!versionGroups.has(_rootId)) {
      versionGroups.set(_rootId, [])
    }
    versionGroups.get(_rootId)!.push(msg)
  })

  // For each version group, select the active version (highest versionNumber)
  versionGroups.forEach((versions) => {
    // Find the active version by looking for the one that appears in the current messages array
    // or pick the one with the highest versionNumber as fallback
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest
    })
    activeMessages.push(activeVersion)
  })

  // Sort by timestamp to maintain conversation order
  return activeMessages.sort((a, b) => a.timestamp - b.timestamp)
}

interface ChatContentProps {
  onMenuClick?: () => void;
}

function ChatContent({ onMenuClick }: ChatContentProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  } = useChatContext();
  
  // Use custom hooks for separated state management
  const messageState = useMessageState();
  const editState = useMessageEdit();
  const streamingState = useStreaming();
  
  // Keyboard awareness for mobile
  const keyboardHeight = useKeyboardAwarePosition();
  
  // Destructure for convenience
  const { messages, setMessages, messageVersions, setMessageVersions, replaceMessage, removeMessage } = messageState;
  const { 
    isEditing, setIsEditing, 
    editingMessageId, 
    editContent, setEditContent,
    editAttachments, setEditAttachments,
    editContext, setEditContext,
    startEdit, cancelEdit 
  } = editState;
  const {
    streamingMessageId,
    streamingContent,
    startStreaming,
    updateStreamContent,
    finishStreaming
  } = streamingState;
  
  // Other local state
  const [isSending, setIsSending] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

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

  const isLoading = isSending || isSavingEdit || !!isDeleting || contextIsLoading;

  // Local context state (used for all conversations now, transient)
  // Added 'status' field to track loading state for minimal progress feedback
  const [localContext, setLocalContext] = useState<
    { type: "conversation" | "folder"; id: string; title: string; status?: 'loading' | 'loaded' }[]
  >([]);

  // Derived active context (source of truth) - now just localContext
  const activeContext = localContext;

  // Reset local context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
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
    const processingJobs = jobs.filter((j: any) => j.status === 'processing');
    if (processingJobs.length > 0) {
      // The hook handles the toast updates internally, but we can add extra UI here if needed
    }
  }, [jobs]);

  // Helper: Wait for PDF indexing to complete
  const waitForIndexing = useCallback((jobId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Use ref to get latest jobs state
        const job = jobsRef.current.find(j => j.id === jobId);
        
        if (job?.status === 'completed') {
          clearInterval(checkInterval);
          resolve();
        } else if (job?.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(job.error || 'Indexing failed'));
        }
      }, 500); // Check every 500ms
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Indexing timeout'));
      }, 5 * 60 * 1000);
    });
  }, []);

  const handleContextChange = useCallback(async (newContext: typeof localContext) => {
    setLocalContext(newContext);
  }, []);

  const handleSubmit = useCallback(async (
    text: string,
    files: File[]
  ) => {
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
      role: 'user',
      content: text,
      attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
      referencedConversations: referencedConversationsList,
      referencedFolders: referencedFoldersList,
      createdAt: timestamp,
      timestamp,
      userId: '',
      versionNumber: 1
    };

    const optimisticAssistantMessage: ChatMessage = {
      id: tempAssistantMessageId,
      conversationId: currentConversationId || crypto.randomUUID(),
      role: 'assistant',
      content: '', // Empty content initially (loading state)
      createdAt: timestamp + 1,
      timestamp: timestamp + 1,
      userId: '',
      versionNumber: 1
    };

    // Add optimistic messages IMMEDIATELY
    messageState.addMessages([optimisticUserMessage, optimisticAssistantMessage]);
    
    // Clear context immediately
    setLocalContext([]);

    try {
      // 1. Upload files first
      let uploadedAttachments: any[] = [];
      if (files.length > 0) {
        uploadedAttachments = await uploadAttachments(files);
      }

      // 2. Handle large PDFs: enqueue and WAIT for indexing
      // We need a conversation ID for indexing. If we don't have one, we might need to create it?
      // Actually, the worker needs it. But `enqueueFile` takes it.
      // If we are creating a new conversation, we don't have the ID yet until we call `sendChatRequest`...
      // CATCH-22: We need conversation ID for indexing, but we get it from sending the message.
      // FIX: We can generate the conversation ID optimistically if it doesn't exist!
      // `sendChatRequest` allows passing an override ID.
      
      const targetConversationId = currentConversationId || optimisticUserMessage.conversationId;

      if (uploadedAttachments.length > 0) {
        const largePDFs = uploadedAttachments.filter((f: any) => f.isLargePDF);
        
        if (largePDFs.length > 0) {
          // 🚨 CRITICAL: If we have large PDFs to index, we MUST have a real conversation ID in the DB.
          // If we are in a new chat (no currentConversationId), the optimistic ID won't work for the backend.
          // So we must create the conversation explicitly here.
          let effectiveConversationId = targetConversationId;
          
          if (!currentConversationId) {
            console.log('🆕 [ChatPage] Creating new conversation for PDF indexing...');
            try {
              // Create conversation and wait for it
              const newConversationId = await createConversation();
              effectiveConversationId = newConversationId;
              console.log('✅ [ChatPage] New conversation created:', effectiveConversationId);
            } catch (err) {
              console.error('❌ [ChatPage] Failed to create conversation:', err);
              throw err;
            }
          }

          console.log(`🔄 [ChatPage] Waiting for ${largePDFs.length} large PDF(s) to index...`);
          
          const jobIds: string[] = [];
          for (const att of largePDFs) {
            // We need the original File object for indexing, which is in `att.file` (preserved by processAttachments)
            if (att.file) {
              const jobId = await enqueueFile(att.file, effectiveConversationId, tempUserMessageId, att.url);
              if (jobId) jobIds.push(jobId);
            }
          }
          
          // Wait for all large PDFs to complete indexing
          if (jobIds.length > 0) {
            await Promise.all(jobIds.map(jobId => waitForIndexing(jobId)));
            console.log('✅ [ChatPage] All large PDFs indexed');
          }

          // Update target for sendChatRequest
          // We must use the REAL ID if we created one
          if (!currentConversationId) {
             // We can't easily update 'targetConversationId' const, so we pass effectiveConversationId to sendChatRequest
             // But wait, sendChatRequest takes conversationIdParam.
          }
          
          // 3. Send Chat Request (NOW safe to send)
          const result = await sendChatRequest(
            text,
            uploadedAttachments,
            referencedConversationsList,
            referencedFoldersList,
            effectiveConversationId, // Pass the REAL ID
            tempUserMessageId,    
            tempAssistantMessageId 
          );
          
          if (!result) {
            removeMessage(tempUserMessageId);
            removeMessage(tempAssistantMessageId);
            return;
          }
          
          // ... handle result ...
          const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

          if (userMessageId && userMessageId !== tempUserMessageId) {
            const realUserMessage = { ...optimisticUserMessage, id: userMessageId, conversationId };
            replaceMessage(tempUserMessageId, realUserMessage);
          }
          
          if (assistantMessageId && assistantMessageId !== tempAssistantMessageId) {
            const realAssistantMessage = { ...optimisticAssistantMessage, id: assistantMessageId, conversationId };
            replaceMessage(tempAssistantMessageId, realAssistantMessage);
          }

          if (assistantMessageId) {
            startStreaming(assistantMessageId);
          }

          const decoder = new TextDecoder();
          let fullContent = "";

          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              updateStreamContent(fullContent);
            }
          } catch (err) {
            console.error("Error reading stream:", err);
          } finally {
            if (assistantMessageId) {
              messageState.updateMessage(assistantMessageId, { content: fullContent });
            }
            finishStreaming();
          }
          
          return; // Exit here since we handled the send
        }
      }

      // Fallback for non-large-PDF flow (or if no files)
      // 3. Send Chat Request
      const result = await sendChatRequest(
        text,
        uploadedAttachments,
        referencedConversationsList,
        referencedFoldersList,
        currentConversationId || undefined, 
        tempUserMessageId,    
        tempAssistantMessageId 
      );

      if (!result) {
        removeMessage(tempUserMessageId);
        removeMessage(tempAssistantMessageId);
        return;
      }

      const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

      // Replace optimistic messages with real ones
      if (userMessageId && userMessageId !== tempUserMessageId) {
        const realUserMessage = { ...optimisticUserMessage, id: userMessageId, conversationId };
        replaceMessage(tempUserMessageId, realUserMessage);
      }
      
      if (assistantMessageId && assistantMessageId !== tempAssistantMessageId) {
        const realAssistantMessage = { ...optimisticAssistantMessage, id: assistantMessageId, conversationId };
        replaceMessage(tempAssistantMessageId, realAssistantMessage);
      }

      // Start streaming
      if (assistantMessageId) {
        startStreaming(assistantMessageId);
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateStreamContent(fullContent);
        }
      } catch (err) {
        console.error("Error reading stream:", err);
      } finally {
        if (assistantMessageId) {
          messageState.updateMessage(assistantMessageId, { content: fullContent });
        }
        finishStreaming();
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      // Rollback on error
      removeMessage(tempUserMessageId);
      removeMessage(tempAssistantMessageId);
    } finally {
      setIsSending(false);
    }
  }, [activeContext, uploadAttachments, sendChatRequest, messageState, startStreaming, updateStreamContent, finishStreaming, currentConversationId, replaceMessage, removeMessage, enqueueFile, waitForIndexing, jobs]);

  // Handle pending query from URL params (?q=...) or localStorage
  useEffect(() => {
    // Check if we've already processed a query in this session (survives Fast Refresh)
    const alreadyProcessed = sessionStorage.getItem('pendingQueryProcessed') === 'true';
    if (alreadyProcessed) {
      console.log('[ChatPage] Query already processed in this session, skipping');
      return;
    }
    
    // First check URL query parameter
    const urlQuery = searchParams.get('q');
    
    // Then check localStorage
    const localStorageQuery = localStorage.getItem('pendingChatQuery');
    
    // Use URL param if available, otherwise fall back to localStorage
    const pendingQuery = urlQuery || localStorageQuery;
    
    console.log('[ChatPage] Pending query check:', {
      urlQuery,
      localStorageQuery,
      pendingQuery,
      currentConversationId,
      alreadyProcessed
    });
    
    // 🔥 FIX: If there's a pending query, clear the current conversation to start fresh
    if (pendingQuery && pendingQuery.trim()) {
      // If user is on an old conversation, clear it to start a new one
      if (currentConversationId) {
        console.log('[ChatPage] Clearing current conversation to process pending query');
        selectConversation(null);
      }
      
      // Mark as processed in sessionStorage (survives Fast Refresh)
      sessionStorage.setItem('pendingQueryProcessed', 'true');
      
      console.log('[ChatPage] Scheduling auto-submit for:', pendingQuery);
      
      // Use a shorter delay and no cleanup function to avoid Fast Refresh cancellation
      setTimeout(() => {
        console.log('[ChatPage] Auto-submitting pending query:', pendingQuery);
        
        // Auto-submit the pending query
        handleSubmit(pendingQuery, []);
        
        // Clear localStorage AFTER submit
        if (localStorageQuery) {
          console.log('[ChatPage] Clearing localStorage after submit');
          localStorage.removeItem('pendingChatQuery');
          localStorage.removeItem('pendingChatFilesCount');
        }
        
        // Clear URL param AFTER submit
        if (urlQuery) {
          console.log('[ChatPage] Clearing URL param after submit');
          router.replace('/chat');
        }
        
        // Clear the session flag after successful submission
        sessionStorage.removeItem('pendingQueryProcessed');
      }, 100);
      
      // No cleanup function - let the timer complete even during Fast Refresh
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, searchParams, router]);

  // Ref for the input container to handle scroll locking
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when touching the input container (except for textarea)
  useEffect(() => {
    const container = inputContainerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      // Find if the target is a textarea or inside one
      const target = e.target as HTMLElement;
      const isTextarea = target.closest('textarea');

      if (!isTextarea) {
        // If not touching a textarea, prevent default to stop body scroll
        e.preventDefault();
      }
      // If it IS a textarea, let it scroll naturally
      // The textarea itself should have overscroll-behavior: contain
    };

    // Add non-passive listener to be able to call preventDefault
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleStartEdit = useCallback((message: ChatMessage) => {
    if (isLoading || isEditing) return;

    // Populate initial context from message references
    const initialContext: {
      type: "conversation" | "folder";
      id: string;
      title: string;
      status?: 'loading' | 'loaded';
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

    startEdit(message, initialContext);

    // Focus and select all text after state update
    setTimeout(() => {
      const textarea = document.getElementById(
        "main-chat-input"
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 0);
  }, [isLoading, startEdit]);

  const handleCancelEdit = useCallback(() => {
    cancelEdit();
  }, [cancelEdit]);

  const handleSaveEdit = async (newContent?: string, newFiles?: (File | any)[]) => {
    // Use passed content if available, otherwise fallback to state (for safety)
    const contentToEdit = newContent ?? editContent;
    const attachmentsToEdit = newFiles ?? editAttachments;
    
    if (!editingMessageId || isSavingEdit || (!contentToEdit.trim() && attachmentsToEdit.length === 0)) return;
    
    // ✅ STEP 1: Store edit state in local variables BEFORE resetting state
    const messageIdToEdit = editingMessageId;
    const contextToEdit = editContext;
    const conversationId = currentConversationId;
    
    console.log('🔧 [handleSaveEdit] Starting edit:', {
      messageIdToEdit,
      conversationId,
      contentLength: contentToEdit.length,
      contextItems: contextToEdit.length
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

      console.log('📦 [handleSaveEdit] Extracted context:', {
        referencedConversations: referencedConversations.length,
        referencedFolders: referencedFolders.length
      });

      // ✅ STEP 3: Clear edit UI immediately for better UX (but AFTER extracting data)
      cancelEdit();

      // ✅ STEP 4: Create new message version
      console.log('💾 [handleSaveEdit] Creating message version...');
      const result = await editMessage(
        messageIdToEdit,
        contentToEdit,
        attachmentsToEdit,
        referencedConversations,
        referencedFolders
      );

      if (!result?.newMessage) {
        throw new Error('Failed to create message version')
      }

      // ✅ STEP 5: The new message (active version)
      const newMessage = result.newMessage;
      console.log('✅ [handleSaveEdit] New message created:', {
        originalId: messageIdToEdit,
        newMessageId: newMessage.id,
        conversationPath: result.conversationPath
      });

      // ✅ STEP 6: Fetch updated messages ONCE to get the new conversation state
      console.log('📥 [handleSaveEdit] Fetching updated messages...');
      const updatedMessages = await getMessages(conversationId!);
      const filteredMessages = filterActiveVersions(updatedMessages);
      setMessages(filteredMessages);
      console.log('📋 [handleSaveEdit] Messages updated:', {
        totalMessages: updatedMessages.length,
        filteredMessages: filteredMessages.length
      });

      // ✅ STEP 7: Check if we need to generate an AI response
      // Only generate if the edited message is at the END of the conversation
      const isEditedMessageLast =
        newMessage && filteredMessages[filteredMessages.length - 1]?.id === newMessage.id;

      console.log('🤔 [handleSaveEdit] Should generate AI response?', {
        isEditedMessageLast,
        lastMessageId: filteredMessages[filteredMessages.length - 1]?.id,
        newMessageId: newMessage.id
      });

      if (isEditedMessageLast) {
        // ✅ STEP 8: Generate AI response using the NEW message ID
        try {
          console.log('🤖 [handleSaveEdit] Generating AI response for:', {
            conversationId,
            messageId: newMessage.id  // ✅ Uses NEW message ID, not old one!
          });

          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: conversationId,
              messageId: newMessage.id,  // ✅ CRITICAL: Use NEW message ID
            }),
          });

          if (response.ok && response.body) {
            console.log('✅ [handleSaveEdit] AI response started');
            
            // Extract assistant message ID from headers
            const assistantMessageId = response.headers.get('X-Assistant-Message-Id');
            
            if (assistantMessageId) {
              console.log('📨 [handleSaveEdit] Assistant message ID:', assistantMessageId);
              
              // Create optimistic assistant placeholder
              const timestamp = Date.now();
              const optimisticAssistant: ChatMessage = {
                id: assistantMessageId,
                conversationId: conversationId!,
                role: 'assistant',
                content: '',
                createdAt: timestamp,
                timestamp,
                userId: '',
                versionNumber: 1
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
                console.log('✅ [handleSaveEdit] AI response complete, length:', fullContent.length);
              } finally {
                // Clear streaming state
                finishStreaming();

                // Optimistic update instead of DB fetch!
                messageState.updateMessage(assistantMessageId, { content: fullContent });
              }
            }
          } else {
            console.error('❌ [handleSaveEdit] AI response error:', response.status, response.statusText);
          }
        } catch (aiError) {
          console.error("❌ [handleSaveEdit] Failed to generate AI response:", aiError);
          finishStreaming();
        }
      }

    } catch (error) {
      console.error("❌ [handleSaveEdit] Failed to save edit:", error);
      // Revert optimistic update on error by fetching from server
      try {
        const revertedMessages = await getMessages(conversationId!);
        const filteredRevertedMessages = filterActiveVersions(revertedMessages);
        setMessages(filteredRevertedMessages);
      } catch (fetchError) {
        console.error("Failed to revert after error:", fetchError);
      }
    } finally {
      setIsSavingEdit(false);
      setIsEditing(false);
      console.log('🏁 [handleSaveEdit] Edit operation complete');
    }
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (isLoading || isEditing) return;
    setIsDeleting(messageId);
    try {
      await deleteMessageAction(messageId);
    } finally {
      setIsDeleting(null);
    }
  }, [isLoading, deleteMessageAction]);

  const handleBranchFromMessage = useCallback(async (messageId: string) => {
    if (isLoading || isEditing) return;

    if (confirm("Create a new conversation from this point?")) {
      try {
        await branchConversation(messageId);
      } catch (err) {
        console.error("Failed to branch conversation:", err);
      }
    }
  }, [isLoading, branchConversation]);

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

  // Reload messages (can be called from version switching)
  const reloadMessages = useCallback(async () => {
    if (!currentConversation) {
      setMessages([]);
      setMessageVersions(new Map());
      return;
    }

    try {
      const loadedMessages = await getMessages(currentConversation.id);
      console.log("✅ Loaded", loadedMessages.length, "messages");
      // Filter to show only active versions (no duplicates)
      const filteredMessages = filterActiveVersions(loadedMessages);
      
      // ✅ PRESERVE OPTIMISTIC MESSAGES & FIX RACE CONDITION
      setMessages(prev => {
        // 1. Merge DB messages with local state to prevent overwriting fresh content with stale DB data
        const mergedMessages = filteredMessages.map(serverMsg => {
          const localMsg = prev.find(m => m.id === serverMsg.id);
          // If local message has content and server message is empty (and is assistant), keep local content
          // This handles the race condition where server hasn't finished writing to DB yet
          if (localMsg && localMsg.role === 'assistant' && localMsg.content && !serverMsg.content) {
             return { ...serverMsg, content: localMsg.content };
          }
          return serverMsg;
        });

        const optimistic = prev.filter(m => m.id.startsWith('temp-'));
        
        // Deduplicate: Don't add optimistic messages if they (likely) exist in the loaded messages
        // This prevents "flash of duplicates" if server returns the message before we replace the temp one
        const uniqueOptimistic = optimistic.filter(opt => {
          const isDuplicate = mergedMessages.some(serverMsg => {
            // Match by role and approximate timestamp
            if (serverMsg.role !== opt.role) return false;
            
            // For user messages, content must match
            if (opt.role === 'user' && serverMsg.content !== opt.content) return false;
            
            // Timestamp check (within 10 seconds)
            return Math.abs(serverMsg.createdAt - opt.createdAt) < 10000;
          });
          
          return !isDuplicate;
        });

        // If we have optimistic messages, append them to the loaded messages
        return [...mergedMessages, ...uniqueOptimistic];
      });

      // Load versions for each message (load from all versions, not just active)
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
  }, [currentConversation?.id, getMessages, getMessageVersions]);

  // Load messages from conversation path
  useEffect(() => {
    // Skip if we're in the middle of an edit to prevent race conditions
    // Also skip if sending (streaming) to prevent overwriting stream with partial DB data
    if (isEditing || isSending || isSavingEdit) return;

    reloadMessages();
  }, [currentConversation?.id, currentConversation?.updatedAt, isEditing, isSending, isSavingEdit, reloadMessages]); // Reload when ID or timestamp changes

  return (
    <main className="flex h-full flex-col overflow-hidden relative overscroll-none">

      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Top Section: Messages & Title */}
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* Title for New Chat - Fades out when conversation starts */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out pointer-events-none",
              !currentConversationId 
                ? "opacity-100 translate-y-0 pb-24" 
                : "opacity-0 -translate-y-10 pb-24"
            )}
          >
            <TextShimmer
              spread={5}
      duration={4} className="text-3xl md:text-4xl lg:text-7xl font-bold tracking-tighter text-foreground/70 mb-10 leading-24">
              rynk.
            </TextShimmer>
          </div>

          {/* Messages Container - Fades in/Visible when conversation active */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-in-out",
              currentConversationId ? "opacity-100 z-10" : "opacity-0 -z-10"
            )}
          >
            <ChatContainerRoot
              className="h-full px-2 md:px-3 lg:px-4 "
            >
               <ChatContainerContent
                 className="space-y-4 md:space-y-5 lg:space-y-6 px-0 sm:px-1 md:px-2 pt-6 relative pt-10 max-xl:pt-20 max-md:px-5"
                 style={{ paddingBottom: `calc(20rem + ${keyboardHeight}px)` }}
               >
                {/* Indexing Progress Badge */}
                {jobs.filter(j => j.status === 'processing' || j.status === 'parsing').length > 0 && (
                  <div className="absolute top-2 right-4 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1.5 shadow-sm text-xs font-medium text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span>
                        {jobs.find(j => j.status === 'processing')?.fileName
                          ? `Indexing ${jobs.find(j => j.status === 'processing')?.fileName}... ${jobs.find(j => j.status === 'processing')?.progress}%`
                          : 'Preparing PDF...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tags Section - Fixed Top Right */}
                {currentConversationId && (
                  <div className="fixed top-4 right-5 z-30 flex flex-col  items-end gap-2">
                    {/* Existing Tags */}
                    {currentTags.length > 0 && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-[400px] max-md:ml-20 overflow-x-auto">
                        {currentTags.map((tag, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-secondary/60 hover:bg-secondary px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap"
                          >
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="lg:font-medium">{tag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Tag Button */}
                    <Button
                      variant={"outline"}
                      size="icon"
                      className="w-min px-1 h-6 hover:bg-muted shrink-0 text-xs flex gap-0.5"
                      onClick={handleTagClick}
                      title="Edit tags"
                    >
                      <Plus className="h-3 w-2" />
                      <span>
                      Tags
                      </span>
                    </Button>
                  </div>
                )}
                
                <MessageList
                  messages={messages}
                  isSending={isSending}
                  streamingMessageId={streamingMessageId}
                  streamingContent={streamingContent}
                  editingMessageId={editingMessageId}
                  onStartEdit={handleStartEdit}
                  onDeleteMessage={handleDeleteMessage}
                  onBranchFromMessage={handleBranchFromMessage}
                  messageVersions={messageVersions}
                  onSwitchVersion={switchToMessageVersion}
                />

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
              </ChatContainerContent>
            </ChatContainerRoot>
          </div>
        </div>

        {/* Input Section - Always rendered, absolute positioned at bottom */}
        <div 
          ref={inputContainerRef}
          className={cn(
            "absolute left-0 right-0 w-full transition-all duration-500 ease-in-out z-20",
            !currentConversationId 
              ? "bottom-1/3" 
              : "bottom-0 mb-4"
          )}
          style={{ transform: `translateY(-${keyboardHeight}px)` }}
        >
          {/* Background for input section */}
          <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto px-4 pb-safe-bottom pt-4">
            {/* Show editContext when editing, activeContext otherwise */}
            {(editingMessageId ? editContext.length > 0 : activeContext.length > 0) && (
              <div className="mb-2.5 flex flex-wrap gap-1.5 transition-all duration-300 justify-start">
                {(editingMessageId ? editContext : activeContext).map((c, i) => {
                  const isLoading = c.status === 'loading';
                  
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary/70 px-3 py-1.5 rounded-full text-xs transition-colors"
                    >
                      {/* Show spinner when loading, otherwise show normal icon */}
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
                          if (editingMessageId) {
                            setEditContext(editContext.filter((_, idx) => idx !== i));
                          } else {
                            handleContextChange(
                              activeContext.filter((_, idx) => idx !== i)
                            );
                          }
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
                    if (editingMessageId) {
                      setEditContext([]);
                    } else {
                      handleContextChange([]);
                    }
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}

            <PromptInputWithFiles
              onSubmit={handleSubmit}
              isLoading={isLoading}
              placeholder={
                isEditing ? "Edit your message..." : (!currentConversationId ? "Message..." : "Type a message...")
              }
              disabled={isLoading && !isEditing}
              context={isEditing ? editContext : activeContext}
              onContextChange={isEditing ? setEditContext : handleContextChange}
              currentConversationId={currentConversationId}
              conversations={conversations}
              folders={folders}
              // Edit mode props
              editMode={!!editingMessageId}
              initialValue={isEditing ? editContent : ''}
              initialAttachments={isEditing ? editAttachments : []}
              onCancelEdit={isEditing ? handleCancelEdit : undefined}
              onSaveEdit={isEditing ? handleSaveEdit : undefined}
              isSubmittingEdit={isSavingEdit}
              // State sync for edit mode
              onValueChange={isEditing ? setEditContent : undefined}
              onFilesChange={isEditing ? setEditAttachments : undefined}
              onKeyDown={handleKeyDown}
              className={cn(
                "glass relative z-10 w-full rounded-3xl border border-border/50 transition-all duration-300",
                !currentConversationId ? "shadow-lg" : "shadow-sm hover:shadow-md"
              )}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function FullChatApp() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ChatHeader />
        <Suspense fallback={
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto w-full">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6">
                {/* User Message Skeleton */}
                <div className="flex w-full flex-col gap-2 px-0 items-end">
                  <div className="flex flex-col items-end gap-1 w-full">
                    <div className="rounded-2xl px-5 py-3 bg-primary/10 shadow-sm max-w-[85%] animate-pulse">
                      <div className="h-4 bg-primary/20 rounded w-64 mb-2"></div>
                      <div className="h-4 bg-primary/20 rounded w-48"></div>
                    </div>
                  </div>
                </div>

                {/* AI Response Skeleton */}
                <div className="flex w-full flex-col gap-2 px-0 items-start">
                  <div className="flex w-full flex-col gap-2 max-w-[85%]">
                    <div className="space-y-2.5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                      <div className="h-4 bg-muted rounded w-4/6"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }>
          <ChatContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ChatHeader() {
  const { selectConversation } = useChatContext();
  const { state } = useSidebar();

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md border border-border/40 shadow-sm rounded-full p-1 transition-all duration-300 hover:bg-background/80 hover:shadow-md hover:border-border/60">
        <SidebarTrigger className="h-8 w-8 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator orientation="vertical" className="h-4 bg-border/50" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => selectConversation(null)}
          title="Start new chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <FullChatApp />;
}
