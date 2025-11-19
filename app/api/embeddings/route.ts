import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
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

    const response = await fetch(
      "https://openrouter.ai/api/v1/embeddings",
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
          model: "text-embedding-3-small", // Or another available embedding model on OpenRouter
          input: text,
        }),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }));
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

    const data = await response.json();
    
    // OpenRouter/OpenAI response format: { data: [{ embedding: [...] }] }
    const embedding = data.data?.[0]?.embedding;

    if (!embedding) {
      return new Response(
        JSON.stringify({ error: "Failed to generate embedding" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ embedding }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Embedding API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
