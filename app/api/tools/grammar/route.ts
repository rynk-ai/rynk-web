import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit';
import { checkGrammar, GrammarTone } from '@/lib/services/tools/grammar';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const body = await request.json() as { text: string; tone?: GrammarTone };
    const { text, tone = 'neutral' } = body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide at least 10 characters to check.' }, 
        { status: 400 }
      );
    }

    // Rate Limit Check
    const limitInfo = await getToolLimitInfo(env.DB, request, 'grammar');
    if (!limitInfo.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        message: limitInfo.error,
        resetAt: limitInfo.resetAt 
      }, { status: 429 });
    }

    // Check Grammar
    const result = await checkGrammar(text.trim(), tone);

    // Consume Credit on success
    await checkAndConsumeToolLimit(env.DB, request, 'grammar');

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Grammar API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
