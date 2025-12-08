'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { cn } from '@/lib/utils'
import { Copy, Check, AlertCircle, Maximize2, X } from 'lucide-react'

interface MermaidDiagramProps {
  code: string
  className?: string
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const uniqueId = useId().replace(/:/g, '')

  useEffect(() => {
    async function renderDiagram() {
      if (!code.trim()) {
        setError('Empty diagram code')
        return
      }

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default
        
        // Initialize mermaid with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#3b82f6',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            background: '#020617',
            mainBkg: '#1e293b',
            nodeBorder: '#3b82f6',
            clusterBkg: '#1e293b',
            clusterBorder: '#334155',
            titleColor: '#f1f5f9',
            edgeLabelBackground: '#1e293b',
          }
        })

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${uniqueId}`, code)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg(null)
      }
    }

    renderDiagram()
  }, [code, uniqueId])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Error state
  if (error) {
    return (
      <div className={cn("my-4 rounded-lg border border-red-500/30 bg-red-950/20 overflow-hidden", className)}>
        <div className="flex items-center justify-between px-4 py-2 bg-red-950/40 border-b border-red-500/30">
          <span className="text-xs font-medium text-red-400 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Diagram Error
          </span>
          <button
            className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-900/50 p-2 rounded">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    )
  }

  // Loading state
  if (!svg) {
    return (
      <div className={cn("my-4 rounded-lg border border-blue-500/30 bg-blue-950/20 overflow-hidden", className)}>
        <div className="flex items-center justify-between px-4 py-2 bg-blue-950/40 border-b border-blue-500/30">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wide flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Rendering diagram...
          </span>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Expanded modal view - use portal to escape parent stacking contexts
  if (isExpanded && typeof document !== 'undefined') {
    const { createPortal } = require('react-dom')
    
    const modal = (
      <div 
        className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
        onClick={() => setIsExpanded(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Modal */}
        <div 
          className="relative bg-zinc-900 rounded-lg border border-zinc-700 w-[90vw] h-[90vh] flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-700">
            <span className="text-sm font-medium text-zinc-300">Mermaid Diagram</span>
            <div className="flex items-center gap-2">
              <button
                className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                onClick={handleCopy}
                aria-label="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                onClick={() => setIsExpanded(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Diagram - scrollable vertically only */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex items-start justify-center bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
    )

    return (
      <>
        {createPortal(modal, document.body)}
        {/* Placeholder in document flow */}
        <div className={cn("my-4 rounded-lg border border-gray-500/30 bg-gray-900/80 p-4 text-center text-gray-400", className)}>
          <Maximize2 className="w-5 h-5 mx-auto mb-2 opacity-50" />
          <span className="text-sm">Diagram expanded (click backdrop to close)</span>
        </div>
      </>
    )
  }

  // Normal rendered state
  return (
    <div className={cn("my-4 rounded-lg border border-gray-500/30 bg-gray-900/80 overflow-hidden", className)}>
      {/* Header */}
      <div className="absolute right-0 flex items-center justify-between px-4 py-2 ">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
        </span>
        <div className="flex items-center gap-1">
          <button
            className="h-6 w-6 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
            onClick={() => setIsExpanded(true)}
            aria-label="Expand diagram"
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            className="h-6 w-6 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
            onClick={handleCopy}
            aria-label="Copy code"
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {/* Diagram */}
      <div 
        ref={containerRef}
        className="pt-10 pb-4 overflow-x-auto flex items-center justify-center [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
