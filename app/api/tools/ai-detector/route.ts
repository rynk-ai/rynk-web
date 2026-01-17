import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit';
import { detectAIContent } from '@/lib/services/tools/ai-detector';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const { text } = await request.json() as { text: string };
    
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide at least 50 characters of text to analyze.' }, 
        { status: 400 }
      );
    }

    // Rate Limit Check
    const limitInfo = await getToolLimitInfo(env.DB, request, 'ai-detector');
    if (!limitInfo.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        message: limitInfo.error,
        resetAt: limitInfo.resetAt 
      }, { status: 429 });
    }

    // Detect AI Content
    const result = await detectAIContent(text.trim());

    // Consume Credit on success
    await checkAndConsumeToolLimit(env.DB, request, 'ai-detector');

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[AI Detector API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
