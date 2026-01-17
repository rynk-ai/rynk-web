const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-instruct-0905';

export type ResumeRoastResult = {
  score: number; // 0-100
  verdict: string; // "Hired" | "Maybe" | "Pass"
  brutalTruth: string;
  redFlags: string[];
  fixes: {
    section: string;
    issue: string;
    fix: string;
  }[];
};

export async function roastResume(resumeText: string): Promise<ResumeRoastResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    // Truncate if too long
    const content = resumeText.slice(0, 8000);

    const systemPrompt = `
    You are a senior tech recruiter at a top FAANG company and an expert career coach.
    Your job is to "Roast" resumes. Be brutally honest. Recruiters spend 6 seconds on a resume - 
    tell the user what a recruiter ACTUALLY sees.
    
    Focus on:
    - Impact & Quantification (Did they show results? Numbers?)
    - Clarity & Scannability (Is it easy to read? Jargon soup?)
    - Red Flags (Job hopping? Gaps? Vague titles?)
    - ATS Optimization (Will it pass keyword filters?)
    - Overall "Hire-ability" vibe.

    Output JSON:
    - score: 0-100 (Hire-ability Score)
    - verdict: "Hired" | "Maybe" | "Pass" 
    - brutalTruth: A short paragraph roasting the overall feeling. Be mean but constructive.
    - redFlags: Array of 2-4 string red flags a recruiter would notice.
    - fixes: Array of 3 objects { "section": "e.g. Experience", "issue": "...", "fix": "..." }
    `;

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
                { role: "user", content: `Resume:\n${content}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        }),
    });

    if (!response.ok) throw new Error("Resume roaster failed");

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
        score: result.score || 50,
        verdict: result.verdict || "Maybe",
        brutalTruth: result.brutalTruth || "This resume is... something.",
        redFlags: result.redFlags || [],
        fixes: result.fixes || []
    };
}
