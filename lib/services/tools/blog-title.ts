const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type TitleStyle = 'viral' | 'professional' | 'curiosity' | 'how-to' | 'listicle';

export type TitleResult = {
  titles: {
    title: string;
    style: string;
    hook: string;
  }[];
};

const STYLE_INSTRUCTIONS: Record<TitleStyle, string> = {
  viral: "Create attention-grabbing, shareable titles with emotional hooks",
  professional: "Create authoritative, trustworthy titles suitable for business",
  curiosity: "Create intriguing titles that spark curiosity and make readers want to learn more",
  'how-to': "Create practical, actionable titles that promise to teach something",
  listicle: "Create numbered list titles (e.g., '7 Ways to...', '10 Best...')",
};

export async function generateTitles(
  topic: string, 
  style: TitleStyle = 'viral',
  count: number = 10
): Promise<TitleResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are an expert blog title copywriter. ${STYLE_INSTRUCTIONS[style]}

Generate ${count} unique, compelling blog post titles for the given topic.

Respond with a JSON object in this EXACT format:
{
  "titles": [
    {
      "title": "<the blog title>",
      "style": "<style category: hook, question, number, statement, how-to>",
      "hook": "<1-2 word description of why this title works>"
    }
  ]
}

Rules:
- Each title should be under 70 characters for SEO
- Use power words (discover, secret, proven, ultimate, etc.)
- Vary the styles across the list
- Make each title unique and compelling
Output ONLY valid JSON.`;

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
        { role: "user", content: `Topic: ${topic}` },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content) as TitleResult;
  } catch {
    throw new Error("Failed to parse title generation response");
  }
}
