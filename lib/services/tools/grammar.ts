const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type GrammarTone = 'neutral' | 'professional' | 'casual' | 'academic';

export type GrammarResult = {
  corrected: string;
  issues: {
    type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'clarity';
    original: string;
    correction: string;
    explanation: string;
  }[];
  score: number;
  tone: GrammarTone;
};

const TONE_INSTRUCTIONS: Record<GrammarTone, string> = {
  neutral: "Keep the original tone while fixing errors.",
  professional: "Adjust to a professional, business-appropriate tone.",
  casual: "Keep a friendly, conversational tone.",
  academic: "Use formal academic language suitable for papers and research.",
};

export async function checkGrammar(text: string, tone: GrammarTone = 'neutral'): Promise<GrammarResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are an expert editor and grammar checker. Analyze the text for grammar, spelling, punctuation, and style issues. ${TONE_INSTRUCTIONS[tone]}

Respond with a JSON object in this EXACT format:
{
  "corrected": "<the fully corrected text>",
  "issues": [
    {
      "type": "grammar" | "spelling" | "punctuation" | "style" | "clarity",
      "original": "<the original problematic text>",
      "correction": "<the corrected version>",
      "explanation": "<brief explanation of the fix>"
    }
  ],
  "score": <grammar score from 0-100, where 100 is perfect>
}

If there are no issues, return an empty issues array and score of 100.
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
        { role: "user", content: text },
      ],
      temperature: 0.2,
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
    const parsed = JSON.parse(content);
    return {
      ...parsed,
      tone,
    } as GrammarResult;
  } catch {
    throw new Error("Failed to parse grammar check response");
  }
}
