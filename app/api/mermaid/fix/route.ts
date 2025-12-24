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
        model: 'llama-3.1-8b-instant', // Fast model for quick fixes
        messages: [
          {
            role: 'system',
            content: `You are a Mermaid diagram syntax fixer. Fix syntax errors in the provided Mermaid code.

COMMON ERRORS TO FIX:
1. Labels with parentheses/brackets need quotes: A[Label (info)] → A["Label (info)"]
2. Labels with special chars need quotes: A[User's Data] → A["User's Data"]
3. Invalid arrows: Use --> or --- or -.-> NOT =>
4. Node IDs cannot have spaces: My Node → My_Node
5. Missing diagram type: Add 'flowchart TD' or 'graph TD' if missing
6. Unclosed brackets: Match all [], (), {}
7. Semicolons are not needed in Mermaid

RULES:
- Return ONLY the corrected Mermaid code
- Do NOT add any explanation or markdown code fences
- Do NOT change the diagram's meaning or structure
- If the code looks valid, return it unchanged`
          },
          {
            role: 'user',
            content: code
          }
        ],
        temperature: 0,
        max_tokens: 2000
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
