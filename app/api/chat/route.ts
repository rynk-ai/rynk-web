import { NextRequest } from "next/server";

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { messages, stream = true } = await request.json() as { messages: any[]; stream?: boolean }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Create abort controller with 30 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer":
              request.headers.get("origin") || "http://localhost:3000",
            "X-Title": "SimpleChat",
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages,
            stream,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Unknown error" } })) as any;
        return new Response(
          JSON.stringify({
            error:
              error.error?.message || `HTTP error! status: ${response.status}`,
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (stream) {
        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } else {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (fetchError.name === 'AbortError') {
        console.error("OpenRouter API timeout");
        return new Response(
          JSON.stringify({ error: "Request to AI service timed out. Please try again." }),
          { status: 504, headers: { "Content-Type": "application/json" } }
        );
      }
      
      console.error("OpenRouter fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service. Please try again." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
