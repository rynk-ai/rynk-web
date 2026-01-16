import { searchWithExa } from "@/lib/services/exa-search";

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905'; // or 'llama3-70b-8192'

/**
 * Step 1: Research the Niche using Exa
 */
export async function researchNiche(niche: string) {
  console.log(`[YouTube Research] Searching for: ${niche}`);
  
  // 1. Find trending videos/topics
  const trendsQuery = `trending ${niche} youtube videos 2024 2025`;
  const trends = await searchWithExa({
    query: trendsQuery,
    numResults: 5,
    type: "neural",
    category: "tweet", 
    includeDomains: ["youtube.com", "reddit.com", "twitter.com"],
    startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
  });

  // 2. Find common questions/pain points
  const questionsQuery = `common questions and problems about ${niche}`;
  const questions = await searchWithExa({
    query: questionsQuery,
    numResults: 5,
    type: "neural",
    includeDomains: ["reddit.com", "quora.com"],
  });

  // Optimize: Map results to reduce payload size
  const simplifyUtils = (results: any[]) => {
    return results.map(r => ({
      title: r.title,
      url: r.url,
      // Truncate text content to avoid token overflow
      text: r.text ? r.text.slice(0, 300) + "..." : undefined,
      highlights: r.highlights ? r.highlights.slice(0, 2) : undefined
    }));
  };

  return {
    trends: simplifyUtils(trends.results),
    questions: simplifyUtils(questions.results),
  };
}

/**
 * Step 2: Analyze Research & Generate Insights (LLM)
 */
export async function analyzeAndGenerateTitles(niche: string, researchData: any) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  // Safety: Limit context character count
  const contextString = JSON.stringify(researchData);
  const context = contextString.length > 25000 
    ? contextString.slice(0, 25000) + "...(truncated)" 
    : contextString;
  
  const systemPrompt = `You are a YouTube Viral Strategist. 
  Your goal is to analyze research data from a specific niche and generate viral title ideas that are scientifically designed to get clicks.
  
  Input Data:
  - Trending content (YouTube/Twitter)
  - Audience questions (Reddit/Quora)

  Task:
  1. Analyze the 'Gap': What are people asking that isn't being answered well?
  2. Identify 'Hooks': What emotional triggers work in this niche?
  3. Generate 10 Viral Titles. Each title must have a 'Strategy' tag explaining why it works (e.g. Curiosity Gap, Negativity Bias, Strong Promise).
  
  Output Format (JSON):
  {
    "insights": {
      "audience_pain_points": ["..."],
      "content_gaps": ["..."],
      "viral_hooks": ["..."]
    },
    "titles": [
      { "title": "...", "score": 95, "strategy": "..." },
      ...
    ]
  }
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
        { role: "user", content: `Niche: ${niche}\n\nResearch Data:\n${context}` },
      ],
      response_format: { type: "json_object" }, 
    }),
  });

  if (!response.ok) {
     const errText = await response.text();
     console.error(`Groq API Error: ${response.status}`, errText);
     throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data : any = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse LLM response");
  }
}

/**
 * Streaming Generator Wrapper (similar to Humanizer)
 * But since this is multi-step, we might stream "Status Updates" then "Final JSON".
 */
export async function* youtubeResearchStream(niche: string) {
  yield { type: "status", message: "Searching for trending topics..." };
  const research = await researchNiche(niche);
  
  yield { type: "status", message: `Found ${research.trends.length} trends & ${research.questions.length} discussions. Analyzing...` };
  
  // Artificial delay for UX? No, LLM takes time.
  const analysis = await analyzeAndGenerateTitles(niche, research);
  
  yield { type: "result", data: analysis };
}
