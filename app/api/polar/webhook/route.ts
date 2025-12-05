import { NextRequest, NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

// Polar.sh webhook secret from environment
const getWebhookSecret = () => {
  return process.env.POLAR_WEBHOOK_SECRET;
};

// Get D1 database binding
const getDB = (): D1Database => {
  return getCloudflareContext().env.DB;
};

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      console.error("❌ [Polar Webhook] POLAR_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const body = await request.text();
    const webhookHeaders = {
      "webhook-id": request.headers.get("webhook-id") || "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
      "webhook-signature": request.headers.get("webhook-signature") || "",
    };

    // Validate webhook signature using Polar SDK
    let event: any;

    try {
      event = validateEvent(body, webhookHeaders, webhookSecret);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error(
          "❌ [Polar Webhook] Signature verification failed:",
          error.message,
        );
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
      throw error;
    }

    console.log("✅ [Polar Webhook] Received event:", event.type);

    const db = getDB();

    // Handle different event types
    switch (event.type) {
      case "checkout.created":
        console.log("📦 [Polar Webhook] Checkout started:", event.data.id);
        break;

      case "order.paid":
        await handleOrderPaid(db, event.data);
        break;

      case "subscription.created":
        await handleSubscriptionCreated(db, event.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(db, event.data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(db, event.data);
        break;

      case "subscription.revoked":
        await handleSubscriptionRevoked(db, event.data);
        break;

      case "customer.state_changed":
        console.log("ℹ️ [Polar Webhook] Customer state changed:", event.data);
        break;

      default:
        console.log("ℹ️ [Polar Webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ [Polar Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// Handle one-time purchases (Extra Credit Packs)
async function handleOrderPaid(db: D1Database, order: any) {
  console.log("💰 [Polar Webhook] Order paid:", order.id);

  const customerId = order.customerId;
  const productId = order.productId;

  // Find user by Polar customer ID
  const user = await db
    .prepare("SELECT id, credits FROM users WHERE polarCustomerId = ?")
    .bind(customerId)
    .first();

  if (!user) {
    console.error(
      "❌ [Polar Webhook] User not found for customer:",
      customerId,
    );
    return;
  }

  // Check if this is an extra credits pack (you'll need to set this product ID in env)
  const extraCreditsProductId = process.env.POLAR_EXTRA_CREDITS_PRODUCT_ID;

  if (productId === extraCreditsProductId) {
    // Add 500 credits for extra pack
    await db
      .prepare(
        "UPDATE users SET credits = credits + 500, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(user.id)
      .run();
    console.log("✅ [Polar Webhook] Added 500 credits to user:", user.id);
  }
}

// Handle new subscription creation
async function handleSubscriptionCreated(db: D1Database, subscription: any) {
  console.log("🎉 [Polar Webhook] Subscription created:", subscription.id);

  const customerId = subscription.customerId;
  const productId = subscription.productId;

  // Determine tier based on product ID
  const tier = getTierFromProductId(productId);
  const credits = tier === "standard" || tier === "standard_plus" ? 2500 : 100;

  // Calculate next reset date (1 month from now)
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);

  // Find or create user by customer email
  const customer = subscription.customer;
  let user = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(customer.email)
    .first();

  if (user) {
    // Update existing user
    await db
      .prepare(
        `
      UPDATE users SET
        subscriptionTier = ?,
        polarCustomerId = ?,
        polarSubscriptionId = ?,
        subscriptionStatus = 'active',
        credits = ?,
        creditsResetAt = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      )
      .bind(
        tier,
        customerId,
        subscription.id,
        credits,
        nextResetDate.toISOString(),
        user.id,
      )
      .run();

    console.log("✅ [Polar Webhook] Updated user subscription:", user.id, tier);
  } else {
    console.error(
      "❌ [Polar Webhook] User not found for email:",
      customer.email,
    );
  }
}

// Handle subscription updates (plan changes)
async function handleSubscriptionUpdated(db: D1Database, subscription: any) {
  console.log("🔄 [Polar Webhook] Subscription updated:", subscription.id);

  const productId = subscription.productId;
  const tier = getTierFromProductId(productId);

  await db
    .prepare(
      `
    UPDATE users SET
      subscriptionTier = ?,
      subscriptionStatus = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE polarSubscriptionId = ?
  `,
    )
    .bind(tier, subscription.status, subscription.id)
    .run();

  console.log("✅ [Polar Webhook] Updated subscription tier to:", tier);
}

// Handle subscription cancellation (end of billing period)
async function handleSubscriptionCanceled(db: D1Database, subscription: any) {
  console.log("❌ [Polar Webhook] Subscription canceled:", subscription.id);

  // Mark as canceled but don't downgrade yet - they keep access until period ends
  await db
    .prepare(
      `
    UPDATE users SET
      subscriptionStatus = 'canceled',
      updatedAt = CURRENT_TIMESTAMP
    WHERE polarSubscriptionId = ?
  `,
    )
    .bind(subscription.id)
    .run();

  console.log("✅ [Polar Webhook] Marked subscription as canceled");
}

// Handle subscription revocation (immediate end)
async function handleSubscriptionRevoked(db: D1Database, subscription: any) {
  console.log("🚫 [Polar Webhook] Subscription revoked:", subscription.id);

  // Immediately downgrade to free tier
  await db
    .prepare(
      `
    UPDATE users SET
      subscriptionTier = 'free',
      subscriptionStatus = 'none',
      polarSubscriptionId = NULL,
      credits = 100,
      carryoverCredits = 0,
      updatedAt = CURRENT_TIMESTAMP
    WHERE polarSubscriptionId = ?
  `,
    )
    .bind(subscription.id)
    .run();

  console.log("✅ [Polar Webhook] Revoked subscription, downgraded to free");
}

// Map Polar.sh product IDs to subscription tiers
function getTierFromProductId(productId: string): string {
  const standardProductId = process.env.POLAR_STANDARD_PRODUCT_ID;
  const standardPlusProductId = process.env.POLAR_STANDARD_PLUS_PRODUCT_ID;

  if (productId === standardProductId) return "standard";
  if (productId === standardPlusProductId) return "standard_plus";
  return "free";
}
