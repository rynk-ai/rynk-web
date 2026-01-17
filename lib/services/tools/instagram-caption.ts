const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type CaptionVibe = 'funny' | 'inspirational' | 'professional' | 'minimalist' | 'question';

export type InstagramCaptionResult = {
  captions: string[];
};

export async function generateInstagramCaptions(
  context: string,
  vibe: CaptionVibe = 'funny'
): Promise<InstagramCaptionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are a social media expert.
Generate 5 distinct Instagram captions based on the user's description.
Vibe: ${vibe}

Rules:
- Include relevant emojis.
- Include 3-5 relevant hashtags at the end of each caption.
- Keep them engaging and concise.

Output format:
Return a JSON object with a single key "captions" which is an array of strings.`;

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
        { role: "user", content: `Photo/Context description: "${context}"` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // Slightly higher creativity for captions
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    captions: content.captions || [],
  };
}
