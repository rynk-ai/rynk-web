'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { PiCopy, PiCheck, PiWarningCircle, PiArrowsOut, PiX, PiSpinner } from "react-icons/pi"

interface MermaidDiagramProps {
  code: string
  className?: string
  // Optional: for persisting fixes to DB
  messageId?: string
  conversationId?: string
}

// Generate mermaid image URL from code (using self-hosted renderer)
function getMermaidImageUrl(code: string, theme: 'dark' | 'light' = 'dark'): string {
  // Encode the mermaid code to base64
  const encoded = btoa(unescape(encodeURIComponent(code)))
  // Use self-hosted mermaid renderer (fallback to public mermaid.ink if needed)
  return `https://mermaid.rynk.io/img/${encoded}?theme=${theme}&bgColor=transparent`
}

export function MermaidDiagram({ code, className, messageId, conversationId }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Auto-fix state
  const [isFixing, setIsFixing] = useState(false)
  const [fixedCode, setFixedCode] = useState<string | null>(null)
  const [fixAttempted, setFixAttempted] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fixedCode || code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Auto-fix handler
  const attemptFix = useCallback(async () => {
    if (fixAttempted || isFixing) return
    
    setIsFixing(true)
    setFixAttempted(true)
    
    try {
      const response = await fetch('/api/mermaid/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          messageId,
          conversationId
        })
      })
      
      if (response.ok) {
        const data = await response.json() as { fixed: boolean; code?: string }
        if (data.fixed && data.code) {
          setFixedCode(data.code)
          setError(null)
          setImageLoaded(false)
        } else {
          // LLM couldn't fix it or code was unchanged
          setError('Diagram syntax error - could not auto-fix')
        }
      } else {
        setError('Failed to render diagram')
      }
    } catch (err) {
      console.error('Failed to fix mermaid:', err)
      setError('Failed to render diagram')
    } finally {
      setIsFixing(false)
    }
  }, [code, messageId, conversationId, fixAttempted, isFixing])

  // Handle image load error
  const handleImageError = useCallback(() => {
    if (!fixAttempted && !isFixing) {
      attemptFix()
    } else {
      setError('Failed to render diagram')
    }
  }, [attemptFix, fixAttempted, isFixing])

  const currentCode = fixedCode || code
  const imageUrl = getMermaidImageUrl(currentCode.trim())

  // Fixing state
  if (isFixing) {
    return (
      <div className={cn("my-4 rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-6 flex items-center justify-center gap-3", className)}>
        <PiSpinner className="h-5 w-5 animate-spin text-zinc-400" />
        <span className="text-zinc-400 text-sm">Fixing diagram syntax...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn("my-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4", className)}>
        <div className="flex items-start gap-2 text-red-400">
          <PiWarningCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to render diagram</p>
            <p className="text-sm mt-1 text-red-400/80">{error}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Copy code to debug
        </button>
      </div>
    )
  }

  // Expanded modal view
  if (isExpanded) {
    const modal = (
      <div 
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
        onClick={() => setIsExpanded(false)}
      >
        <div 
          className="relative w-full h-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
            <span className="text-sm font-medium text-zinc-300">Mermaid Diagram</span>
            <div className="flex items-center gap-2">
              <button
                className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                onClick={handleCopy}
                aria-label="Copy code"
              >
                {copied ? <PiCheck className="h-4 w-4 text-emerald-400" /> : <PiCopy className="h-4 w-4" />}
              </button>
              <button
                className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                onClick={() => setIsExpanded(false)}
                aria-label="Close"
              >
                <PiX className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Diagram - full size */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-zinc-950">
            <img 
              src={imageUrl}
              alt="Mermaid Diagram"
              className="max-w-full max-h-full object-contain"
              onError={handleImageError}
            />
          </div>
        </div>
      </div>
    )

    return (
      <>
        {modal}
        {/* Placeholder in document flow */}
        <div className={cn("my-4 rounded-lg border border-gray-500/30 bg-gray-900/80 p-4 text-center text-gray-400", className)}>
          <PiArrowsOut className="w-5 h-5 mx-auto mb-2 opacity-50" />
          <span className="text-sm">Diagram expanded (click backdrop to close)</span>
        </div>
      </>
    )
  }

  // Normal view
  return (
    <div className={cn("my-4 rounded-lg border border-zinc-700/50 bg-zinc-900/80 overflow-hidden group relative", className)}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="h-6 w-6 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
          onClick={() => setIsExpanded(true)}
          aria-label="Expand diagram"
          title="Expand"
        >
          <PiArrowsOut className="h-4 w-4" />
        </button>
        <button
          className="h-6 w-6 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
          onClick={handleCopy}
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? <PiCheck className="h-4 w-4 text-emerald-400" /> : <PiCopy className="h-4 w-4" />}
        </button>
      </div>
      {/* Diagram */}
      <div 
        ref={containerRef}
        className="pt-10 pb-4 overflow-x-auto flex items-center justify-center min-h-[150px]"
      >
        {!imageLoaded && (
          <div className="text-zinc-500 text-sm">Loading diagram...</div>
        )}
        <img 
          src={imageUrl}
          alt="Mermaid Diagram"
          className={cn(
            "max-w-full object-contain transition-opacity",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
          style={{ minHeight: imageLoaded ? 'auto' : 0 }}
        />
      </div>
    </div>
  )
}
