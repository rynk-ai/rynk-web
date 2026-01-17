const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type ParaphraseMode = 'standard' | 'fluency' | 'formal' | 'simple' | 'creative';

export type ParaphraseResult = {
  paraphrased: string;
  changes: number;
  mode: ParaphraseMode;
};

const MODE_PROMPTS: Record<ParaphraseMode, string> = {
  standard: "Rewrite the text using different words and sentence structures while preserving the exact meaning. Make it natural and readable.",
  fluency: "Rewrite the text to improve flow and readability. Fix any awkward phrasing while keeping the meaning intact.",
  formal: "Rewrite the text in a formal, professional tone suitable for academic or business contexts. Use sophisticated vocabulary.",
  simple: "Rewrite the text using simpler words and shorter sentences. Make it easy to understand for a general audience.",
  creative: "Rewrite the text in a more engaging, creative way. Add variety and flair while preserving the core message.",
};

export async function paraphraseText(text: string, mode: ParaphraseMode = 'standard'): Promise<ParaphraseResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are an expert paraphrasing assistant. ${MODE_PROMPTS[mode]}

Rules:
- Output ONLY the paraphrased text, nothing else
- Preserve all key information and meaning
- Do not add new information or opinions
- Keep the same paragraph structure
- Maintain any technical terms or proper nouns`;

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
        { role: "user", content: text },
      ],
      temperature: mode === 'creative' ? 0.7 : 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const paraphrased = data.choices[0].message.content.trim();
  
  // Count word-level changes (rough estimate)
  const originalWords = text.toLowerCase().split(/\s+/);
  const newWords = paraphrased.toLowerCase().split(/\s+/);
  const originalSet = new Set(originalWords);
  const changedWords = newWords.filter((w: string) => !originalSet.has(w)).length;
  const changePercent = Math.round((changedWords / newWords.length) * 100);

  return {
    paraphrased,
    changes: changePercent,
    mode,
  };
}
