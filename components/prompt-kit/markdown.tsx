'use client'

import { cn } from "@/lib/utils"
import { marked } from "marked"
import { memo, useId, useMemo, useState, createContext, useContext, ReactNode, Fragment } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CodeBlock, CodeBlockCode } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { Copy, Check } from "lucide-react"
import type { Citation } from "@/lib/types/citation"
import { InlineCitation } from "@/components/chat/inline-citation"

// Citation Context for passing citations deep into components
const CitationContext = createContext<Citation[]>([])

export function useCitations() {
  return useContext(CitationContext)
}

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
  citations?: Citation[]
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      className="h-8 w-8 p-0 flex items-center justify-center rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors duration-200"
      onClick={handleCopy}
      aria-label="Copy code"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  )
}

/**
 * Parse text content to detect [n] citation patterns and replace with interactive components
 */
function parseCitationsInText(text: string, citations: Citation[]): ReactNode[] {
  if (!text || citations.length === 0) return [text]
  
  const citationRegex = /\[(\d+)\]/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  let keyIndex = 0
  
  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    
    const citationId = parseInt(match[1])
    const citation = citations.find(c => c.id === citationId)
    
    if (citation) {
      parts.push(
        <InlineCitation 
          key={`citation-${keyIndex++}`} 
          id={citationId} 
          citation={citation} 
        />
      )
    } else {
      // Keep original if citation not found (might be a valid reference like [1] in code)
      parts.push(match[0])
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  
  return parts.length > 0 ? parts : [text]
}

/**
 * Recursively process children to replace citation patterns
 */
function processChildrenForCitations(children: ReactNode, citations: Citation[]): ReactNode {
  if (!children) return children
  if (citations.length === 0) return children
  
  if (typeof children === 'string') {
    const parts = parseCitationsInText(children, citations)
    return parts.length === 1 ? parts[0] : <>{parts}</>
  }
  
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <Fragment key={index}>
        {processChildrenForCitations(child, citations)}
      </Fragment>
    ))
  }
  
  return children
}

/**
 * Create citation-aware component overrides
 */
