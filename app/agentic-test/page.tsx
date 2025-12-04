'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createConversation } from '@/app/actions'
import { StatusPills, type StatusPill } from '@/components/chat/status-pills'
import ReactMarkdown from 'react-markdown'

export default function AgenticTestPage() {
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<StatusPill[]>([])
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    setStatuses([])
    setResponse('')
    
    try {
      // Get or create conversation
      let activeConversationId = conversationId
      if (!activeConversationId) {
        const conv = await createConversation()
        activeConversationId = conv.id
        setConversationId(activeConversationId)
      }

      const res = await fetch('/api/agentic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationId: activeConversationId
        })
      })
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'status') {
                setStatuses(prev => [...prev, {
                  status: data.status,
                  message: data.message,
                  timestamp: data.timestamp
                }])
              } else if (data.type === 'content') {
                setResponse(prev => prev + data.content)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="container max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Agentic AI Test Page</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the multi-source research system with real-time status updates
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a complex question (e.g., 'What are the latest developments in AI?')"
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>
          
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Send Agentic Request'}
          </Button>
          
          {statuses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Status:</h3>
              <StatusPills statuses={statuses} />
            </div>
          )}
          
          {response && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Response:</h3>
              <Card>
                <CardContent className="pt-4 prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
