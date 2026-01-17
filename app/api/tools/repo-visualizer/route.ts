import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { visualizeRepo } from "@/lib/services/tools/repo-visualizer";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { repoUrl } = await req.json() as { repoUrl: string };

    if (!repoUrl) {
      return NextResponse.json({ error: "Please provide a GitHub URL." }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "repo-visualizer");
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Analyze
    const result = await visualizeRepo(repoUrl);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Repo Visualizer Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to visualize repo" }, 
      { status: 500 }
    );
  }
}
