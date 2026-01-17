import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { generateYouTubeScript, ScriptDuration, ScriptTone } from "@/lib/services/tools/youtube-script";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { topic, tone, duration } = await req.json() as { 
      topic: string; 
      tone: ScriptTone; 
      duration: ScriptDuration; 
    };

    if (!topic || topic.length < 5) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "youtube-script");
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Call Service
    const result = await generateYouTubeScript(topic, tone, duration);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("YouTube Script API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
