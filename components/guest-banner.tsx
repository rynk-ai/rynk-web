"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserPlus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface GuestStatus {
  guestId: string;
  creditsRemaining: number;
  creditsLimit: number;
  messageCount: number;
}

export function GuestBanner() {
  const [guestStatus, setGuestStatus] = useState<GuestStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadGuestStatus();
  }, []);

  const loadGuestStatus = async () => {
    try {
      const response = await fetch("/api/guest/status");
      if (response.ok) {
        const data: GuestStatus = await response.json();
        setGuestStatus(data);
      }
    } catch (error) {
      console.error("Failed to load guest status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push("/login");
  };

  if (isLoading || !guestStatus) {
    return null;
  }

  const { creditsRemaining, creditsLimit, messageCount } = guestStatus;
  const progress = (creditsRemaining / creditsLimit) * 100;

  return (
    <Card className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              You're using rynk in guest mode
            </h3>
            <p className="text-sm text-muted-foreground">
              {creditsRemaining} of {creditsLimit} free messages remaining
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Credit Progress */}
          <div className="hidden sm:flex flex-col gap-1 min-w-[150px]">
            <Progress
              value={progress}
              className="h-2"
              // @ts-ignore
              indicatorClassName={
                progress < 20
                  ? "bg-red-500"
                  : progress < 50
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
            />
            <span className="text-xs text-muted-foreground text-right">
              {messageCount} messages sent
            </span>
          </div>

          {/* Sign Up Button */}
          <Button
            onClick={handleSignUp}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Sign up to continue
          </Button>
        </div>
      </div>

      {/* Mobile credit display */}
      <div className="sm:hidden mt-3 flex items-center justify-between">
        <Progress
          value={progress}
          className="flex-1 mr-3 h-2"
          // @ts-ignore
          indicatorClassName={
            progress < 20
              ? "bg-red-500"
              : progress < 50
              ? "bg-yellow-500"
              : "bg-green-500"
          }
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {creditsRemaining}/{creditsLimit} left
        </span>
      </div>
    </Card>
  );
}
