import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit';
import { summarizeText, SummaryLength, SummaryFormat } from '@/lib/services/tools/summarizer';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const body = await request.json() as { 
      text: string; 
      length?: SummaryLength;
      format?: SummaryFormat;
    };
    const { text, length = 'standard', format = 'paragraph' } = body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide at least 50 characters to summarize.' }, 
        { status: 400 }
      );
    }

    // Rate Limit Check
    const limitInfo = await getToolLimitInfo(env.DB, request, 'summarizer');
    if (!limitInfo.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        message: limitInfo.error,
        resetAt: limitInfo.resetAt 
      }, { status: 429 });
    }

    // Summarize Text
    const result = await summarizeText(text.trim(), length, format);

    // Consume Credit on success
    await checkAndConsumeToolLimit(env.DB, request, 'summarizer');

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Summarizer API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
