"use client";

import { AlertTriangle, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditWarningProps {
  credits: number;
  className?: string;
}

/**
 * Low Credit Warning Banner
 * Shows when user has 3 or fewer credits remaining
 */
export function CreditWarning({ credits, className }: CreditWarningProps) {
  const router = useRouter();

  // Only show when credits are 3 or less but greater than 0
  if (credits > 3 || credits <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 flex-shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Low credits remaining
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
          You have {credits} credit{credits !== 1 ? "s" : ""} left. Subscribe to get 2,500 credits!
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
        onClick={() => router.push("/subscription")}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Upgrade
      </Button>
    </div>
  );
}

interface NoCreditsOverlayProps {
  className?: string;
}

/**
 * No Credits Overlay
 * Shows when user has 0 credits - compact version that fits within input area
 */
export function NoCreditsOverlay({ className }: NoCreditsOverlayProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-2xl px-4",
        className
      )}
    >
      <div className="flex items-center gap-4 w-full max-w-lg">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 flex-shrink-0">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Out of credits</p>
          <p className="text-xs text-muted-foreground truncate">
            Subscribe for 2,500 credits at $5.99/mo
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={() => router.push("/subscription")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Subscribe
        </Button>
      </div>
    </div>
  );
}

interface InlineCreditIndicatorProps {
  credits: number | null;
  className?: string;
}

/**
 * Inline Credit Indicator
 * Compact badge-style indicator to show beside message actions
 * Shows when credits are low (1-3) or depleted (0)
 */
export function InlineCreditIndicator({ credits, className }: InlineCreditIndicatorProps) {
  const router = useRouter();

  // Don't show if credits is null (loading) or more than 3
  if (credits === null || credits > 3) return null;

  const isOutOfCredits = credits <= 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            onClick={() => router.push("/subscription")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
              isOutOfCredits
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20",
              className
            )}
          >
            {isOutOfCredits ? (
              <Coins className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isOutOfCredits ? "No credits" : `${credits} left`}
            </span>
            <span className="sm:hidden">
              {isOutOfCredits ? "0" : credits}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">
            {isOutOfCredits ? "Out of credits" : "Low credits"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOutOfCredits
              ? "Subscribe for 2,500 credits at $5.99/mo"
              : `You have ${credits} credit${credits !== 1 ? "s" : ""} left. Click to upgrade.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

