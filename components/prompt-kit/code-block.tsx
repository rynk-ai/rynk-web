"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"

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
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "tokyo-night",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }

      try {
        setError(null)
        // Dynamically import Shiki only when needed (lazy loading)
        const { codeToHtml } = await import('shiki')
        const html = await codeToHtml(code, {
          lang: language as any,
          theme,
          transformers: [
            {
              pre(node) {
                // Remove the default background from shiki
                node.properties.style = ""
              },
              code(node) {
                // Add custom styling
                node.properties.class = `language-${language}`
              },
            },
          ],
        })
        setHighlightedHtml(html)
      } catch (err) {
        console.error("Syntax highlighting error:", err)
        setError(String(err))
        // Fallback to plain text
        setHighlightedHtml(null)
      }
    }
    highlight()
  }, [code, language, theme])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] leading-relaxed",
    "[&>pre]:px-4 [&>pre]:py-5",
    "[&>pre]:bg-transparent",
    "[&>code]:block",
    className
  )

  // SSR fallback: render plain code if not hydrated yet
  if (error) {
    return (
      <div className={classNames} {...props}>
        <pre className="bg-zinc-900 p-4 rounded">
          <code className="text-zinc-300">{code}</code>
        </pre>
      </div>
    )
  }

  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre className="bg-zinc-900 p-4 rounded">
        <code>{code}</code>
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
