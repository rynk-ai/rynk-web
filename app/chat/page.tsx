"use client";

// ChatContainer imports removed as we use VirtualizedMessageList directly
import { MessageList } from "@/components/chat/message-list";
import { VirtualizedMessageList } from "@/components/chat/virtualized-message-list";
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
import {
  Folder as FolderIcon,
  MessageSquare,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from "@/components/ui/chain-of-thought";

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [contextProgress, setContextProgress] = useState<Array<{
    type: 'loading' | 'loaded' | 'complete';
    conversation?: string;
    messageCount?: number;
  }>>([]);

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

  const isLoading = isSending || isEditing || !!isDeleting || contextIsLoading;

  // Local context state (used for all conversations now, transient)
  const [localContext, setLocalContext] = useState<
    { type: "conversation" | "folder"; id: string; title: string }[]
  >([]);

  // Derived active context (source of truth) - now just localContext
  const activeContext = localContext;

  // Reset local context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
    }
  }, [currentConversationId]);

  const handleContextChange = useCallback(async (newContext: typeof localContext) => {
    setLocalContext(newContext);
  }, []);

  const handleSubmit = useCallback(async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    // Clear previous context progress
    setContextProgress([]);
    
    setIsSending(true);

    // ✅ OPTIMISTIC UI: Create temp IDs and messages
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempAssistantMessageId = `temp-assistant-${Date.now()}`;
    const timestamp = Date.now();

    const referencedConversations = activeContext
      .filter((c) => c.type === "conversation")
      .map((c) => ({ id: c.id, title: c.title }));

    const referencedFolders = activeContext
      .filter((c) => c.type === "folder")
      .map((c) => ({ id: c.id, name: c.title }));

    const optimisticUserMessage: ChatMessage = {
      id: tempUserMessageId,
      conversationId: currentConversationId || 'temp-conversation',
      role: 'user',
      content: text,
      attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
      referencedConversations,
      referencedFolders,
      createdAt: timestamp,
      timestamp,
      userId: '',
      versionNumber: 1
    };

    const optimisticAssistantMessage: ChatMessage = {
      id: tempAssistantMessageId,
      conversationId: currentConversationId || 'temp-conversation',
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
      const result = await sendMessage(
        text,
        files,
        referencedConversations,
        referencedFolders
      );

      if (!result) {
        // Rollback if failed
        removeMessage(tempUserMessageId);
        removeMessage(tempAssistantMessageId);
        return;
      }

      const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

      // ✅ REPLACE OPTIMISTIC MESSAGES WITH REAL ONES
      if (userMessageId) {
        const realUserMessage = { ...optimisticUserMessage, id: userMessageId, conversationId };
        replaceMessage(tempUserMessageId, realUserMessage);
      }
      
      if (assistantMessageId) {
        const realAssistantMessage = { ...optimisticAssistantMessage, id: assistantMessageId, conversationId };
        replaceMessage(tempAssistantMessageId, realAssistantMessage);
        startStreaming(assistantMessageId);
      }

      // Read the stream and parse progress markers
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Parse progress markers
          while (buffer.includes('[CONTEXT_PROGRESS]')) {
            const startIdx = buffer.indexOf('[CONTEXT_PROGRESS]');
            const endIdx = buffer.indexOf('\n', startIdx);
            
            if (endIdx === -1) break; // Incomplete marker, wait for more data
            
            const progressLine = buffer.substring(startIdx + '[CONTEXT_PROGRESS]'.length, endIdx);
            buffer = buffer.substring(endIdx + 1);
            
            try {
              const progress = JSON.parse(progressLine);
              console.log('📊 [Context Progress]', progress);
              setContextProgress(prev => [...prev, progress]);
            } catch (e) {
              console.error('Failed to parse progress:', e, 'Line:', progressLine);
            }
          }
          
          // Remaining buffer is AI response content
          fullContent = buffer;
          updateStreamContent(fullContent);
        }
      } catch (err) {
        console.error("Error reading stream:", err);
      } finally {
        finishStreaming();
        
        // Update final content
        if (assistantMessageId) {
          messageState.updateMessage(assistantMessageId, { content: fullContent });
        }
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      // Rollback on error
      removeMessage(tempUserMessageId);
      removeMessage(tempAssistantMessageId);
    } finally {
      setIsSending(false);
    }
  }, [activeContext, sendMessage, messageState, startStreaming, updateStreamContent, finishStreaming, currentConversationId, replaceMessage, removeMessage]);

  // Track if we've processed a pending query to avoid re-processing
  const processedQueryRef = useRef(false);

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

  // ... (rest of the component)

  // ... (handleSubmit remains same)

  const handleStartEdit = useCallback((message: ChatMessage) => {
    if (isLoading) return;

    // Populate initial context from message references
    const initialContext: {
      type: "conversation" | "folder";
      id: string;
      title: string;
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

  const handleSaveEdit = async (newContent?: string, newFiles?: File[]) => {
    // Use passed content if available, otherwise fallback to state (for safety)
    const contentToEdit = newContent ?? editContent;
    
    if (!editingMessageId || isEditing || !contentToEdit.trim()) return;
    
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
    
    setIsEditing(true);
    
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
        undefined,
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
      setIsEditing(false);
      console.log('🏁 [handleSaveEdit] Edit operation complete');
    }
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (isLoading) return;
    setIsDeleting(messageId);
    try {
      await deleteMessageAction(messageId);
    } finally {
      setIsDeleting(null);
    }
  }, [isLoading, deleteMessageAction]);

  const handleBranchFromMessage = useCallback(async (messageId: string) => {
    if (isLoading) return;

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
      
      // ✅ PRESERVE OPTIMISTIC MESSAGES
      setMessages(prev => {
        const optimistic = prev.filter(m => m.id.startsWith('temp-'));
        
        // Deduplicate: Don't add optimistic messages if they (likely) exist in the loaded messages
        // This prevents "flash of duplicates" if server returns the message before we replace the temp one
        const uniqueOptimistic = optimistic.filter(opt => {
          const isDuplicate = filteredMessages.some(serverMsg => {
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
        return [...filteredMessages, ...uniqueOptimistic];
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
    if (isEditing) return;

    reloadMessages();
  }, [currentConversation?.id, currentConversation?.updatedAt, isEditing, reloadMessages]); // Reload when ID or timestamp changes

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
            <ChatContainerRoot className="h-full px-2 md:px-3 lg:px-4">
               <ChatContainerContent 
                 className="space-y-4 md:space-y-5 lg:space-y-6 px-0 sm:px-1 md:px-2 pt-6"
                 style={{ paddingBottom: `calc(20rem + ${keyboardHeight}px)` }}
               >
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
                  contextProgress={contextProgress}
                />
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
                {(editingMessageId ? editContext : activeContext).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary/70 px-3 py-1.5 rounded-full text-xs transition-colors"
                  >
                    {c.type === "folder" ? (
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
                ))}
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
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              isLoading={isLoading}
              isSubmittingEdit={isEditing}
              editMode={!!editingMessageId}
              initialValue={editContent}
              placeholder={
                !currentConversationId ? "Message..." : "Type a message..."
              }
              className={cn(
                "glass relative z-10 w-full rounded-3xl border border-border/50 transition-all duration-300",
                !currentConversationId ? "shadow-lg" : "shadow-sm hover:shadow-md"
              )}
              context={editingMessageId ? editContext : activeContext}
              onContextChange={editingMessageId ? setEditContext : handleContextChange}
              currentConversationId={currentConversationId}
              conversations={conversations}
              folders={folders}
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
  const { currentConversation } = useChatContext();
  
  return (

      <div className=" m-4 min-w-max absolute z-20 bg-muted rounded-lg">
        <SidebarTrigger size={'lg'} className="w-10 h-10"/>
      </div>
        
  );
}

export default function ChatPage() {
  return <FullChatApp />;
}
