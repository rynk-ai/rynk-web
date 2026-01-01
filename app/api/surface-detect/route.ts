/**
 * Surface Detection API (Post-Response)
 * 
 * Analyzes BOTH the user query AND AI response to determine which interactive
 * surfaces would genuinely enhance the content. Called after the AI response
 * is received, so it's non-blocking to the main chat flow.
 * 
 * Uses Groq's fast model for ~100ms inference.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30; // requests per window
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

// Valid surface types
const VALID_SURFACES = [
  'guide', 'learning', 'wiki', 'flashcard', 'quiz', 
  'comparison', 'timeline', 'finance', 'research'
] as const;

type SurfaceType = typeof VALID_SURFACES[number];

interface SurfaceDetectRequest {
  query?: string;
  response: string;
  messageId?: string;
}

interface SurfaceDetectResponse {
  surfaces: SurfaceType[];
  reasoning: string;
}

const DETECTION_PROMPT = `You are a surface recommendation system. Given a user query and AI response, determine which interactive surfaces would genuinely enhance the content.

Available surfaces:
- "guide": Step-by-step tutorials, how-to instructions with sequential steps
- "learning": Comprehensive courses, structured educational explanations with multiple topics
- "wiki": Encyclopedic overviews, factual reference information
- "flashcard": Content with key terms, definitions, or concepts to memorize
- "quiz": Educational content that tests knowledge (only if paired with teaching)
- "comparison": Side-by-side analysis of 2+ options, pros/cons, decision frameworks
- "timeline": Historical events, chronological sequences with dates
- "finance": Stock/crypto analysis, market data, financial metrics
- "research": Deep-dive analysis with multiple sources, academic content

STRICT RULES - DO NOT recommend surfaces for:
1. Short responses (less than 300 words) - return empty
2. Casual conversation, greetings, small talk - return empty
3. Simple yes/no answers or confirmations - return empty
4. Error messages, "I don't know", or inability responses - return empty
5. Code-only responses without explanation - return empty
6. Questions back to the user - return empty
7. Purely creative content (poems, stories) without educational value - return empty

POSITIVE RULES:
- "guide" = response has 3+ numbered or sequential steps
- "learning"/"wiki" = response explains concepts with depth (500+ words)
- "flashcard"/"quiz" = response teaches terminology or concepts that could be tested
- "comparison" = response compares 2+ alternatives with criteria
- "timeline" = response mentions 3+ dates/events in sequence
- "finance" = response discusses specific stocks, crypto, or market analysis

Return ONLY valid JSON:
{"surfaces": ["surface1", "surface2"], "reasoning": "10-word max explanation"}

Maximum 2 surfaces. If nothing fits, return: {"surfaces": [], "reasoning": "not suitable for surfaces"}`;

export async function POST(request: NextRequest) {
  try {
    // Get user identifier
    const session = await auth();
    const cookieStore = await cookies();
    const guestId = cookieStore.get("guest-session-id")?.value;
    const identifier = session?.user?.id || guestId || "anonymous";
    
    // Rate limit check
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { surfaces: [], reasoning: "rate limited" },
        { status: 429 }
      );
    }
    
    // Parse request body
    const body = await request.json() as SurfaceDetectRequest;
    const query = body.query?.trim() || "";
    const response = body.response?.trim() || "";
    
    // Quick exclusions - don't even call LLM
    if (!response || response.length < 200) {
      return NextResponse.json({ surfaces: [], reasoning: "response too short" });
    }
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('[SurfaceDetect] Missing GROQ_API_KEY');
      return NextResponse.json({ surfaces: [], reasoning: "config error" });
    }
    
    // Truncate to save tokens
    const truncatedQuery = query.slice(0, 300);
    const truncatedResponse = response.slice(0, 2500);
    
    // Call Groq
    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast model
        messages: [
          { role: 'system', content: DETECTION_PROMPT },
          { 
            role: 'user', 
            content: `USER QUERY: ${truncatedQuery || "(no query provided)"}\n\nAI RESPONSE:\n${truncatedResponse}` 
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 100
      })
    });
    
    if (!llmResponse.ok) {
      console.error('[SurfaceDetect] Groq API error:', llmResponse.status);
      return NextResponse.json({ surfaces: [], reasoning: "api error" });
    }
    
    const data: any = await llmResponse.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('[SurfaceDetect] JSON parse error:', content);
      return NextResponse.json({ surfaces: [], reasoning: "parse error" });
    }
    
    // Validate surfaces
    const validSurfaces = (result.surfaces || [])
      .filter((s: string) => VALID_SURFACES.includes(s as SurfaceType))
      .slice(0, 2) as SurfaceType[];
    
    const reasoning = typeof result.reasoning === 'string' 
      ? result.reasoning.slice(0, 100) 
      : '';
    
    return NextResponse.json({
      surfaces: validSurfaces,
      reasoning
    });
    
  } catch (error) {
    console.error('[SurfaceDetect] Error:', error);
    return NextResponse.json({ surfaces: [], reasoning: "error" });
  }
}
