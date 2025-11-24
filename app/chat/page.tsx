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
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";

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
  const {
    sendMessage,
    currentConversation,
    currentConversationId,
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
  
  // Destructure for convenience
  const { messages, setMessages, messageVersions, setMessageVersions } = messageState;
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

  // Local context state (used ONLY for new conversations)
  const [localContext, setLocalContext] = useState<
    { type: "conversation" | "folder"; id: string; title: string }[]
  >([]);

  // Derived active context (source of truth) - optimized with better dependencies
  const activeContext = useMemo(() => {
    if (currentConversationId) {
      const ctx: { type: "conversation" | "folder"; id: string; title: string }[] = [];
      
      currentConversation?.activeReferencedConversations?.forEach(c => {
        ctx.push({ type: "conversation", id: c.id, title: c.title });
      });
      
      currentConversation?.activeReferencedFolders?.forEach(f => {
        ctx.push({ type: "folder", id: f.id, title: f.name });
      });
      
      return ctx;
    }
    return localContext;
  }, [
    currentConversationId,
    // Use JSON.stringify to prevent re-computation on reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(currentConversation?.activeReferencedConversations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(currentConversation?.activeReferencedFolders),
    localContext
  ]);

  // Reset local context when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      setLocalContext([]);
    }
  }, [currentConversationId]);

  const handleContextChange = useCallback(async (newContext: typeof localContext) => {
    if (currentConversationId) {
      const conversationRefs = newContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));
      const folderRefs = newContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      await setConversationContext(currentConversationId, conversationRefs, folderRefs);
    } else {
      setLocalContext(newContext);
    }
  }, [currentConversationId, setConversationContext]);

  const handleSubmit = useCallback(async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);

    try {
      const referencedConversations = activeContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFolders = activeContext
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      const result = await sendMessage(
        text,
        files,
        referencedConversations,
        referencedFolders
      );

      if (!result) return;

      const { streamReader, conversationId, userMessageId, assistantMessageId } = result;

      // Optimistically add messages using returned IDs
      if (userMessageId && assistantMessageId) {
        const timestamp = Date.now();
        
        const optimisticUserMessage: ChatMessage = {
          id: userMessageId,
          conversationId,
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
          id: assistantMessageId,
          conversationId,
          role: 'assistant',
          content: '',
          createdAt: timestamp,
          timestamp,
          userId: '',
          versionNumber: 1
        };

        messageState.addMessages([optimisticUserMessage, optimisticAssistantMessage]);
        startStreaming(assistantMessageId);
      }

      // Read the stream with throttling
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
        finishStreaming();
        
        // Update final content
        if (assistantMessageId) {
          messageState.updateMessage(assistantMessageId, { content: fullContent });
        }
      }

    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  }, [activeContext, sendMessage, messageState, startStreaming, updateStreamContent, finishStreaming]);

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
      setMessages(filteredMessages);

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
    <main className="flex h-full flex-col overflow-hidden relative">

      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Top Section: Messages & Title */}
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* Title for New Chat - Fades out when conversation starts */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out pointer-events-none",
              !currentConversationId 
                ? "opacity-100 translate-y-0 pb-32" 
                : "opacity-0 -translate-y-10 pb-32"
            )}
          >
            <TextShimmer
              spread={5}
      duration={4} className="text-3xl md:text-4xl lg:text-7xl font-bold tracking-tighter text-foreground/70 mb-10 leading-24">
              simplychat.
            </TextShimmer>
          </div>

          {/* Messages Container - Fades in/Visible when conversation active */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-in-out",
              currentConversationId ? "opacity-100 z-10" : "opacity-0 -z-10"
            )}
          >
            <ChatContainerRoot className="h-full px-3 md:px-4 lg:px-6">
               <ChatContainerContent className="space-y-6 md:space-y-8 lg:space-y-10 px-0 sm:px-2 md:px-4 pt-7 pb-96">
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
              </ChatContainerContent>
            </ChatContainerRoot>
          </div>
        </div>

        {/* Input Section - Always rendered, absolute positioned at bottom */}
        <div className={cn(
          "absolute left-0 right-0 w-full transition-all duration-500 ease-in-out z-20",
          !currentConversationId 
            ? "bottom-3/7 translate-y-1/2" 
            : "bottom-4 translate-y-0"
        )}>
          {/* Background for input section */}
          <div className="relative w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pb-safe-bottom pt-4">
            {activeContext.length > 0 && (
              <div
                className={cn(
                  "mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2 px-0 md:px-1 transition-all duration-500 justify-start"
                )}
              >
                {activeContext.map((c, i) => (
                  <div
                    key={i}
                    className="z-20 group flex items-center gap-1 md:gap-1.5 bg-secondary hover:bg-secondary/15 pl-2 md:pl-2.5 pr-1 md:pr-1.5 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs  border-secondary/20 transition-all duration-200 "
                  >
                    {c.type === "folder" ? (
                      <FolderIcon className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-2.5 w-2.5 md:h-3 md:w-3 text-secondary" />
                    )}
                    <span className="font-medium text-foreground max-w-[80px] md:max-w-[120px] truncate">
                      {c.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3.5 w-3.5 md:h-4 md:w-4 ml-0.5 rounded-full hover:bg-background/80 hover:text-destructive opacity-70 group-hover:opacity-100 transition-all"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleContextChange(
                          activeContext.filter((_, idx) => idx !== i)
                        );
                      }}
                    >
                      <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="z-20 h-6 md:h-7 px-2 text-[10px] md:text-xs text-muted-foreground hover:text-foreground hover:bg-background/50 z-20"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleContextChange([]);
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
                "glass relative z-10 w-full rounded-2xl md:rounded-3xl border border-border/50 p-0 transition-all duration-500",
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
    <ChatProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <ChatHeader />
          <ChatContent />
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
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
