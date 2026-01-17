const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type DetectionResult = {
  verdict: 'human' | 'ai' | 'mixed';
  confidence: number;
  analysis: string;
  signals: {
    type: string;
    description: string;
    weight: 'strong' | 'moderate' | 'weak';
  }[];
};

export async function detectAIContent(text: string): Promise<DetectionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are an expert AI content detection system. Analyze the provided text and determine whether it was written by a human, AI, or is a mix of both.

Respond with a JSON object in this EXACT format:
{
  "verdict": "human" | "ai" | "mixed",
  "confidence": <number between 0-100>,
  "analysis": "<2-3 sentence summary of your reasoning>",
  "signals": [
    { "type": "<signal category>", "description": "<specific observation>", "weight": "strong" | "moderate" | "weak" }
  ]
}

Signal categories to look for:
- Repetitive patterns (AI often uses similar sentence structures)
- Vocabulary uniformity (AI uses consistent lexical choices)
- Human quirks (typos, colloquialisms, personal anecdotes)
- Transitional phrases (AI overuses "furthermore", "moreover", "additionally")
- Specificity (humans include specific details, AI stays generic)
- Emotional authenticity (genuine emotion vs. described emotion)

Be precise and analytical. Output ONLY valid JSON.`;

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
        { role: "user", content: `Analyze this text:\n\n${text}` },
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
    return JSON.parse(content) as DetectionResult;
  } catch {
    throw new Error("Failed to parse AI detection response");
  }
}
