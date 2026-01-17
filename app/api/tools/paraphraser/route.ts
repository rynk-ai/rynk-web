import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit';
import { paraphraseText, ParaphraseMode } from '@/lib/services/tools/paraphraser';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const body = await request.json() as { text: string; mode?: ParaphraseMode };
    const { text, mode = 'standard' } = body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Please provide at least 20 characters to paraphrase.' }, 
        { status: 400 }
      );
    }

    // Validate mode
    const validModes = ['standard', 'fluency', 'formal', 'simple', 'creative'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Use: standard, fluency, formal, simple, or creative.' }, 
        { status: 400 }
      );
    }

    // Rate Limit Check
    const limitInfo = await getToolLimitInfo(env.DB, request, 'paraphraser');
    if (!limitInfo.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        message: limitInfo.error,
        resetAt: limitInfo.resetAt 
      }, { status: 429 });
    }

    // Paraphrase Text
    const result = await paraphraseText(text.trim(), mode as ParaphraseMode);

    // Consume Credit on success
    await checkAndConsumeToolLimit(env.DB, request, 'paraphraser');

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Paraphraser API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
