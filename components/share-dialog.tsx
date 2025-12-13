"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  Check, 
  Loader2, 
  Link2, 
  Eye, 
  Users, 
  Trash2,
  ExternalLink,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  conversationTitle?: string;
}

interface ShareData {
  id: string;
  conversationId: string;
  title: string;
  isActive: boolean;
  viewCount: number;
  cloneCount: number;
  createdAt: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  conversationId,
  conversationTitle,
}: ShareDialogProps) {
  const [share, setShare] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check for existing share when dialog opens
  useEffect(() => {
    if (!open || !conversationId) return;

    async function checkExistingShare() {
      setLoading(true);
      try {
        const res = await fetch("/api/share");
        const json = await res.json() as { shares?: ShareData[]; error?: string };

        if (res.ok && json.shares) {
          const existing = json.shares.find(
            (s: ShareData) => s.conversationId === conversationId && s.isActive
          );
          if (existing) {
            setShare(existing);
          }
        }
      } catch (err) {
        console.error("Failed to check existing share:", err);
      } finally {
        setLoading(false);
      }
    }

    checkExistingShare();
  }, [open, conversationId]);

  const handleCreateShare = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const json = await res.json() as { share?: ShareData; error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Failed to create share link");
      }

      setShare(json.share || null);
      toast.success("Share link created!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const handleCopyLink = useCallback(() => {
    if (!share) return;

    const url = `${window.location.origin}/share/${share.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    
    setTimeout(() => setCopied(false), 2000);
  }, [share]);

  const handleDeleteShare = useCallback(async () => {
    if (!share) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/share/${share.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to revoke share link");
      }

      setShare(null);
      toast.success("Share link revoked");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }, [share]);

  const shareUrl = share ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.id}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            {share 
              ? "Anyone with this link can view this conversation and clone it to their account."
              : "Create a public link to share this conversation with anyone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : share ? (
            <>
              {/* Share Link */}
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-sm bg-muted"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {share.viewCount} views
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {share.cloneCount} clones
                </span>
              </div>

              {/* Revoke Button */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteShare}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Revoke Share Link
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview info */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {conversationTitle || "This conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anyone with the link can view this conversation. They can also clone it to continue chatting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Create Share Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
