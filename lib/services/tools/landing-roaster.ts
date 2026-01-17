import { load } from 'cheerio';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

export type RoastResult = {
  score: number; // 0-100
  headlineCritique: string;
  brutalTruth: string;
  fixes: {
    issue: string;
    fix: string;
  }[];
};

// 1. Fetch & Extract Text
async function fetchPageContent(url: string): Promise<string> {
  // Ensure protocol
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RynkBot/1.0; +https://rynk.io)'
      },
      next: { revalidate: 60 } // Cache for 60s
    });
    
    if (!res.ok) throw new Error('Failed to fetch page');
    
    const html = await res.text();
    // Using simple regex or cheerio to strip tags if environment supports it. 
    // Since this is edge/node, we can use regex for a lightweight approach or bring in cheerio if needed.
    // Let's use a simple regex approach to avoid heavy deps if possible, or just raw text.
    // "cheerio" is standard for this. Assuming it's available or we install it. 
    // I'll assume we might need to install it. For now, let's try a regex stripper to keep it dependency-light 
    // OR just send the HTML <body (truncated) to LLM.
    
    // Truncating HTML to first 100kb to avoid token limits
    return html.substring(0, 50000); 

  } catch (e) {
    throw new Error('Could not access URL. It might be blocked or private.');
  }
}

// 2. Roast It
export async function roastLandingPage(url: string): Promise<RoastResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const htmlContent = await fetchPageContent(url);

    // Clean up HTML a bit (remove scripts/styles)
    const cleanedContent = htmlContent
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 6000); // 6k chars is enough context

    const systemPrompt = `
    You are a conversion rate optimization expert and brutal copywriter. 
    Your job is to "Roast" landing pages. 
    Be direct, maybe slightly mean, but highly actionable.
    Focus on: Value Prop clarity, Call to Action, Trust signals, and Copywriting.

    Analyze the provided text content of a landing page.
    
    Output JSON:
    - score: 0-100 (Conversion Score)
    - headlineCritique: 1 sentence on the main headline/H1.
    - brutalTruth: A short paragraph roasting the overall vibe.
    - fixes: Array of 3 objects { "issue": "...", "fix": "..." }
    `;

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `URL: ${url}\n\nPage Content:\n${cleanedContent}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        }),
    });

    if (!response.ok) throw new Error("Roast generator failed");

    const data: any = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    return {
        score: content.score || 50,
        headlineCritique: content.headlineCritique || "Headline not found.",
        brutalTruth: content.brutalTruth || "This page is... interesting.",
        fixes: content.fixes || []
    };
}
