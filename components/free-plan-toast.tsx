"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PiSparkle, PiRocketLaunch } from "react-icons/pi";

/**
 * Component that shows an upgrade prompt toast for free plan users.
 * Shows on every page visit and persists for 20 seconds.
 */
export function FreePlanToast() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Wait until session is loaded
    if (status !== "authenticated" || !session?.user) return;

    // Check if user is on free plan
    // @ts-ignore - custom session field
    const tier = session.user.subscriptionTier || "free";
    
    if (tier !== "free") return;

    // Show toast after a small delay to not block initial render
    const timeoutId = setTimeout(() => {
      toast(
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <PiSparkle className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-primary">Upgrade for unlimited access</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get unlimited messages, priority support, and more features with our Standard plan.
            </p>
          </div>
        </div>,
        {
          duration: 20000, // 20 seconds
          position: "bottom-right",
          action: {
            label: "Upgrade",
            onClick: () => router.push("/subscription"),
          },
          icon: null,
          className: "!bg-background shadow-lg",
          closeButton: true,
        }
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [status, session, router]);

  // This component doesn't render anything visible
  return null;
}
