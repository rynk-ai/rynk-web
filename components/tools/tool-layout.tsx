"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PiInfinity, PiWarning } from "react-icons/pi";
import { useEffect, useState } from "react";
import { ToolId, TOOL_CONFIG, RateLimitResult } from "@/lib/tools/rate-limit";

interface ToolLayoutProps {
  toolId: ToolId;
  children: React.ReactNode;
  userLimitInfo?: RateLimitResult | null; 
}

export function ToolLayout({ toolId, children, userLimitInfo: initialLimitInfo }: ToolLayoutProps) {
  const config = TOOL_CONFIG[toolId];
  const [limitInfo, setLimitInfo] = useState<RateLimitResult | null>(initialLimitInfo || null);

  // Poll for limit updates if not provided or to keep fresh
  // Ideally this is passed from the page which fetches it server-side or via hook
  
  const formatResetTime = (resetAt?: string | Date) => {
    if (!resetAt) return "";
    const reset = new Date(resetAt);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    
    if (diffMins <= 0) return "now";
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.ceil(diffMins / 60)} hr`;
  };

  const isUnlimited = !limitInfo?.isGuest; // Users are "unlimited" in terms of daily cap, but have credits. 
  // Wait, users have credits. So "Unlimited" icon might be misleading if they run out of credits.
  // For users, show "Credits: X". For guests, show "X free left".

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full">
      {/* Top Promo Banner */}
      <div className="w-full bg-foreground">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm">
          <span className="text-background/80">Want more AI tools?</span>
          <Link href="/" className="text-background hover:underline font-medium">
            Try Rynk AI →
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className=" bg-background sticky top-0 z-50 w-full max-w-7xl mx-auto">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-normal">rynk</span>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-muted-foreground font-normal hidden sm:inline">{config.name.toLowerCase()}</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {limitInfo && (
              !limitInfo.isGuest ? (
                // Authenticated User
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-accent">
                   <span className="font-medium">{limitInfo.remaining}</span> credits
                </span>
              ) : (
                // Guest
                <span className={cn(
                  "text-xs sm:text-sm",
                  limitInfo.remaining === 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {limitInfo.remaining === 0 
                    ? `Resets ${formatResetTime(limitInfo.resetAt)}`
                    : `${limitInfo.remaining} free left`
                  }
                </span>
              )
            )}

            {limitInfo?.isGuest && (
              <Link href={`/login?callbackUrl=/tools/${toolId}`}>
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-3 sm:px-4 py-4 sm:py-6 w-full max-w-7xl mx-auto flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto mt-auto">
        <div className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <span>
            {limitInfo?.isGuest 
              ? `${config.guestDailyLimit} free / day` 
              : "Standard Plan"}
          </span>
          {limitInfo?.isGuest && (
            <Link href={`/login?callbackUrl=/tools/${toolId}`} className="text-accent hover:underline">
              Get more credits →
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
