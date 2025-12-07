"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, UserPlus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface GuestUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestConversationData?: {
    messages: Array<{ role: string; content: string }>;
    messageCount: number;
  };
}

export function GuestUpgradeModal({
  open,
  onOpenChange,
  guestConversationData,
}: GuestUpgradeModalProps) {
  const router = useRouter();

  const handleSignUp = () => {
    onOpenChange(false);
    router.push("/login");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl">
              Guest credits exhausted
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            You've used all 5 free messages in guest mode. Sign up now to:
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Benefits list */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Continue this conversation</p>
                <p className="text-sm text-muted-foreground">
                  Keep your chat history and never lose context
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">95 more free messages</p>
                <p className="text-sm text-muted-foreground">
                  Start with 100 total free credits
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Unlimited features</p>
                <p className="text-sm text-muted-foreground">
                  File uploads, context picker, sub-chats, and more
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Fast AI responses</p>
                <p className="text-sm text-muted-foreground">
                  Powered by Groq's lightning-fast inference
                </p>
              </div>
            </div>
          </div>

          {/* Conversation preview */}
          {guestConversationData && guestConversationData.messageCount > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">Your guest conversation:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {guestConversationData.messages.slice(0, 3).map((msg, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="font-medium text-foreground">
                      {msg.role === "assistant" ? "AI" : "You"}:
                    </span>
                    <span className="line-clamp-2">
                      {msg.content.substring(0, 100)}
                      {msg.content.length > 100 ? "..." : ""}
                    </span>
                  </div>
                ))}
                {guestConversationData.messageCount > 3 && (
                  <p className="text-xs text-muted-foreground italic">
                    ...and {guestConversationData.messageCount - 3} more messages
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <Button
            onClick={handleSignUp}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Sign up to continue chatting
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
