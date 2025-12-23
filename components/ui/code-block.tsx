"use client"

import { cn } from "@/lib/utils"
import React from "react"

// Simple code block without syntax highlighting to minimize bundle size

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
  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4",
    className
  )

  return (
    <div className={classNames} {...props}>
      <pre>
        <code className={`language-${language} text-zinc-300`}>
          {code}
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
