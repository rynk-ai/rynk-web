const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const HN_ALGOLIA_API = 'https://hn.algolia.com/api/v1/search';

export type HNInspectorResult = {
  overallSentiment: "Positive" | "Mixed" | "Negative" | "Neutral";
  summary: string;
  keyArguments: {
    stance: "Pro" | "Con" | "Neutral";
    argument: string;
  }[];
  notableQuotes: string[];
  storyCount: number;
  topStories: {
    title: string;
    url: string;
    points: number;
  }[];
};

// 1. Fetch HN Data
async function fetchHNData(query: string): Promise<{ hits: any[], nbHits: number }> {
    const url = new URL(HN_ALGOLIA_API);
    url.searchParams.set('query', query);
    url.searchParams.set('tags', '(story,comment)');
    url.searchParams.set('hitsPerPage', '50'); // Get top 50 relevant items

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch HN data');
    
    return await res.json() as { hits: any[], nbHits: number };
}

// 2. Analyze with AI
export async function inspectHNSentiment(query: string): Promise<HNInspectorResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const { hits, nbHits } = await fetchHNData(query);
    
    if (hits.length === 0) {
        return {
            overallSentiment: "Neutral",
            summary: "No relevant discussions found on HackerNews for this topic.",
            keyArguments: [],
            notableQuotes: [],
            storyCount: 0,
            topStories: []
        };
    }

    // Extract Top Stories for Sources
    const topStories = hits.slice(0, 5).map((hit: any) => ({
        title: hit.title || "Untitled Discussion",
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        points: hit.points || 0
    }));

    // Prepare context from HN content
    const hnContent = hits.slice(0, 30).map((hit: any) => {
        const title = hit.title || "";
        const comment = hit.comment_text ? hit.comment_text.slice(0, 300) : "";
        return `[${hit.points || 0} pts] ${title} ${comment}`;
    }).join('\n---\n');

    const systemPrompt = `
    You are an expert analyst of tech community sentiment.
    Your job is to analyze HackerNews discussions about a given topic.
    
    Based on the provided HN content, determine:
    1. Overall Sentiment (Positive, Mixed, Negative, Neutral)
    2. A 2-3 sentence summary of what the HN crowd thinks.
    3. Key Arguments (both Pro and Con) - list 3-5 distinct viewpoints.
    4. Notable Quotes - 2-3 short, punchy direct quotes from the discussions.
    
    Output JSON:
    - overallSentiment: "Positive" | "Mixed" | "Negative" | "Neutral"
    - summary: string
    - keyArguments: [{ stance: "Pro" | "Con" | "Neutral", argument: string }]
    - notableQuotes: string[]
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
                { role: "user", content: `Topic: "${query}"\n\nHN Discussions:\n${hnContent}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
        }),
    });

    if (!response.ok) throw new Error("HN analysis failed");

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
        overallSentiment: result.overallSentiment || "Neutral",
        summary: result.summary || "Analysis unavailable.",
        keyArguments: result.keyArguments || [],
        notableQuotes: result.notableQuotes || [],
        storyCount: nbHits,
        topStories: topStories
    };
}
