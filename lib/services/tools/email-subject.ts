const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type SubjectLineResult = {
  subjects: string[];
};

export async function generateEmailSubjects(
  emailBody: string
): Promise<SubjectLineResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are a world-class email marketer.
Generate 5 high-converting, click-worthy email subject lines based on the email content provided.

Rules:
- Focus on curiosity, benefit, or urgency.
- Keep them under 50 characters ideally.
- Avoid spam trigger words.
- Provide a mix of styles (question, direct, teaser).

Output format:
Return a JSON object with a single key "subjects" which is an array of strings.`;

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
        { role: "user", content: `Email Content/Topic: "${emailBody}"` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data: any = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    subjects: content.subjects || [],
  };
}
