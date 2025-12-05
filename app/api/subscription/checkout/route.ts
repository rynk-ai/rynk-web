import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

// Initialize Polar client
const getPolarClient = () => {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN not configured");
  }

  return new Polar({ accessToken });
};

// Get D1 database binding
const getDB = (): D1Database => {
  return getCloudflareContext().env.DB;
};

interface CheckoutRequest {
  tier: "standard" | "standard_plus" | "extra";
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutRequest;
    const { tier } = body;

    if (!tier || !["standard", "standard_plus", "extra"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const polar = getPolarClient();
    const db = getDB();

    // Get or create Polar customer
    const polarCustomerId = await getOrCreateCustomer(
      polar,
      db,
      session.user.id,
      session.user.email,
      session.user.name,
    );

    // Get the appropriate product ID based on tier
    const productId = getProductIdForTier(tier);
    if (!productId) {
      return NextResponse.json(
        { error: "Product not configured" },
        { status: 500 },
      );
    }

    // Determine success URL based on tier
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8788";
    const successUrl = `${baseUrl}/subscription?success=true&tier=${tier}`;

    // Create checkout session using products array
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl,
      customerEmail: session.user.email,
      metadata: {
        userId: session.user.id,
        tier,
      },
    });

    console.log("✅ [Checkout] Created checkout session:", checkout.id);

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error: any) {
    console.error("❌ [Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 },
    );
  }
}

// Get or create a Polar customer for the user
async function getOrCreateCustomer(
  polar: Polar,
  db: D1Database,
  userId: string,
  email: string,
  name?: string | null,
): Promise<string> {
  // Check if user already has a Polar customer ID
  const user = await db
    .prepare("SELECT polarCustomerId FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (user?.polarCustomerId) {
    return user.polarCustomerId as string;
  }

  // Create new customer in Polar
  const customer = await polar.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });

  // Save customer ID to database
  await db
    .prepare(
      "UPDATE users SET polarCustomerId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(customer.id, userId)
    .run();

  console.log("✅ [Checkout] Created Polar customer:", customer.id);

  return customer.id;
}

// Map tier to Polar product ID
function getProductIdForTier(tier: string): string | null {
  switch (tier) {
    case "standard":
      return process.env.POLAR_STANDARD_PRODUCT_ID || null;
    case "standard_plus":
      return process.env.POLAR_STANDARD_PLUS_PRODUCT_ID || null;
    case "extra":
      return process.env.POLAR_EXTRA_CREDITS_PRODUCT_ID || null;
    default:
      return null;
  }
}
