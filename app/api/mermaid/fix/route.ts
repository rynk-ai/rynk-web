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
            content: `You are an expert Mermaid diagram syntax fixer. Your ONLY job is to fix syntax errors so diagrams render correctly.

CRITICAL RULE - QUOTE ALL LABELS:
You MUST wrap ALL node labels in double quotes. This is the most common cause of render failures.
- A[Label] → A["Label"]
- A[User Request] → A["User Request"]  
- A[God's Existence] → A["God's Existence"]
- A{Decision} → A{"Decision"}
- A(Process) → A("Process")
- A((Circle)) → A(("Circle"))

ARROW SYNTAX (only these are valid):
- --> (solid arrow)
- --- (solid line)
- -.-> (dotted arrow) 
- ==> (thick arrow)
- --text--> (labeled arrow)
- INVALID: =>, ->, ~>

OTHER RULES:
- Node IDs cannot have spaces: My Node → MyNode
- Must start with: flowchart TD/LR, graph TD/LR, sequenceDiagram, etc.
- Balance all brackets: [], (), {}, <>

EXAMPLE OF CORRECT OUTPUT:
flowchart TD
    A["User Request"] --> B["Process Data"]
    B --> C{"Decision?"}
    C -->|Yes| D["Action A"]
    C -->|No| E["Action B"]

OUTPUT RULES:
- Return ONLY the corrected Mermaid code
- Quote EVERY label in square brackets [], curly braces {}, and parentheses ()
- Do NOT include \`\`\`mermaid or \`\`\` code fences
- Do NOT add any explanations`
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
