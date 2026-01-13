/**
 * Onboarding Conversation Content
 * 
 * This module contains the pre-defined back-and-forth conversation
 * that new users see when they first sign up.
 * 
 * Themes aligned with landing page:
 * - "Ask. Read. Done." (Efficiency)
 * - Structured Output (Tables, timelines vs walls of text)
 * - Infinite Memory (Persists across sessions)
 * - File Analysis (Instant understanding)
 */

export interface OnboardingMessage {
  role: 'user' | 'assistant'
  content: string
}

export const ONBOARDING_MESSAGES: OnboardingMessage[] = [
  {
    role: 'user',
    content: "Hi! I just signed up. What makes Rynk different?"
  },
  {
    role: 'assistant',
    content: `**Ask. Read. Done.**

I'm designed to cut through the noise. No fluff, just the answers you need, formatted for instant understanding.`
  },
  {
    role: 'user',
    content: "Sounds efficient. How does the memory work?"
  },
  {
    role: 'assistant',
    content: `**Infinite Memory.**

I remember context across all your projects and sessions. You don't need to repeat yourself.

You can explicitly **reference other conversations** or entire **folders** in your current chat. Just type '@' to pull them in as context.

![Reference Conversation](/onboarding-images/add-convo.png)

![Reference Folder](/onboarding-images/add-folder.png)

*Tip: Use the folder button to organize your chats.*

![New Folder](/onboarding-images/new-folder.png)`
  },
  {
    role: 'user',
    content: "Can I use my own files?"
  },
  {
    role: 'assistant',
    content: `Yes. **File Analysis** is instant.

Drop in PDFs, CSVs, or code files. I don't just "read" them—I understand the structure. 

Try dragging a file here or use the attachment button. I'll extract the key insights properly.

![File Upload](/onboarding-images/files.png)`
  },
  {
    role: 'user',
    content: "What about accurate search results?"
  },
  {
    role: 'assistant',
    content: `I search multiple verticals (news, academic, code) and synthesize the facts.

Every claim I make is cited. You get the raw truth, organized and ready to use. 

![Deep Research](/onboarding-images/deep-research.png)

Ready to start? Just ask anything.`
  }
]

export const ONBOARDING_CONVERSATION_TITLE = "Welcome to Rynk"
