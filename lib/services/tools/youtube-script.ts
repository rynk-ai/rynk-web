const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type ScriptDuration = 'short' | 'medium' | 'long';
export type ScriptTone = 'engaging' | 'educational' | 'funny' | 'professional';

export type YouTubeScriptResult = {
  script: string;
  sections: {
    hook: string;
    intro: string;
    body: string;
    outro: string;
  };
  estimatedDuration: string;
};

const DURATION_GUIDE: Record<ScriptDuration, string> = {
  short: "under 60 seconds (Shorts/Reels format)",
  medium: "3-5 minutes",
  long: "8-10 minutes",
};

export async function generateYouTubeScript(
  topic: string,
  tone: ScriptTone = 'engaging',
  duration: ScriptDuration = 'medium'
): Promise<YouTubeScriptResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt = `You are an expert YouTube Scriptwriter with millions of views.
Your goal is to write a viral script for the topic provided.

Tone: ${tone}
Target Duration: ${DURATION_GUIDE[duration]}

Structure rules:
1. HOOK: First 5-10 seconds must be attention-grabbing.
2. INTRO: Brief context, what they will learn.
3. BODY: High value content, fast paced.
4. OUTRO: Clear Call to Action (CTA).

Output format:
Return a JSON object with these keys: "hook", "intro", "body", "outro", "estimated_duration_text".
Ensure the content is plain text, no markdown in the values.`;

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
        { role: "user", content: `Write a script for a video about: "${topic}"` },
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

  const fullScript = `
[HOOK]
${content.hook}

[INTRO]
${content.intro}

[BODY]
${content.body}

[OUTRO]
${content.outro}
`.trim();

  return {
    script: fullScript,
    sections: {
      hook: content.hook,
      intro: content.intro,
      body: content.body,
      outro: content.outro,
    },
    estimatedDuration: content.estimated_duration_text || DURATION_GUIDE[duration],
  };
}
