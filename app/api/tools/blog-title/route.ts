import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit';
import { generateTitles, TitleStyle } from '@/lib/services/tools/blog-title';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const body = await request.json() as { topic: string; style?: TitleStyle };
    const { topic, style = 'viral' } = body;
    
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide a topic (at least 3 characters).' }, 
        { status: 400 }
      );
    }

    // Rate Limit Check
    const limitInfo = await getToolLimitInfo(env.DB, request, 'blog-title');
    if (!limitInfo.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        message: limitInfo.error,
        resetAt: limitInfo.resetAt 
      }, { status: 429 });
    }

    // Generate Titles
    const result = await generateTitles(topic.trim(), style);

    // Consume Credit on success
    await checkAndConsumeToolLimit(env.DB, request, 'blog-title');

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Blog Title API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
