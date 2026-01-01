import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useChatContext, useStreamingContext } from "@/lib/hooks/chat-context";
import { useMessageState, type MessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
// import { useStreaming } from "@/lib/hooks/use-streaming"; // DEPRECATED
import { useIndexingQueue } from "@/lib/hooks/use-indexing-queue";
import { useLatest } from "@/lib/hooks/use-latest";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { filterActiveVersions } from "@/lib/utils/filter-active-versions";
import type { CloudMessage as ChatMessage } from "@/lib/services/cloud-db";
import {
  uploadFile as uploadFileAction,
  initiateMultipartUpload as initiateMultipartUploadAction,
  uploadPart as uploadPartAction,
  completeMultipartUpload as completeMultipartUploadAction,
} from "@/app/actions";
import { detectSurfaces } from "@/lib/services/surface-detector";

interface UseChatControllerProps {
  chatId?: string;
  surfaceMode: 'chat' | 'learning' | 'guide' | 'research';
  setSurfaceMode: (mode: 'chat' | 'learning' | 'guide' | 'research') => void;
  localContext: {
    type: "conversation" | "folder";
    id: string;
    title: string;
    status?: "loading" | "loaded";
  }[];
  setLocalContext: (context: any[]) => void;
  setQuotedMessage: (message: {
    messageId: string;
    quotedText: string;
    authorRole: "user" | "assistant";
  } | null) => void;
  messageState: MessageState<ChatMessage>;
  editState: ReturnType<typeof useMessageEdit>;
  routePrefix?: string;
  indexingState: ReturnType<typeof useIndexingQueue>; // Unified instance
}

export function useChatController({
  chatId,
  surfaceMode,
  setSurfaceMode,
  localContext,
  setLocalContext,
  setQuotedMessage,
  messageState,
  editState,
  routePrefix = "/chat",
  indexingState,
}: UseChatControllerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Chat Context
  const {
    currentConversationId,
    currentConversation,
    sendChatRequest,
    createConversation,
    editMessage,
    updateMessage,
    deleteMessage: deleteMessageAction,
    branchConversation,
    getMessageVersions,
    getMessages,
    reasoningMode,
    updateConversationTags,
    getAllTags,
    isLoading: contextIsLoading,
  } = useChatContext();

  // Streaming Context
  const {
    statusPills,
    searchResults,
    contextCards,
    setStatusPills,
    setSearchResults,
    setContextCards,
  } = useStreamingContext();

  // Local State
  const [isSending, setIsSending] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Refs for stable access in callbacks
  // Stream Handler
  const { 
    processStream, 
    abortStream,
    isStreaming,
    streamingMessageId,
    streamingContent
  } = useChatStream({
    onContentUpdate: (content) => {
        // No-op, managed by hook state
    },
    onStatusUpdate: (pills) => setStatusPills(pills),
    onSearchResultsUpdate: (results) => setSearchResults(results),
    onContextCardsUpdate: (cards) => setContextCards(cards || []),
    onFinish: (fullContent) => {
        // No-op, managed by hook/logic
    }
  });

  // Refs for stable access in callbacks
  const sendChatRequestRef = useLatest(sendChatRequest);
  const messageStateRef = useLatest(messageState);
  const startStreamingRef = useRef(() => {}); // Dummy ref or unused
  // const startStreamingRef = useLatest(streamingState.startStreaming); // REMOVED
  // updateStreamContentRef and finishStreamingRef are no longer needed directly in handlers thanks to hook callbacks
  const replaceMessageRef = useLatest(messageState.replaceMessage);
  const removeMessageRef = useLatest(messageState.removeMessage);
  const statusPillsRef = useLatest(statusPills);
  const searchResultsRef = useLatest(searchResults);
  const processStreamRef = useLatest(processStream);

  // File Upload & Indexing
  // Inherit from prop if available, otherwise create local instance (fallback)
  const localIndexingState = useIndexingQueue(); // Always call hook to be safe, but ignore if prop provided? 
  // Hooks must be called unconditionally.
  // We'll use the prop if provided, else local.
  // Ideally, useIndexingQueue should be a Context, but refactoring that is out of scope.
  const { enqueueFile, jobs } = indexingState || localIndexingState;
  const enqueueFileRef = useLatest(enqueueFile);

  // Helper: Wait for PDF indexing
  const jobsRef = useRef(jobs);
  
  // Keep jobs ref updated
  // Note: This relies on re-renders of the component using this hook
  if (jobs !== jobsRef.current) {
    jobsRef.current = jobs;
  }

  const waitForIndexing = useCallback((jobId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const job = jobsRef.current.find((j) => j.id === jobId);

        if (job?.status === "completed") {
          clearInterval(checkInterval);
          resolve();
        } else if (job?.status === "failed") {
          clearInterval(checkInterval);
          reject(new Error(job.error || "Indexing failed"));
        }
      }, 500);

      setTimeout(
        () => {
          clearInterval(checkInterval);
          reject(new Error("Indexing timeout"));
        },
        5 * 60 * 1000,
      );
    });
  }, []); // Empty dependency array as it uses ref
  
  const waitForIndexingRef = useLatest(waitForIndexing);

  // Ref for optimistic UI race condition protection
  const isCreatingConversationRef = useRef(false);

  // --- Handlers ---

  const handleSubmit = useCallback(
    async (text: string, files: File[]) => {
      if (!text.trim() && files.length === 0) return;

      setIsSending(true);

      // ✅ OPTIMISTIC UI: Create temp IDs and messages
      const tempUserMessageId = crypto.randomUUID();
      const tempAssistantMessageId = crypto.randomUUID();
      const timestamp = Date.now();

      const referencedConversationsList = localContext
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFoldersList = localContext
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
        content: "", // Empty content initially
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

      // Start streaming loading state
      // startStreaming(tempAssistantMessageId); // Handled by processStream later? 
      // Actually processStream sets isStreaming=true when called. 
      // But we might want optimistic "loading" state before stream starts?
      // useChatStream doesn't expose manual startStreaming easily without messageId
      // But processStream takes messageId. 
      // For now, isSending=true covers the "loading" UI state mostly.
      // But if we want the "stop" button to appear, we need isStreaming=true?
      // existing useStreaming just set a message ID.
      // Let's rely on isSending for the gap between submit and stream start.

      // Clear context and quote immediately
      setLocalContext([]);
      setQuotedMessage(null);

      try {
        // 1. Upload files & Start Indexing PARALLEL
        let uploadedAttachments: any[] = [];
        let effectiveConversationId = currentConversationId;

        if (files.length > 0) {
          const hasLargePDFs = files.some(
            (f) => f.type === "application/pdf" && f.size >= 500 * 1024,
          );

          if (hasLargePDFs && !effectiveConversationId) {
            console.log("🆕 [Controller] Creating new conversation for PDF indexing...");
            try {
              const newConversationId = await createConversation();
              effectiveConversationId = newConversationId;
              messageStateRef.current.updateMessage(tempUserMessageId, {
                conversationId: effectiveConversationId,
              });
              messageStateRef.current.updateMessage(tempAssistantMessageId, {
                conversationId: effectiveConversationId,
              });
              messageStateRef.current.updateMessage(tempAssistantMessageId, {
                conversationId: effectiveConversationId,
              });
              router.push(`${routePrefix}?id=${encodeURIComponent(newConversationId)}`);
            } catch (err) {
              console.error("❌ [Controller] Failed to create conversation:", err);
              throw err;
            }
          }

          const processingPromises = files.map(async (file) => {
            const isLargePDF =
              file.type === "application/pdf" && file.size >= 500 * 1024;

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
                  const part = await uploadPartAction(key, uploadId, i + 1, fd);
                  parts.push(part);
                }
                return await completeMultipartUploadAction(key, uploadId, parts);
              }
            })();

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

          const results = await Promise.all(processingPromises);
          const validResults = results.filter(Boolean) as any[];
          uploadedAttachments = validResults.map((r) => r.attachment);

          const indexingPromises = validResults
            .map((r) => r.indexingPromise)
            .filter(Boolean);
          if (indexingPromises.length > 0) {
            console.log(`⏳ [Controller] Waiting for ${indexingPromises.length} indexing jobs...`);
            await Promise.all(indexingPromises);
            console.log("✅ [Controller] Indexing complete");
          }
        }

        // 3. Send Chat Request
        isCreatingConversationRef.current = !currentConversationId;

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

        console.log("📦 [Controller] Got result from sendChatRequest", {
          conversationId,
          userMessageId,
          assistantMessageId,
        });

        if (
          !currentConversationId &&
          conversationId &&
          conversationId !== chatId
        ) {
          console.log("🆕 [Controller] New conversation created, navigating:", conversationId);
          
          if (surfaceMode !== 'chat') {
            console.log(`🎯 [Controller] Surface mode "${surfaceMode}" selected, navigating to surface`);
            const query = encodeURIComponent(text.slice(0, 500));
            // Surface routes are typically /surface/..., but for projects might be different?
            // Assuming surface routes are global for now, or we might need surfaceRoutePrefix too.
            // But let's stick to /surface for now as it seems global.
            router.push(`/surface/${surfaceMode}/${conversationId}?q=${query}`);
            setSurfaceMode('chat');
            return;
          } else {
            isCreatingConversationRef.current = true;
            router.push(`${routePrefix}?id=${encodeURIComponent(conversationId)}`);
          }
        }
        
        if (surfaceMode !== 'chat' && currentConversationId) {
            console.log(`🎯 [Controller] Surface mode "${surfaceMode}" selected mid-conversation, navigating to surface`);
            const targetConversationId = conversationId || currentConversationId;
            const query = encodeURIComponent(text.slice(0, 500));
            router.push(`/surface/${surfaceMode}/${targetConversationId}?q=${query}`);
            setSurfaceMode('chat');
            removeMessageRef.current(tempUserMessageId);
            removeMessageRef.current(tempAssistantMessageId);
            return;
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

        if (assistantMessageId && assistantMessageId !== tempAssistantMessageId) {
          const realAssistantMessage = {
            ...optimisticAssistantMessage,
            id: assistantMessageId,
            conversationId,
          };
          replaceMessageRef.current(tempAssistantMessageId, realAssistantMessage);
        }

        if (assistantMessageId) {
          // streamingState.updateStreamingMessageId(assistantMessageId);
          // handled by processStream
        }

        console.log("📖 [Controller] Starting to read stream");

        // ✅ TIMEOUT FIX: Ensure stream reading happens in the next tick
        // This prevents "Cannot update ChatProvider while rendering ChatContent" error
        // caused by synchronous state updates immediately following a navigation render
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
          const fullContent = await processStreamRef.current(streamReader, assistantMessageId!);
          console.log("✅ [Controller] Stream complete");
          
          // Persist the streamed content to local message state
          if (assistantMessageId) {
            messageStateRef.current.updateMessage(assistantMessageId, {
                content: fullContent,
                reasoning_metadata: {
                    statusPills: statusPillsRef.current,
                    searchResults: searchResultsRef.current,
                },
            });
          }
          
          setIsSending(false);

          // 🚀 Trigger Surface Detection (Background)
          if (assistantMessageId && fullContent && fullContent.length > 200) {
            // Determine user query for context
            const userQuery = text; 
            
            detectSurfaces({
                content: fullContent,
                messageId: assistantMessageId,
                role: 'assistant',
                userQuery: userQuery
            }).then(async (surfaces) => {
                if (surfaces && surfaces.length > 0) {
                    console.log('✨ [Controller] Detected surfaces:', surfaces);
                    
                    // 1. Update Local State
                    // We need to fetch fresh message state as refs might be stale? 
                    // No, messageStateRef is stable. But we need to find the message in the current list.
                    const currentMsg = messageStateRef.current.messages.find(m => m.id === assistantMessageId);
                    const currentMetadata = currentMsg?.reasoning_metadata || { 
                          statusPills: statusPillsRef.current, 
                          searchResults: searchResultsRef.current 
                    };
                    
                    const newMetadata = {
                        ...currentMetadata,
                        detectedSurfaces: surfaces
                    };

                    messageStateRef.current.updateMessage(assistantMessageId, {
                        reasoning_metadata: newMetadata
                    });

                    // 2. Persist to Server
                    try {
                        await updateMessage(assistantMessageId, {
                            reasoning_metadata: newMetadata
                        });
                    } catch (err) {
                        console.error('❌ [Controller] Failed to persist surfaces:', err);
                    }
                }
            });
          }
        } catch (err) {
          console.error("❌ [Controller] Error reading stream:", err);
          setIsSending(false);
        }
      } catch (error) {
        console.error("❌ [Controller] Error in submit:", error);
        toast.error("Failed to send message");
        setIsSending(false);
        removeMessageRef.current(tempUserMessageId);
        removeMessageRef.current(tempAssistantMessageId);
      }
    },
    [
      chatId,
      currentConversationId,
      localContext,
      reasoningMode,
      router,
      surfaceMode,
      setSurfaceMode,
      setLocalContext,
      setQuotedMessage,
      setStatusPills,
      setSearchResults,
      setContextCards,
      setSearchResults,
      setContextCards,
      // streamingState removed dep
    ]
  );

  const handleSaveEdit = useCallback(async (
    newContent?: string,
    newFiles?: (File | any)[],
  ) => {
    const { 
      editingMessageId, 
      editContent, 
      editAttachments, 
      editContext, 
      cancelEdit,
      setIsEditing
    } = editState;
    const { setMessages, setMessageVersions } = messageState;

    const contentToEdit = newContent ?? editContent;
    const attachmentsToEdit = newFiles ?? editAttachments;

    if (
      !editingMessageId ||
      isSavingEdit ||
      (!contentToEdit.trim() && attachmentsToEdit.length === 0)
    )
      return;

    const messageIdToEdit = editingMessageId;
    const contextToEdit = editContext;
    const conversationId = currentConversationId;

    console.log("🔧 [Controller] Starting edit:", {
      messageIdToEdit,
      conversationId,
    });

    setIsSavingEdit(true);

    try {
      const referencedConversations = contextToEdit
        .filter((c) => c.type === "conversation")
        .map((c) => ({ id: c.id, title: c.title }));

      const referencedFolders = contextToEdit
        .filter((c) => c.type === "folder")
        .map((c) => ({ id: c.id, name: c.title }));

      cancelEdit();

      console.log("💾 [Controller] Creating message version...");
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

      const newMessage = result.newMessage;
      console.log("✅ [Controller] New message created:", newMessage.id);

      // Fetch updated messages
      const { messages: updatedMessages } = await getMessages(conversationId!);
      const filteredMessages = filterActiveVersions(updatedMessages);
      setMessages(filteredMessages);

      // Update version map
      const rootId = messageIdToEdit;
      const allVersions = await getMessageVersions(rootId);
      
      setMessageVersions((prev) => {
        const updated = new Map(prev);
        updated.set(rootId, allVersions);
        return updated;
      });

      // Generate AI response if last message
      const isEditedMessageLast =
        newMessage &&
        filteredMessages[filteredMessages.length - 1]?.id === newMessage.id;

      if (isEditedMessageLast) {
        console.log("🤖 [Controller] Generating AI response for edit");
        
        setStatusPills([{
            status: 'analyzing',
            message: 'Analyzing request...',
            timestamp: Date.now()
        }]);
        setSearchResults(null);
        setContextCards([]);

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationId,
            messageId: newMessage.id,
            useReasoning: reasoningMode,
          }),
        });

        if (response.ok && response.body) {
           const assistantMessageId = response.headers.get("X-Assistant-Message-Id");
           if (assistantMessageId) {
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
             // streamingState.startStreaming(assistantMessageId); // Handled by processStream

             const reader = response.body.getReader();
             
             try {
                const fullContent = await processStreamRef.current(reader, assistantMessageId!);
                
                // Update final message state
                messageStateRef.current.updateMessage(assistantMessageId, {
                    content: fullContent,
                    reasoning_metadata: {
                        statusPills: statusPillsRef.current,
                        searchResults: searchResultsRef.current,
                    }
                });
             } catch (err) {
                 console.error("Error processing edit stream:", err);
             } finally {
                requestAnimationFrame(() => {
                   setIsSavingEdit(false);
                   setIsEditing(false);
                });
             }
           }
        } else {
           setIsSavingEdit(false);
           setIsEditing(false);
        }
      } else {
        setIsSavingEdit(false);
      }
    } catch (error: any) {
      console.error("❌ [Controller] Failed to save edit:", error);
      if (error?.message?.includes("Insufficient credits")) {
          toast.error("Insufficient credits", { description: "Please add more credits."});
      } else {
          toast.error("Failed to save edit");
      }
      
      // Revert attempt
      try {
         const { messages: reverted } = await getMessages(conversationId!);
         setMessages(filterActiveVersions(reverted));
      } catch (e) { console.error(e); }
      
      setIsSavingEdit(false);
      setIsEditing(false);
    }
  }, [editState, isSavingEdit, currentConversationId, editMessage, getMessages, getMessageVersions, reasoningMode, setStatusPills, setSearchResults, setContextCards, messageState]);


  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const { isEditing } = editState;
      const { messages, setMessageVersions } = messageState;
      
      if (isSending || isEditing) return;
      setIsDeleting(messageId);

      try {
        const message = messages.find((m) => m.id === messageId);
        const rootId = message ? message.versionOf || message.id : null;

        await deleteMessageAction(messageId);

        if (rootId) {
          const remainingVersions = await getMessageVersions(rootId);
          setMessageVersions((prev) => {
            const updated = new Map(prev);
            if (remainingVersions.length > 1) {
              updated.set(rootId, remainingVersions);
            } else {
              updated.delete(rootId);
            }
            return updated;
          });
        }
      } finally {
        setIsDeleting(null);
      }
    },
    [isSending, editState, messageState, deleteMessageAction, getMessageVersions]
  );

  const handleBranchFromMessage = useCallback(
    async (messageId: string) => {
      const { isEditing } = editState;
      if (isSending || isEditing) return;

      if (confirm("Create a new conversation from this point?")) {
        try {
          const newConversationId = await branchConversation(messageId);
          router.push(`${routePrefix}?id=${encodeURIComponent(newConversationId)}`);
        } catch (err) {
          console.error("Failed to branch conversation:", err);
        }
      }
    },
    [isSending, editState, branchConversation, router]
  );

  return {
    isSending,
    isSavingEdit,
    isDeleting,
    isCreatingConversationRef,
    handleSubmit,
    handleSaveEdit,
    handleDeleteMessage,
    handleBranchFromMessage,
    streamingState: {
        isStreaming,
        streamingMessageId,
        streamingContent,
    }
  };
}
