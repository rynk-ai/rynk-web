import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useGuestChatContext, useGuestStreamingContext, type GuestMessage } from "@/lib/hooks/guest-chat-context";
import { useMessageState, type MessageState } from "@/lib/hooks/use-message-state";
import { useMessageEdit } from "@/lib/hooks/use-message-edit";
import { useLatest } from "@/lib/hooks/use-latest";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { filterActiveVersions, filterActiveVersionsGeneric } from "@/lib/utils/filter-active-versions";
import type { CloudMessage as ChatMessage } from "@/lib/services/cloud-db";
import { detectSurfaces } from "@/lib/services/surface-detector";

interface UseGuestChatControllerProps {
  messageState: MessageState<GuestMessage>;
  editState: ReturnType<typeof useMessageEdit>;
}

export function useGuestChatController({
  messageState,
  editState,
}: UseGuestChatControllerProps) {
  const router = useRouter();

  // Chat Context
  const {
    currentConversationId,
    sendChatRequest,
    createConversation,
    editMessage,
    updateMessage,
    deleteMessage: deleteMessageAction,
    branchConversation,
    getMessageVersions,
    getMessages,
    reasoningMode,
    creditsRemaining,
    showUpgradeModal,
    setShowUpgradeModal,
    // Setters
    setStatusPills,
    setSearchResults,
  } = useGuestChatContext();

  // Streaming Context (Read-only values for UI, though we have them in main context too)
  const {
    statusPills,
    searchResults,
  } = useGuestStreamingContext();

  // Local State
  const [isSending, setIsSending] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Stream Handler
  const { 
    processStream, 
    abortStream,
    isStreaming,
    streamingMessageId,
    streamingContent
  } = useChatStream({
    onStatusUpdate: (pills) => setStatusPills(pills),
    onSearchResultsUpdate: (results) => setSearchResults(results),
  });

  // Refs for stable access
  const sendChatRequestRef = useLatest(sendChatRequest);
  const messageStateRef = useLatest(messageState);
  const replaceMessageRef = useLatest(messageState.replaceMessage);
  const removeMessageRef = useLatest(messageState.removeMessage);
  const statusPillsRef = useLatest(statusPills);
  const searchResultsRef = useLatest(searchResults);
  const processStreamRef = useLatest(processStream);

  // Ref for optimistic UI race condition protection
  const isCreatingConversationRef = useRef(false);

  // --- Handlers ---

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (creditsRemaining !== null && creditsRemaining <= 0) {
        setShowUpgradeModal(true);
        return;
      }

      setIsSending(true);

      // ✅ OPTIMISTIC UI
      const tempUserMessageId = crypto.randomUUID();
      const tempAssistantMessageId = crypto.randomUUID();
      const timestamp = Date.now();

      const optimisticUserMessage: GuestMessage = {
        id: tempUserMessageId,
        conversationId: currentConversationId || crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: new Date(timestamp).toISOString(),
        timestamp,
        versionNumber: 1, // Guest messages don't really have versions like Cloud
        versionOf: undefined
      };

      const optimisticAssistantMessage: GuestMessage = {
        id: tempAssistantMessageId,
        conversationId: currentConversationId || crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(timestamp + 1).toISOString(),
        timestamp: timestamp + 1,
        versionNumber: 1,
        versionOf: undefined
      };

      messageStateRef.current.addMessages([
        optimisticUserMessage,
        optimisticAssistantMessage,
      ]);

      try {
        isCreatingConversationRef.current = !currentConversationId;

        console.log("📨 [GuestController] Sending chat request...");
        const result = await sendChatRequestRef.current(
          text,
          undefined, // No attachments
          undefined, // No referenced convos
          undefined, // No referenced folders
          undefined,
          tempUserMessageId,
          tempAssistantMessageId
        );

        if (!result) {
          console.warn("⚠️ [GuestController] No result from sendChatRequest");
          removeMessageRef.current(tempUserMessageId);
          removeMessageRef.current(tempAssistantMessageId);
          setIsSending(false);
          return;
        }

        const {
          streamReader,
          conversationId,
          userMessageId,
          assistantMessageId,
        } = result;

        console.log("📦 [GuestController] Got result:", { conversationId, userMessageId, assistantMessageId });

        // Handle new conversation navigation
        if (!currentConversationId && conversationId) {
            console.log("🆕 [GuestController] New conversation created, navigating:", conversationId);
            isCreatingConversationRef.current = true;
            router.push(`/guest-chat?id=${encodeURIComponent(conversationId)}`);
        }

        // Replace optimistic messages with real ones
        if (userMessageId && userMessageId !== tempUserMessageId) {
          const realUserMessage = {
            ...optimisticUserMessage,
            id: userMessageId,
            conversationId,
            createdAt: optimisticUserMessage.createdAt || new Date().toISOString(), // Ensure string
          };
          replaceMessageRef.current(tempUserMessageId, realUserMessage);
        }

        if (assistantMessageId && assistantMessageId !== tempAssistantMessageId) {
          const realAssistantMessage = {
            ...optimisticAssistantMessage,
            id: assistantMessageId,
            conversationId,
            createdAt: optimisticAssistantMessage.createdAt || new Date().toISOString(), // Ensure string
          };
          replaceMessageRef.current(tempAssistantMessageId, realAssistantMessage);
        }

        // Process Stream
        console.log("📖 [GuestController] Starting to read stream");
        try {
          const fullContent = await processStreamRef.current(streamReader, assistantMessageId!);
          console.log("✅ [GuestController] Stream complete");

          if (assistantMessageId) {
            messageStateRef.current.updateMessage(assistantMessageId, {
              content: fullContent,
              reasoning_metadata: {
                statusPills: statusPillsRef.current,
                searchResults: searchResultsRef.current as any, // Cast for TS compatibility if needed
              },
            });
          }

          setIsSending(false);

          // Surface Detection
          if (assistantMessageId && fullContent && fullContent.length > 200) {
             detectSurfaces({
                content: fullContent,
                messageId: assistantMessageId,
                role: 'assistant',
                userQuery: text
            }).then(async (surfaces) => {
                if (surfaces && surfaces.length > 0) {
                    console.log('✨ [GuestController] Detected surfaces:', surfaces);
                     messageStateRef.current.updateMessage(assistantMessageId, {
                        reasoning_metadata: {
                             statusPills: statusPillsRef.current,
                             searchResults: searchResultsRef.current as any,
                             detectedSurfaces: surfaces
                        }
                    });
                     try {
                        await updateMessage(assistantMessageId, {
                            reasoning_metadata: {
                                detectedSurfaces: surfaces
                            }
                        });
                    } catch (err) {
                        console.error('❌ [GuestController] Failed to persist surfaces:', err);
                    }
                }
            });
          }

        } catch (err) {
          console.error("❌ [GuestController] Error reading stream:", err);
          setIsSending(false);
        }

      } catch (error) {
        console.error("❌ [GuestController] Error in submit:", error);
        toast.error("Failed to send message");
        setIsSending(false);
        removeMessageRef.current(tempUserMessageId);
        removeMessageRef.current(tempAssistantMessageId);
      }
    },
    [
        currentConversationId, 
        creditsRemaining, 
        setShowUpgradeModal, 
        router
    ]
  );

  const handleSaveEdit = useCallback(async (
    newContent?: string
  ) => {
    const { 
      editingMessageId, 
      editContent, 
      cancelEdit,
      setIsEditing
    } = editState;
    const { setMessages, setMessageVersions } = messageState;

    const contentToEdit = newContent ?? editContent;

    if (!editingMessageId || isSavingEdit || !contentToEdit.trim()) return;

    const messageIdToEdit = editingMessageId;
    const conversationId = currentConversationId;

    console.log("🔧 [GuestController] Starting edit:", { messageIdToEdit });
    setIsSavingEdit(true);

    try {
        cancelEdit();

        // 1. Create message version
        const result = await editMessage(
            messageIdToEdit,
            contentToEdit,
            undefined, // No attachments
            undefined, 
            undefined
        );

        if (!result?.newMessage) throw new Error("Failed to create message version");

        const newMessage = result.newMessage;
        
        // 2. Update local state
        const { messages: updatedMessages } = await getMessages(conversationId!);
        const filteredMessages = filterActiveVersionsGeneric(updatedMessages);
        setMessages(filteredMessages as any); // Cast effectively since generic matches structure

        const allVersions = await getMessageVersions(messageIdToEdit);
        setMessageVersions((prev) => {
            const updated = new Map(prev);
            updated.set(messageIdToEdit, allVersions);
            return updated;
        });

        // 3. Generate AI Response if needed
        const isEditedMessageLast = 
            newMessage && 
            filteredMessages[filteredMessages.length - 1]?.id === newMessage.id;

        if (isEditedMessageLast) {
             console.log("🤖 [GuestController] Generating AI response for edit");
             setStatusPills([{
                status: 'analyzing',
                message: 'Analyzing request...',
                timestamp: Date.now()
            }]);
            setSearchResults(null);

             const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: conversationId,
                    messageId: newMessage.id,
                    useReasoning: reasoningMode,
                    isGuest: true 
                }),
            });

            if (response.ok && response.body) {
                 const assistantMessageId = response.headers.get("X-Assistant-Message-Id");
                 if (assistantMessageId) {
                      const timestamp = Date.now();
                      const optimisticAssistant: GuestMessage = {
                        id: assistantMessageId,
                        conversationId: conversationId!,
                        role: "assistant",
                        content: "",
                        createdAt: new Date(timestamp).toISOString(),
                        timestamp,
                        versionNumber: 1,
                        versionOf: undefined
                      };

                      messageState.addMessages([optimisticAssistant]);
                      const reader = response.body.getReader();

                      try {
                        const fullContent = await processStreamRef.current(reader, assistantMessageId);
                         messageStateRef.current.updateMessage(assistantMessageId, {
                            content: fullContent,
                            reasoning_metadata: {
                                statusPills: statusPillsRef.current,
                                searchResults: searchResultsRef.current as any,
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

    } catch (error) {
        console.error("❌ [GuestController] Failed to save edit:", error);
         toast.error("Failed to save edit");
         // Revert
         try {
             const { messages: reverted } = await getMessages(conversationId!);
             setMessages(filterActiveVersionsGeneric(reverted).map(m => ({
               ...m,
               createdAt: typeof m.createdAt === 'number' ? new Date(m.createdAt).toISOString() : m.createdAt
             })) as any);
         } catch(e) {}
         setIsSavingEdit(false);
         setIsEditing(false);
    }
  }, [editState, isSavingEdit, currentConversationId, editMessage, getMessages, getMessageVersions, reasoningMode, messageState]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
      // Simplistic delete for guest
      const { messages, setMessageVersions } = messageState;
      setIsDeleting(messageId);
      try {
          // Find root
          const message = messages.find(m => m.id === messageId);
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
  }, [messageState, deleteMessageAction, getMessageVersions]);

  return {
    isSending,
    isSavingEdit,
    isDeleting,
    isCreatingConversationRef,
    handleSubmit,
    handleSaveEdit,
    handleDeleteMessage,
    streamingState: {
        isStreaming,
        streamingMessageId,
        streamingContent,
    }
  };
}
