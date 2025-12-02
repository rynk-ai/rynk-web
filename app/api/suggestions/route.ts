import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";
import { getAIProvider } from "@/lib/services/ai-factory";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ suggestions: [] });
    }

    // 1. Check Cookie Cache
    const cookieStore = await cookies();
    const cachedSuggestions = cookieStore.get("ai-suggestions");
    
    if (cachedSuggestions?.value) {
      try {
        const parsed = JSON.parse(cachedSuggestions.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('Hit suggestions cache');
          return NextResponse.json({ suggestions: parsed });
        }
      } catch (e) {
        // Invalid cookie, ignore
      }
    }

    // 2. Fetch last 5 conversations
    const conversations = await cloudDb.getConversations(session.user.id, 5);

    if (conversations.length < 5) {
      return NextResponse.json({ suggestions: [] });
    }

    // 3. Build Rich Context from Messages
    // Fetch last 2 messages from each conversation to get a "summary" of the topic
    const contextPromises = conversations.map(async (c) => {
      // Get last 2 messages
      const { messages } = await cloudDb.getMessages(c.id, 2);
      
      // Format: "Title: [Title] \n Last Exchange: [User] ... [Assistant] ..."
      const exchange = messages.map(m => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n');
      return `Conversation: "${c.title}"\nContext:\n${exchange}`;
    });

    const contextItems = await Promise.all(contextPromises);
    const context = contextItems.join("\n\n---\n\n");

    const prompt = `
      Based on the summaries of the user's recent conversations below, generate 5 very short (max 3-5 words), intriguing follow-up questions or new topic suggestions that they might be interested in.
      
      Recent Conversation Context:
      ${context}
      
      Return ONLY a JSON array of 5 strings. Example: ["Suggestion 1", "Suggestion 2", ...]. Do not include markdown formatting or explanations.
    `;

    const aiProvider = getAIProvider();
    const response = await aiProvider.sendMessageOnce({
      messages: [
        { role: "system", content: "You are a helpful assistant that generates conversation suggestions." },
        { role: "user", content: prompt }
      ]
    });

    // 4. Parse JSON
    let suggestions: string[] = [];
    try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        suggestions = JSON.parse(cleaned);
        
        if (!Array.isArray(suggestions) || !suggestions.every(s => typeof s === 'string')) {
            throw new Error("Invalid format");
        }
    } catch (e) {
        console.error("Failed to parse AI suggestions:", e, response);
        suggestions = [];
    }

    // 5. Set Cookie and Return
    const res = NextResponse.json({ suggestions });
    
    if (suggestions.length > 0) {
      res.cookies.set("ai-suggestions", JSON.stringify(suggestions), {
        maxAge: 60 * 60 * 12, // 12 hours
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      });
    }

    return res;

  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
