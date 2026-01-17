"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PiLightningFill, PiLockKey } from "react-icons/pi";
import { Progress } from "@/components/ui/progress";
import { useContext } from "react";
import { ToolLimitContext } from "./tool-layout";

interface ConversionBannerProps {
  currentUsage?: number;
  maxLimit?: number;
  isGuest?: boolean;
  toolName?: string;
}

export function ConversionBanner({ 
  currentUsage: propUsage, 
  maxLimit: propMax, 
  isGuest: propIsGuest, 
  toolName: propToolName 
}: ConversionBannerProps) {
  const context = useContext(ToolLimitContext);

  // Fallback or override logic
  // If context exists, use it. Props override context if strictly provided.
  
  let currentUsage = propUsage;
  let maxLimit = propMax;
  let isGuest = propIsGuest;
  let toolName = propToolName;

  if (context) {
    if (context.limitInfo) {
      if (maxLimit === undefined) maxLimit = context.config.guestDailyLimit;
      if (currentUsage === undefined) currentUsage = (maxLimit ?? 0) - context.limitInfo.remaining;
      if (isGuest === undefined) isGuest = context.limitInfo.isGuest;
    }
    if (toolName === undefined) toolName = context.config.name;
  }
  
  // Defaults if still undefined
  if (currentUsage === undefined) currentUsage = 0;
  if (maxLimit === undefined) maxLimit = 5;
  if (isGuest === undefined) isGuest = true;
  if (toolName === undefined) toolName = "this tool";

  const remaining = Math.max(0, maxLimit - currentUsage);
  const percentage = Math.min(100, (currentUsage / maxLimit) * 100);
  
  // Don't show if user has plenty of credits left (e.g. < 40% used)
  // AND it's not strictly 0 remaining (in case they just hit limit)
  if (percentage < 40 && remaining > 0) return null;

  return (
    <div className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                {remaining === 0 ? (
                  <>
                    <PiLockKey className="w-5 h-5 text-amber-500" />
                    Daily limit reached
                  </>
                ) : (
                  <>
                    <PiLightningFill className="w-5 h-5 text-amber-500" />
                    Running low on free credits
                  </>
                )}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {remaining === 0 
                  ? `You've used all ${maxLimit} free uses for ${toolName} today.` 
                  : `You have ${remaining} free uses left for today.`}
              </p>
            </div>
            {isGuest && (
              <Link href={`/login?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}>
                <Button size="sm" variant={remaining === 0 ? "default" : "secondary"} className="whitespace-nowrap">
                  {remaining === 0 ? "Unlock More" : "Get 50/day Free"}
                </Button>
              </Link>
            )}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Usage Today</span>
              <span className={remaining === 0 ? "text-amber-500" : ""}>{currentUsage} / {maxLimit}</span>
            </div>
            <Progress value={percentage} className="h-2 bg-secondary" indicatorClassName="bg-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

