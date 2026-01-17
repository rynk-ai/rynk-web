import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { analyzeArgument } from "@/lib/services/tools/devils-advocate";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { argument } = await req.json() as { 
      argument: string; 
    };

    if (!argument || argument.length < 50) {
      return NextResponse.json({ error: "Please provide a substantial argument (at least 50 chars)." }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "devils-advocate");
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Call Service
    const result = await analyzeArgument(argument);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Devil's Advocate API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
