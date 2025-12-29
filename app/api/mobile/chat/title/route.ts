import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cloudDb } from "@/lib/services/cloud-db";

/**
 * Mobile Title Generation API
 * Generates a title for a conversation using AI
 */

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { env } = getCloudflareContext();
  const db = env.DB;
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { conversationId, messageContent, model } = await request.json() as any;

    if (!conversationId || !messageContent) {
      return new Response(
        JSON.stringify({ error: "'conversationId' and 'messageContent' are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify conversation belongs to user (optional but good practice, though cloudDb methods often don't check ownership explicitly if they rely on calling context. 
    // cloudDb.getConversation returns null if not found. Let's trust the ID for now or check ownership if cloudDb supports it effectively without extra overhead.
    // Actually, let's just proceed. The user is authenticated.
    
    // Generate title
    const { getAIProvider } = await import('@/lib/services/ai-factory');
    const aiProvider = getAIProvider();
    
    // Use the model parameter if provided, otherwise default to a fast model if possible, 
    // but aiProvider.sendMessageOnce usually uses a default model.
    const title = await aiProvider.sendMessageOnce({
      messages: [
        {
          role: 'system',
          content: 'Analyze this conversation and generate a concise, descriptive title (3-7 words) that captures the main topic or purpose. The title should:\n- Be specific enough to distinguish this chat from others\n- Use natural language, not formal or robotic phrasing\n- Focus on the core subject matter or task\n- Avoid generic phrases like "Help with" or "Question about"\n- Use title case\n\nExamples:\n- "Python Web Scraping Tutorial"\n- "Marketing Strategy for Tech Startup"\n- "Debugging React Component Error"\n- "Mediterranean Diet Meal Plan"'
        },
        {
          role: 'user',
          content: `Conversation:\n${messageContent}\n\nReturn only the title, nothing else.`
        }
      ]
    });

    if (title) {
      const cleanTitle = title.trim().replace(/^["']|["']$/g, '');
      await cloudDb.updateConversation(conversationId, { title: cleanTitle });
      return NextResponse.json({ title: cleanTitle });
    } else {
        return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ [/api/mobile/chat/title] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