function createCitationAwareComponents(citations: Citation[]): Partial<Components> {
  return {
    // Minimal headings with subtle styling
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold tracking-tight mb-3 mt-6 first:mt-0 text-foreground">
        {processChildrenForCitations(children, citations)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold tracking-tight mb-3 mt-6 first:mt-0 text-foreground">
        {processChildrenForCitations(children, citations)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold tracking-tight mb-2 mt-5 text-foreground">
        {processChildrenForCitations(children, citations)}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold tracking-tight mb-2 mt-4 text-foreground">
        {processChildrenForCitations(children, citations)}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-semibold tracking-tight mb-2 mt-4 text-foreground">
        {processChildrenForCitations(children, citations)}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-semibold tracking-tight mb-2 mt-4 text-muted-foreground">
        {processChildrenForCitations(children, citations)}
      </h6>
    ),

    // Clean, minimal paragraphs with citation support
    p: ({ children }) => (
      <p className="leading-7 text-foreground [&:not(:first-child)]:mt-3 mb-3">
        {processChildrenForCitations(children, citations)}
      </p>
    ),

    // Links with subtle styling
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http")
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary hover:text-primary/80 underline underline-offset-4 hover:no-underline transition-colors"
        >
          {processChildrenForCitations(children, citations)}
          {isExternal && <span className="ml-1 inline-block">↗</span>}
        </a>
      )
    },

    // Lists with minimal spacing
    ul: ({ children }) => (
      <ul className="my-3 ml-6 list-disc [&>li]:mt-1.5 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 ml-6 list-decimal [&>li]:mt-1.5 space-y-1">
        {children}
      </ol>
    ),
    li: ({ node, children }) => {
      const childArray = Array.isArray(children) ? children : [children]
      const hasCheckbox = childArray.some(
        (child) => typeof child === "object" && (child as any)?.props?.node?.type === "checkbox"
      )

      if (hasCheckbox && node?.properties?.checked !== undefined) {
        const checked = node.properties.checked
        const checkboxChild = childArray.find(
          (child) => typeof child === "object" && (child as any)?.props?.node?.type === "checkbox"
        )
        const textChild = checkboxChild ? (checkboxChild as any).props.children : childArray

        const isChecked = typeof checked === 'boolean' ? checked : false
        return (
          <li className="my-1.5 flex items-start gap-3">
            <input
              type="checkbox"
              checked={isChecked}
              disabled
              className="mt-1.5 h-4 w-4 rounded border-border text-primary focus:ring-primary bg-muted"
            />
            <span className={cn(
              isChecked ? "line-through text-muted-foreground/60" : "text-foreground"
            )}>
              {processChildrenForCitations(textChild, citations)}
            </span>
          </li>
        )
      }

      return (
        <li className="leading-7 text-foreground">
          {processChildrenForCitations(children, citations)}
        </li>
      )
    },

    // Subtle blockquotes
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Clean tables with hover effects
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="[&_tr:last-child]:border-0">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-border transition-colors hover:bg-muted/30">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left align-middle font-medium text-foreground text-sm">
        {processChildrenForCitations(children, citations)}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 align-middle text-foreground text-sm">
        {processChildrenForCitations(children, citations)}
      </td>
    ),

    // Subtle horizontal rule
    hr: () => (
      <hr className="my-6 h-px border-0 bg-border" />
    ),

    // Images with minimal styling
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className="rounded-lg border border-border"
        loading="lazy"
      />
    ),

    // Strong (bold) text
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">
        {processChildrenForCitations(children, citations)}
      </strong>
    ),

    // Emphasis (italic) text
    em: ({ children }) => (
      <em className="italic text-foreground">
        {processChildrenForCitations(children, citations)}
      </em>
    ),

    // Strikethrough (GFM extension)
    s: ({ children }) => (
      <s className="line-through text-muted-foreground">
        {processChildrenForCitations(children, citations)}
      </s>
    ),

    // Code components with theme-aware styling
    code: function CodeComponent({ className, children, ...props }) {
      const isInline =
        !(props as any).node?.position?.start.line ||
        (props as any).node?.position?.start.line === (props as any).node?.position?.end.line

      if (isInline) {
        return (
          <span
            className={cn(
              "rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-medium text-foreground border border-border",
              className
            )}
          >
            {children}
          </span>
        )
      }

      const language = extractLanguage(className)
      const codeString = String(children || "")

      // Special handling for mermaid diagrams - render as actual diagrams
      if (language === 'mermaid') {
        return <MermaidDiagram code={codeString} />
      }

      return (
        <div className="my-4">
          <CodeBlock className={className}>
            <div className="relative flex flex-col">
              <div className="absolute top-2 right-2 z-10 self-end">
                <CopyButton code={codeString} />
              </div>
              <CodeBlockCode code={codeString} language={language} />
            </div>
          </CodeBlock>
        </div>
      )
    },

    // Pre component - pass through as we handle everything in code
    pre: function PreComponent({ children }) {
      return <>{children}</>
    },
  }
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components,
    citations = [],
  }: {
    content: string
    components?: Partial<Components>
    citations?: Citation[]
  }) {
    // Merge custom components with citation-aware defaults
    const citationAwareComponents = useMemo(
      () => createCitationAwareComponents(citations),
      [citations]
    )
    
    const mergedComponents = useMemo(
      () => ({ ...citationAwareComponents, ...components }),
      [citationAwareComponents, components]
    )
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return (
      prevProps.content === nextProps.content &&
      prevProps.citations?.length === nextProps.citations?.length
    )
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components,
  citations = [],
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <CitationContext.Provider value={citations}>
      <div className={className}>
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            key={`${blockId}-block-${index}`}
            content={block}
            components={components}
            citations={citations}
          />
        ))}
      </div>
    </CitationContext.Provider>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
