"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { GuestBanner } from "@/components/guest-banner";
import { GuestUpgradeModal } from "@/components/guest-upgrade-modal";
import { useGuestChat } from "@/lib/hooks/use-guest-chat";
import { useGuestSession } from "@/lib/hooks/use-guest-session";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  MessageSquare,
  Folder as FolderIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  attachments?: any[];
}

export function GuestChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { guestId, isGuest } = useGuestSession();
  const {
    conversations,
    folders,
    creditsRemaining,
    setCreditsRemaining,
    createConversation,
    sendMessage,
    loadCredits,
  } = useGuestChat();

  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [localContext, setLocalContext] = useState<any[]>([]);
  const [quotedMessage, setQuotedMessage] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Initialize guest session
  useEffect(() => {
    if (!isGuest || !guestId) {
      router.push("/chat");
    }
  }, [isGuest, guestId, router]);

  const handleSubmit = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;
    if (!guestId || creditsRemaining === null) return;

    // Check credits
    if (creditsRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setIsLoading(true);

    // Get or create conversation ID
    let effectiveConversationId = currentConversationId;
    if (!effectiveConversationId) {
      effectiveConversationId = await createConversation();
      if (effectiveConversationId) {
        setCurrentConversationId(effectiveConversationId);
      }
    }

    if (!effectiveConversationId) {
      setIsLoading(false);
      toast.error("Failed to create conversation");
      return;
    }

    // Add user message immediately (optimistic update)
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    const timestamp = Date.now();

    const userMessage: GuestMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      createdAt: timestamp,
      attachments: files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
    };

    const assistantMessage: GuestMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: timestamp + 1,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setLocalContext([]);
    setQuotedMessage(null);

    try {
      const response = await sendMessage(
        text,
        effectiveConversationId,
        files.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        localContext
          .filter((c) => c.type === "conversation")
          .map((c) => ({ id: c.id, title: c.title })),
        localContext
          .filter((c) => c.type === "folder")
          .map((c) => ({ id: c.id, name: c.title })),
      );

      if (!response) {
        throw new Error("No response");
      }

      // Check for credits exceeded
      if (response.status === 403) {
        const error: any = await response.json();
        if (error.error === "GUEST_CREDITS_EXCEEDED") {
          setMessages((prev) => prev.slice(0, -2));
          setShowUpgradeModal(true);
          return;
        }
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent }
              : msg,
          ),
        );
      }

      // Update credits
      const newCreditsRemaining = response.headers.get(
        "X-Guest-Credits-Remaining",
      );
      if (newCreditsRemaining) {
        setCreditsRemaining(parseInt(newCreditsRemaining, 10));
      } else {
        setCreditsRemaining((prev: number | null) =>
          prev !== null ? prev - 1 : null
        );
      }

      // If credits are now 0, show upgrade modal
      const remainingAfterResponse = newCreditsRemaining
        ? parseInt(newCreditsRemaining, 10)
        : creditsRemaining - 1;

      if (remainingAfterResponse <= 0) {
        setTimeout(() => {
          setShowUpgradeModal(true);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);

      if (error.message === "GUEST_CREDITS_EXCEEDED") {
        setShowUpgradeModal(true);
      } else {
        toast.error("Failed to send message", {
          description: error.message || "Please try again.",
        });
      }

      setMessages((prev) => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const handleQuote = useCallback(
    (text: string, messageId: string, role: "user" | "assistant") => {
      setQuotedMessage({ messageId, quotedText: text, authorRole: role });
    },
    [],
  );

  const handleClearQuote = useCallback(() => {
    setQuotedMessage(null);
  }, []);

  return (
    <main className="flex h-full flex-col overflow-hidden relative">
      {/* Guest Banner */}
      <GuestBanner />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto w-full relative">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-24">
            <TextShimmer
              spread={5}
              duration={4}
              className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground/80 mb-10 leading-tight animate-in-up"
            >
              rynk.
            </TextShimmer>
            <p className="text-muted-foreground text-lg text-center max-w-md">
              Try rynk's AI chat for free! Ask anything - no signup required.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <span>✨</span>
              <span>Full features included</span>
              <span>•</span>
              <span>{creditsRemaining ?? 5} messages free</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative h-full flex flex-col px-4 md:px-6 lg:px-8">
          {messages.length > 0 && (
            <div className="flex-1 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="flex-1">
                    <div className="rounded-lg p-2 text-foreground bg-secondary prose break-words whitespace-normal">
                      {message.content}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {message.attachments.length} attachment(s)
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto px-4 pb-6 pt-4">
        {/* Context Badges */}
        {localContext.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5 transition-all duration-300 justify-start">
            {localContext.map((c, i) => (
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
                  onClick={() => {
                    setLocalContext((prev) =>
                      prev.filter((_, idx) => idx !== i),
                    );
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
              onClick={() => setLocalContext([])}
            >
              Clear all
            </Button>
          </div>
        )}

        <PromptInputWithFiles
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask anything..."
          disabled={
            isLoading || (creditsRemaining !== null && creditsRemaining <= 0)
          }
          context={localContext}
          onContextChange={setLocalContext}
          quotedMessage={quotedMessage}
          onClearQuote={handleClearQuote}
          className="pb-4"
        />

        {/* New Chat Button */}
        {messages.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              New chat
            </Button>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <GuestUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        guestConversationData={{
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          messageCount: Math.ceil(messages.length / 2),
        }}
      />
    </main>
  );
}
