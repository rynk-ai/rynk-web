"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useRef, useState } from "react"

// Import Prism core and languages we need
import Prism from "prismjs"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
  language?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, language, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose group flex w-full flex-col overflow-clip border",
        " text-card-foreground rounded-xl",
        className
      )}
      {...props}
    >
      {language && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {language}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
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

  const supportedLanguages = ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'json', 'html']
  const langToUse = supportedLanguages.includes(language.toLowerCase()) ? language.toLowerCase() : 'plaintext'

  useEffect(() => {
    if (codeRef.current && code && langToUse !== 'plaintext') {
      try {
        const grammar = Prism.languages[langToUse]
        if (grammar) {
          const html = Prism.highlight(code, grammar, langToUse)
          codeRef.current.innerHTML = html
        }
        setHighlighted(true)
      } catch (err) {
        console.error("Prism error:", err)
        setHighlighted(true)
      }
    } else {
      setHighlighted(true)
    }
  }, [code, langToUse])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4",
    className
  )

  return (
    <div className={classNames} {...props}>
      <pre>
        <code ref={codeRef} className={`language-${langToUse}`}>
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
      className={cn("flex items-center justify-between ", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
