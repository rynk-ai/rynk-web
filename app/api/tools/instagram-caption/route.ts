import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { generateInstagramCaptions, CaptionVibe } from "@/lib/services/tools/instagram-caption";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { context, vibe } = await req.json() as { 
      context: string; 
      vibe: CaptionVibe; 
    };

    if (!context || context.length < 3) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "instagram-caption");
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Call Service
    const result = await generateInstagramCaptions(context, vibe);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Instagram Caption API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
