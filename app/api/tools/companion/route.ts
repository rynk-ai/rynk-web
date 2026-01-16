import { auth } from "@/lib/auth";
import { processText } from "@/lib/services/tools/companion-service";
import { checkAndConsumeToolLimit, getToolLimitInfo } from "@/lib/tools/rate-limit";
import { NextResponse } from "next/server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { setCorsHeaders, handleOptions } from "@/lib/utils/cors";

export const runtime = 'edge';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const corsHeaders = new Headers();
  
  // Create a dummy res to extract headers from helper
  const dummyRes = new Response();
  setCorsHeaders(dummyRes, origin);
  dummyRes.headers.forEach((v, k) => corsHeaders.set(k, v));

  try {
    const session = await auth();
    let db: any;
    try {
        db = getCloudflareContext().env.DB;
    } catch (e) {
        console.warn("No Cloudflare context found (local dev?)");
    }

    if (!db) {
         return NextResponse.json({ error: "Database not available" }, { status: 503, headers: corsHeaders });
    }

    const body = await req.json() as { text: string; action: any };
    const { text, action } = body;

    if (!text || !action) {
      return NextResponse.json({ error: "Missing text or action" }, { status: 400, headers: corsHeaders });
    }

    // Rate Limiting
    const limitInfo = await getToolLimitInfo(db, req, "extension");
    
    if (!limitInfo.allowed) {
       return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: corsHeaders });
    }

    // Process Text
    const result = await processText(text, action);

    // Consume Credit
    await checkAndConsumeToolLimit(db, req, "extension");

    return NextResponse.json({ result: result }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("[Companion API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
