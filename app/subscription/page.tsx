"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Loader2,
  MoveLeftIcon,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type Tier = "free" | "standard" | "standard_plus";

interface SubscriptionInfo {
  tier: Tier;
  status: "none" | "active" | "canceled" | "past_due";
  credits: number;
  carryoverCredits: number;
  creditsResetAt: string | null;
}

const tierConfig: any = {
  free: {
    name: "Free",
    price: 0,
    queries: 100,
    icon: Sparkles,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    features: [
      "100 queries per month",
      "Basic AI chat",
      "File uploads",
      "Credits reset monthly",
    ],
  },
  standard: {
    name: "Rynk+",
    price: 5.99,
    queries: 2500,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: [
      "2,500 queries per month",
      "Everything in Free",
      "Priority support",
      "Credits reset monthly (no rollover)",
    ],
  },
  // standard_plus: {
  //   name: 'Rynk++',
  //   price: 7.99,
  //   queries: 2500,
  //   icon: Crown,
  //   color: 'text-amber-500',
  //   bgColor: 'bg-amber-500/10',
  //   features: [
  //     '2,500 queries per month',
  //     'Everything in Standard',
  //     'Credits rollover each month',
  //     'Up to 10,000 accumulated credits'
  //   ]
  // }
};

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Tier | "extra" | null>(
    null,
  );

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/subscription/status")
        .then((res) => res.json() as Promise<SubscriptionInfo>)
        .then((data) => {
          setSubscription(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          toast.error("Failed to load subscription info");
        });
    }
  }, [session?.user?.id]);

  const handleUpgrade = async (tier: Tier | "extra") => {
    setCheckoutLoading(tier);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const formatResetDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          Please sign in to manage your subscription.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTier = subscription?.tier || "free";
  const currentConfig = tierConfig[currentTier];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/chat"
          className="flex items-center gap-1 border w-min px-3 py-1 rounded-lg hover:bg-muted-foreground/50"
        >
          <ArrowLeft className="font-thin h-4 w-4" />
          Chat
        </Link>
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your plan and usage
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="mb-12 rounded-2xl  p-8">
          {/* Usage Stats */}
          <div className="grid gap-6 sm:grid-cols-3 max-w-lg mx-auto">
            <div className="flex flex-col items-center p-4">
              <p className="text-sm text-muted-foreground">Credits Remaining</p>
              <p className="text-xl font-semibold">
                {subscription?.credits.toLocaleString() || 0}
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <p className="text-sm text-muted-foreground">Monthly Allowance</p>
              <p className="text-xl font-semibold">
                {currentConfig.queries.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <p className="text-sm text-muted-foreground">Next Reset</p>
              <p className="text-xl font-semibold">
                {formatResetDate(subscription?.creditsResetAt || null)}
              </p>
            </div>
          </div>

          {/* Extra Credits Button */}
          {/*{currentTier !== 'free' && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Need more credits?</p>
                  <p className="text-sm text-muted-foreground">Get 500 extra credits for $2</p>
                </div>
                <button
                  onClick={() => handleUpgrade('extra')}
                  disabled={checkoutLoading === 'extra'}
                  className="inline-flex items-center gap-2  bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {checkoutLoading === 'extra' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Buy Credits</>
                  )}
                </button>
              </div>
            </div>
          )}*/}
        </div>

        {/* Plan Comparison */}
        <h3 className="text-xl font-semibold mb-6">Available Plans</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {(Object.entries(tierConfig) as [Tier, typeof tierConfig.free][]).map(
            ([tier, config]) => {
              const isCurrentPlan = currentTier === tier;
              const TierIcon = config.icon;

              return (
                <div
                  key={tier}
                  className={`relative rounded-2xl p-6 ${
                    isCurrentPlan
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <h4 className="text-lg font-semibold">{config.name}</h4>
                  <p className="mt-1 text-3xl font-bold">
                    ${config.price}
                    {config.price > 0 && (
                      <span className="text-base font-normal text-muted-foreground">
                        /mo
                      </span>
                    )}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {config.features.map((feature: any, i: any) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 ${config.color}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrentPlan || checkoutLoading === tier}
                    className={`mt-6 w-full  px-4 py-2.5 text-sm font-medium transition-colors ${
                      isCurrentPlan
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    }`}
                  >
                    {checkoutLoading === tier ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : config.price > (tierConfig[currentTier]?.price || 0) ? (
                      "Upgrade"
                    ) : (
                      "Downgrade"
                    )}
                  </button>
                </div>
              );
            },
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Have questions? Contact us at support@rynk.io
        </p>
      </div>
    </div>
  );
}
