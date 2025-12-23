"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState, useRef } from "react"

// Import Prism core and languages we need
import Prism from "prismjs"
// Import languages (order matters for dependencies)
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-python"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-sql"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border border-zinc-800",
        "bg-zinc-900/50 text-zinc-100 rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "typescript",
  className,
  ...props
}: CodeBlockCodeProps) {
  const codeRef = useRef<HTMLElement>(null)
  const [highlighted, setHighlighted] = useState(false)

  // Normalize language aliases
  const normalizeLanguage = (lang: string): string => {
    const aliases: Record<string, string> = {
      'sh': 'bash',
      'shell': 'bash',
      'ts': 'typescript',
      'js': 'javascript',
      'text': 'plaintext',
      'txt': 'plaintext',
      'plaintext': 'plaintext',
    }
    return aliases[lang.toLowerCase()] || lang.toLowerCase()
  }

  const normalizedLang = normalizeLanguage(language)
  
  // Check if language is supported by Prism
  const supportedLanguages = ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'json', 'markdown', 'python', 'bash', 'sql', 'html', 'plaintext']
  const langToUse = supportedLanguages.includes(normalizedLang) ? normalizedLang : 'plaintext'

  useEffect(() => {
    if (codeRef.current && code) {
      // For plaintext, just show as-is
      if (langToUse === 'plaintext') {
        setHighlighted(true)
        return
      }
      
      // Use Prism to highlight
      try {
        const grammar = Prism.languages[langToUse]
        if (grammar) {
          const html = Prism.highlight(code, grammar, langToUse)
          codeRef.current.innerHTML = html
        }
        setHighlighted(true)
      } catch (err) {
        console.error("Prism highlighting error:", err)
        setHighlighted(true)
      }
    }
  }, [code, langToUse])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] leading-relaxed",
    className
  )

  return (
    <div className={classNames} {...props}>
      <pre className="px-4 py-5 bg-transparent overflow-x-auto">
        <code 
          ref={codeRef}
          className={`language-${langToUse} block`}
        >
          {!highlighted && code}
        </code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockHeaderProps = {
  language: string
  className?: string
}

function CodeBlockHeader({ language, className }: CodeBlockHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800",
        className
      )}
    >
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
        {language}
      </span>
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock, CodeBlockHeader }
