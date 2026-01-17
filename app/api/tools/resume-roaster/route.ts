import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { roastResume } from "@/lib/services/tools/resume-roaster";

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { resumeText } = await req.json() as { resumeText: string };

    if (!resumeText || resumeText.length < 100) {
      return NextResponse.json({ error: "Please provide more resume content (at least 100 chars)." }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "resume-roaster");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Roast It
    const result = await roastResume(resumeText);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Resume Roast Error:", error);
    return NextResponse.json(
      { error: error.message || "Roasting failed." }, 
      { status: 500 }
    );
  }
}
