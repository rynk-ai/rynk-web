import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { inspectHNSentiment } from "@/lib/services/tools/hn-inspector";

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { query } = await req.json() as { query: string };

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Please provide a search topic." }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "hn-inspector");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Analyze
    const result = await inspectHNSentiment(query);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("HN Inspector Error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed." }, 
      { status: 500 }
    );
  }
}
