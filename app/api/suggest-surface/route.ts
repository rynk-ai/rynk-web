/**
 * Surface Suggestion API
 * 
 * Uses Groq's fast model to analyze user queries and suggest the best surface format.
 * Rate limited to 10 requests per minute per user/session.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

// Simple in-memory rate limiting (per-instance, resets on deploy)
// In production, you might use Redis or Cloudflare KV
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 50; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Surface types we can suggest
const VALID_SURFACE_TYPES = [
  'chat', 'learning', 'guide', 'quiz', 'comparison',
  'flashcard', 'timeline', 'wiki', 'finance', 'research'
] as const;

type SurfaceType = typeof VALID_SURFACE_TYPES[number];

interface SurfaceSuggestionResponse {
  suggestedSurface: SurfaceType | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user identifier (session ID or user ID)
    const session = await auth();
    const cookieStore = await cookies();
    const guestId = cookieStore.get("guest-session-id")?.value;
    const identifier = session?.user?.id || guestId || "anonymous";
    
    // Rate limit check
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before trying again." },
        { status: 429 }
      );
    }
    
    // Parse request body
    const body = await request.json() as { query?: string };
    const query = body.query?.trim();
    
    if (!query || query.length < 5) {
      return NextResponse.json({ suggestedSurface: null, confidence: 'low', reason: '' });
    }
    
    // Truncate very long queries
    const truncatedQuery = query.slice(0, 300);
    
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('[SurfaceSuggestion] Missing GROQ_API_KEY');
      return NextResponse.json({ suggestedSurface: null, confidence: 'low', reason: '' });
    }
    
    // Call Groq with a super fast model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast model ~50-100ms
        messages: [{
          role: 'system',
          content: `You are a query classifier. Analyze the user's query and suggest the BEST content format.

Available formats:
- "chat" - General conversation, opinions, quick questions
- "learning" - Educational courses with chapters, structured curriculum
- "guide" - Step-by-step instructions, how-to tutorials
- "quiz" - Test knowledge, practice questions
- "comparison" - Compare 2+ things side-by-side (A vs B)
- "flashcard" - Memorization, study cards
- "timeline" - Historical events, chronological sequences
- "wiki" - Encyclopedia-style comprehensive overview
- "finance" - Stock prices, crypto, market data
- "research" - Deep-dive analysis with citations

Respond ONLY with JSON:
{"surface": "type", "confidence": "high|medium|low", "reason": "brief 5-word reason"}

Rules:
- If query mentions "compare", "vs", "versus", "or which" → comparison
- If query asks for price/stock/crypto → finance  
- If query starts with "teach me", "learn", "explain" → learning or wiki
- If query has "quiz", "test me", "assess" → quiz
- If query has "timeline", "history of", "chronology" → timeline
- If query has "flashcard", "memorize" → flashcard
- If query has "how to", "step by step", "guide" → guide
- If unclear or simple question → chat (default)
- confidence: high = clear match, medium = reasonable guess, low = defaulting`
        }, {
          role: 'user',
          content: truncatedQuery
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      console.error('[SurfaceSuggestion] Groq API error:', response.status);
      return NextResponse.json({ suggestedSurface: null, confidence: 'low', reason: '' });
    }
    
    const data: any = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    // Validate response
    const surface = result.surface as SurfaceType;
    const confidence = result.confidence as 'high' | 'medium' | 'low';
    const reason = result.reason?.slice(0, 50) || '';
    
    // Only return a suggestion if we have medium+ confidence and it's not just "chat"
    if (VALID_SURFACE_TYPES.includes(surface) && surface !== 'chat' && ['high', 'medium'].includes(confidence)) {
      return NextResponse.json({
        suggestedSurface: surface,
        confidence,
        reason
      });
    }
    
    return NextResponse.json({ suggestedSurface: null, confidence: 'low', reason: '' });
    
  } catch (error) {
    console.error('[SurfaceSuggestion] Error:', error);
    return NextResponse.json({ suggestedSurface: null, confidence: 'low', reason: '' });
  }
}
