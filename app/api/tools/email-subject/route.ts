import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkAndConsumeToolLimit } from "@/lib/tools/rate-limit";
import { generateEmailSubjects } from "@/lib/services/tools/email-subject";



export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { emailBody } = await req.json() as { 
      emailBody: string; 
    };

    if (!emailBody || emailBody.length < 5) {
      return NextResponse.json({ error: "Email body or topic is required" }, { status: 400 });
    }

    // Rate Limit Check
    const limitResult = await checkAndConsumeToolLimit(env.DB, req, "email-subject");
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.error, resetAt: limitResult.resetAt }, 
        { status: 429 }
      );
    }

    // Call Service
    const result = await generateEmailSubjects(emailBody);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Email Subject API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
