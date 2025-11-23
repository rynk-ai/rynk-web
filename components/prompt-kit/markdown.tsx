import { cn } from "@/lib/utils"
import { marked } from "marked"
import { memo, useId, useMemo, useState } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CodeBlock, CodeBlockCode } from "./code-block"
import { Copy, Check } from "lucide-react"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
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

const INITIAL_COMPONENTS: Partial<Components> = {
  // Minimal headings with subtle styling
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold tracking-tight mb-3 mt-6 first:mt-0 text-zinc-100">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold tracking-tight mb-3 mt-6 first:mt-0 text-zinc-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold tracking-tight mb-2 mt-5 text-zinc-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold tracking-tight mb-2 mt-4 text-zinc-100">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold tracking-tight mb-2 mt-4 text-zinc-200">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-semibold tracking-tight mb-2 mt-4 text-zinc-300">
      {children}
    </h6>
  ),

  // Clean, minimal paragraphs
  p: ({ children }) => (
    <p className="leading-7 text-zinc-300 [&:not(:first-child)]:mt-3 mb-3">
      {children}
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
        className="text-blue-400 hover:text-blue-300 underline underline-offset-4 hover:no-underline transition-colors"
      >
        {children}
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
      (child) => typeof child === "object" && child?.props?.node?.type === "checkbox"
    )

    if (hasCheckbox && node?.properties?.checked !== undefined) {
      const checked = node.properties.checked
      const checkboxChild = childArray.find(
        (child) => typeof child === "object" && child?.props?.node?.type === "checkbox"
      )
      const textChild = checkboxChild ? checkboxChild.props.children : childArray

      const isChecked = typeof checked === 'boolean' ? checked : false
      return (
        <li className="my-1.5 flex items-start gap-3">
          <input
            type="checkbox"
            checked={isChecked}
            disabled
            className="mt-1.5 h-4 w-4 rounded border-zinc-600 text-blue-500 focus:ring-blue-500 bg-zinc-800"
          />
          <span className={cn(
            isChecked ? "line-through text-zinc-500" : "text-zinc-300"
          )}>
            {textChild}
          </span>
        </li>
      )
    }

    return (
      <li className="leading-7 text-zinc-300">
        {children}
      </li>
    )
  },

  // Subtle blockquotes
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-zinc-700 pl-4 italic text-zinc-400">
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
    <thead className="bg-zinc-800/50">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="[&_tr:last-child]:border-0">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/30">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left align-middle font-medium text-zinc-200 text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-middle text-zinc-300 text-sm">
      {children}
    </td>
  ),

  // Subtle horizontal rule
  hr: () => (
    <hr className="my-6 h-px border-0 bg-zinc-800" />
  ),

  // Images with minimal styling
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      className="rounded-lg border border-zinc-800"
      loading="lazy"
    />
  ),

  // Strong (bold) text
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),

  // Emphasis (italic) text
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),

  // Strikethrough (GFM extension)
  s: ({ children }) => (
    <s className="line-through text-zinc-500">{children}</s>
  ),

  // Code components with dark theme focus
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      return (
        <span
          className={cn(
            "rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-sm font-medium text-zinc-200 border border-zinc-700",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)
    const codeString = String(children || "")

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

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
