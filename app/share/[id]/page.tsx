"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { Loader } from "@/components/ui/loader";
import { 
  Copy, 
  Loader2, 
  Share2, 
  LogIn, 
  MessageSquare,
  Clock,
  Eye,
  Users,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SharedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  reasoning_metadata?: any;
}

interface ShareData {
  share: {
    id: string;
    title: string;
    viewCount: number;
    cloneCount: number;
    createdAt: string;
  };
  conversation: {
    title: string;
    tags: string[];
    surfaceStates?: Record<string, any>;
    createdAt: number;
  };
  messages: SharedMessage[];
}

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [shareId, setShareId] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const autoCloneTriggered = useRef(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setShareId(p.id));
  }, [params]);

  // Fetch share data
  useEffect(() => {
    if (!shareId) return;

    async function fetchShare() {
      try {
        const res = await fetch(`/api/share/${shareId}`);
        const json = await res.json() as ShareData & { error?: string };

        if (!res.ok) {
          setError(json.error || "Failed to load shared conversation");
          return;
        }

        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load shared conversation");
      } finally {
        setLoading(false);
      }
    }

    fetchShare();
  }, [shareId]);

  const handleClone = useCallback(async () => {
    if (!shareId) return;

    setCloning(true);
    try {
      const res = await fetch(`/api/share/${shareId}/clone`, {
        method: "POST",
      });
      const json = await res.json() as { conversationId?: string; error?: string };

      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated - redirect to login with action=clone to auto-trigger after auth
          toast.info("Please sign in to clone this conversation");
          router.push(`/login?callbackUrl=${encodeURIComponent(`/share/${shareId}?action=clone`)}`);
          return;
        }
        throw new Error(json.error || "Failed to clone conversation");
      }

      toast.success("Conversation cloned to your account!");
      // Invalidate conversations cache so sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat?id=${json.conversationId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCloning(false);
    }
  }, [shareId, router, queryClient]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  }, []);

  // Auto-trigger clone when returning from login with action=clone
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "clone" && !loading && data && !autoCloneTriggered.current) {
      autoCloneTriggered.current = true;
      // Clear the action from URL to prevent re-triggering on refresh
      router.replace(`/share/${shareId}`, { scroll: false });
      handleClone();
    }
  }, [searchParams, loading, data, shareId, router, handleClone]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8" />
          <p className="text-muted-foreground">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Share2 className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold mb-2">Unable to Load</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-semibold text-lg line-clamp-1">
                {data.conversation.title || "Shared Conversation"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Link</span>
            </Button>
            <Button
              size="sm"
              onClick={handleClone}
              disabled={cloning}
              className="gap-2"
            >
              {cloning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>Clone & Continue</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {data.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "user" ? (
                <div className="max-w-[85%] bg-secondary/60 rounded-2xl px-5 py-3">
                  <p className="text-foreground whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-3xl">
                  <Markdown className="!bg-transparent !p-0 !text-foreground">
                    {message.content}
                  </Markdown>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tags */}
        {data.conversation.tags && data.conversation.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              {data.conversation.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary/90 rounded-md border border-primary/20"
                >
                  <span className="text-primary/60">#</span>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clone CTA */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-semibold mb-1">
                Continue this conversation
              </h2>
              <p className="text-sm text-muted-foreground">
                Clone this conversation to your account and keep chatting with AI.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleClone}
              disabled={cloning}
              className="gap-2 shrink-0"
            >
              {cloning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Clone to My Account
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Shared via{" "}
            <a href="/" className="text-primary hover:underline">
              rynk.io
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
