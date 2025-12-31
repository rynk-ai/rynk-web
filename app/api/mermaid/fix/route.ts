import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'

/**
 * POST /api/mermaid/fix
 * 
 * Validates and fixes Mermaid diagram syntax errors using LLM.
 * Persists the fix to the message in DB to avoid repeated calls.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      code: string
      messageId?: string  // Optional: if provided, will update the message in DB
      conversationId?: string
    }

    const { code, messageId, conversationId } = body

    if (!code || code.trim().length === 0) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    // Use Groq for fast inference
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          {
            role: 'system',
            content: `You are an expert Mermaid diagram syntax fixer. Your job is to fix syntax errors in Mermaid code so it renders correctly.

CRITICAL SYNTAX RULES:
1. All labels with special characters MUST be quoted: 
   - A[Label (info)] → A["Label (info)"]
   - A[User's Data] → A["User's Data"]
   - A[Data & Info] → A["Data & Info"]
   
2. Valid arrow syntax (ONLY these are allowed):
   - --> (solid arrow)
   - --- (solid line)
   - -.-> (dotted arrow)
   - ==> (thick arrow)
   - --text--> (arrow with label)
   - INVALID: =>, ->, ~>, ::>
   
3. Node IDs must NOT have spaces:
   - My Node --> B → MyNode --> B
   
4. Every diagram MUST start with a type declaration:
   - flowchart TD, flowchart LR, graph TD, sequenceDiagram, etc.
   
5. All brackets must be balanced: [], (), {}, <>

6. Subgraph syntax:
   - subgraph Title
   -   content
   - end

EXAMPLES OF VALID MERMAID:
\`\`\`
flowchart TD
    A["User Request"] --> B["Process Data"]
    B --> C{"Decision?"}
    C -->|Yes| D["Action A"]
    C -->|No| E["Action B"]
\`\`\`

\`\`\`
sequenceDiagram
    participant A as User
    participant B as Server
    A->>B: Request
    B-->>A: Response
\`\`\`

OUTPUT RULES:
- Return ONLY the corrected Mermaid code
- Do NOT include \`\`\`mermaid or \`\`\` fences
- Do NOT add explanations
- Preserve the diagram's meaning and structure
- If code is already valid, return it unchanged`
          },
          {
            role: 'user',
            content: `Fix this Mermaid diagram syntax:\n\n${code}`
          }
        ],
        temperature: 0,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      console.error('[mermaid/fix] Groq API error:', response.status)
      return NextResponse.json({ fixed: false, error: 'LLM API error' }, { status: 500 })
    }

    const data: any = await response.json()
    let fixedCode = data.choices?.[0]?.message?.content?.trim() || code

    // Remove code fences if LLM added them
    fixedCode = fixedCode
      .replace(/^```mermaid\n?/i, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/g, '')
      .trim()

    // Check if the code was actually changed
    const wasFixed = fixedCode !== code.trim()

    // If messageId is provided, update the message in DB
    if (wasFixed && messageId && conversationId) {
      try {
        // Get the current message content
        const { messages } = await cloudDb.getMessages(conversationId, 1000)
        const message = messages?.find(m => m.id === messageId)
        
        if (message && message.content) {
          // Replace the old mermaid code with the fixed code
          // Use regex to find and replace the mermaid code block
          const mermaidBlockRegex = /```mermaid\n[\s\S]*?\n```/g
          let updatedContent = message.content
          
          // Find all mermaid blocks and replace the one that matches
          const matches = message.content.match(mermaidBlockRegex)
          if (matches) {
            for (const match of matches) {
              const blockCode = match.replace(/```mermaid\n?/, '').replace(/\n?```$/, '').trim()
              if (blockCode === code.trim()) {
                updatedContent = message.content.replace(match, '```mermaid\n' + fixedCode + '\n```')
                break
              }
            }
          }

          // Update the message in DB
          if (updatedContent !== message.content) {
            await cloudDb.updateMessage(messageId, { content: updatedContent })
            console.log(`[mermaid/fix] Updated message ${messageId} with fixed diagram`)
          }
        }
      } catch (dbError) {
        // Log but don't fail - the fix was successful even if DB update failed
        console.error('[mermaid/fix] Failed to update DB:', dbError)
      }
    }

    return NextResponse.json({
      fixed: wasFixed,
      code: fixedCode
    })

  } catch (error) {
    console.error('[mermaid/fix] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fix Mermaid syntax' },
      { status: 500 }
    )
  }
}
