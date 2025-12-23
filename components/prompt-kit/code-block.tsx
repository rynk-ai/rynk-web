"use client"

import { cn } from "@/lib/utils"
import React from "react"

// Simple code block component - no syntax highlighting to minimize bundle size
// Cloudflare Workers free tier has 3MB limit

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
  const classNames = cn(
    "w-full overflow-x-auto text-[13px] leading-relaxed",
    className
  )

  return (
    <div className={classNames} {...props}>
      <pre className="px-4 py-5 bg-transparent overflow-x-auto">
        <code className={`language-${language} block text-zinc-300`}>
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
