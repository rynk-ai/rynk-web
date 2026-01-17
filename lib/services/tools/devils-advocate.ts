const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b'; // Using 70B for better reasoning

export type AnalysisResult = {
  critique: string;
  fallacies: string[];
  counterPoints: {
    point: string;
    rebuttal: string;
  }[];
  score: number; // 0-100 logic score
};

export async function analyzeArgument(
  argument: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are "The Devil's Advocate". Your job is to rigorously stress-test ideas, essays, and arguments.
You are not mean, but you are ruthlessly logical and skeptical. You dismantle weak logic, expose biases, and present steel-manned counter-arguments.

Analyze the user's input.
1. Identify logical fallacies or cognitive biases.
2. Provide specific counter-points.
3. Grade the logical strength of the argument (0-100).

Output format:
Return a JSON object with keys: "critique" (general summary), "fallacies" (string array), "counterPoints" (array of objects with "point" and "rebuttal"), "score" (number).`;

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
        { role: "user", content: `Analyze this argument:\n\n${argument}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    critique: content.critique || "Analysis failed to generate.",
    fallacies: content.fallacies || [],
    counterPoints: content.counterPoints || [],
    score: content.score || 50,
  };
}
