"use client";

import { memo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PiSparkle, PiX } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  shouldShowUpgradePrompt,
  dismissUpgradePrompt,
} from "@/lib/utils/upgrade-prompt-cookie";

interface UpgradeFooterProps {
  className?: string;
}

/**
 * Compact inline upgrade prompt shown at the bottom of AI responses for free users.
 * Appears every 7 days (cookie-controlled) and is dismissible.
 * Checks session directly for subscription tier.
 */
export const UpgradeFooter = memo(function UpgradeFooter({
  className,
}: UpgradeFooterProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Wait for session to load
    if (status !== "authenticated") return;

    // Check if user is on free tier
    // @ts-ignore - custom session field
    const tier = session?.user?.subscriptionTier || "free";
    if (tier !== "free") return;

    // Check cookie for frequency control
    setIsVisible(shouldShowUpgradePrompt());
  }, [status, session]);

  const handleDismiss = () => {
    dismissUpgradePrompt();
    setIsVisible(false);
  };

  const handleUpgrade = () => {
    router.push("/subscription");
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "mt-3 flex items-center justify-between gap-3 px-3 py-2 rounded-lg",
        "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
        "border border-primary/20",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <PiSparkle className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground truncate">
          <span className="font-medium text-foreground">Enjoying rynk?</span>
          {" "}Upgrade for unlimited access
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
          onClick={handleUpgrade}
        >
          See Plans →
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <PiX className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
