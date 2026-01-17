const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';
const MAX_CHARS = 30000; // ~7500 tokens, safe limit for model

export type SummaryLength = 'brief' | 'standard' | 'detailed';
export type SummaryFormat = 'paragraph' | 'bullets' | 'numbered';

export type SummaryResult = {
  summary: string;
  originalWordCount: number;
  summaryWordCount: number;
  compressionRatio: number;
  truncated?: boolean;
};

const LENGTH_INSTRUCTIONS: Record<SummaryLength, string> = {
  brief: "Summarize in 1-2 sentences capturing only the most essential point.",
  standard: "Summarize in a short paragraph (3-5 sentences) covering the main ideas.",
  detailed: "Provide a comprehensive summary covering all key points and supporting details.",
};

const FORMAT_INSTRUCTIONS: Record<SummaryFormat, string> = {
  paragraph: "Write the summary as flowing prose.",
  bullets: "Write the summary as bullet points, each starting with •",
  numbered: "Write the summary as a numbered list.",
};

export async function summarizeText(
  text: string, 
  length: SummaryLength = 'standard',
  format: SummaryFormat = 'paragraph'
): Promise<SummaryResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  // Truncate if too long
  const truncated = text.length > MAX_CHARS;
  const processedText = truncated ? text.slice(0, MAX_CHARS) + '...[truncated]' : text;

  const systemPrompt = `You are an expert summarizer. ${LENGTH_INSTRUCTIONS[length]} ${FORMAT_INSTRUCTIONS[format]}

Rules:
- Output ONLY the summary, nothing else
- Preserve the most important information
- Use clear, concise language
- Do not add opinions or information not in the original
- Maintain factual accuracy`;

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
        { role: "user", content: `Summarize this text:\n\n${processedText}` },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const summary = data.choices[0].message.content.trim();
  
  const originalWordCount = text.split(/\s+/).length;
  const summaryWordCount = summary.split(/\s+/).length;
  const compressionRatio = Math.round((1 - summaryWordCount / originalWordCount) * 100);

  return {
    summary,
    originalWordCount,
    summaryWordCount,
    compressionRatio,
    truncated,
  };
}
