import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { roastLandingPage } from "@/lib/services/tools/landing-roaster";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { url } = await req.json() as { url: string };

    if (!url || !url.includes('.')) {
      return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "landing-roaster");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Roast It
    const result = await roastLandingPage(url);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Roast Error:", error);
    return NextResponse.json(
      { error: error.message || "Roasting failed. The page might be protected." }, 
      { status: 500 }
    );
  }
}
