const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905'; // Fast, good instruction following

type CompanionAction = 'grammar' | 'professional' | 'summarize';

export async function processText(text: string, action: CompanionAction) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  let systemPrompt = "You are a helpful writing assistant.";
  
  if (action === 'grammar') {
    systemPrompt = "You are an expert editor. Fix all grammar, spelling, and punctuation errors in the user's text. Maintain the original tone and meaning. Output ONLY the corrected text.";
  } else if (action === 'professional') {
    systemPrompt = "You are a corporate communication expert. Rewrite the user's text to be professional, clear, and polite. Suitable for business emails or Slack. Output ONLY the rewritten text.";
  } else if (action === 'summarize') {
    systemPrompt = "You are a precise summarizer. Summarize the following text in 1-2 concise sentences. Capture the key points. Output ONLY the summary.";
  }

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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
     const errText = await response.text();
     throw new Error(`Groq API error: ${response.status} - ${errText.slice(0, 100)}`);
  }

  const data : any = await response.json();
  return data.choices[0].message.content;
}
