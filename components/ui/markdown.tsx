import { cn } from "@/lib/utils";
import { memo, useId, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { CodeBlock, CodeBlockCode } from "./code-block";
import { Button } from "./button";
import { PiCopy, PiCheck } from "react-icons/pi";

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-2 top-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? (
        <PiCheck className="h-4 w-4 text-green-500" />
      ) : (
        <PiCopy className="h-4 w-4" />
      )}
    </Button>
  );
}

const INITIAL_COMPONENTS: Partial<Components> = {
  // Headings with custom styling and anchor links
  h1: ({ children }) => (
    <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl mb-2 mt-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="scroll-m-20 border-b pb-1 text-2xl font-semibold tracking-tight first:mt-0 mt-4 mb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="scroll-m-20 text-xl font-semibold tracking-tight mt-3 mb-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mt-3 mb-1">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="scroll-m-20 text-base font-semibold tracking-tight mt-3 mb-1">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="scroll-m-20 text-sm font-semibold tracking-tight mt-3 mb-1">
      {children}
    </h6>
  ),

  // Paragraphs with better spacing
  p: ({ children }) => (
    <p className="leading-6 [&:not(:first-child)]:mt-2">
      {children}
    </p>
  ),

  // Links with external link indicators
  a: ({ href, children }) => {
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="font-medium text-primary underline underline-offset-4 hover:no-underline transition-all"
      >
        {children}
        {isExternal && (
          <span className="ml-1 inline-block">↗</span>
        )}
      </a>
    );
  },

  // Lists with better spacing and nesting
  ul: ({ children }) => (
    <ul className="my-2 ml-6 list-disc [&>li]:mt-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-6 list-decimal [&>li]:mt-1">
      {children}
    </ol>
  ),
  li: ({ node, children }) => {
    const childArray = Array.isArray(children) ? children : [children];
    const hasCheckbox = childArray.some(
      (child) => typeof child === "object" && child?.props?.node?.type === "checkbox"
    );

    if (hasCheckbox && node?.properties?.checked !== undefined) {
      const checked = node.properties.checked;
      const checkboxChild = childArray.find(
        (child) => typeof child === "object" && child?.props?.node?.type === "checkbox"
      );
      const textChild = checkboxChild ? checkboxChild.props.children : childArray;

      const isChecked = typeof checked === 'boolean' ? checked : false;
      return (
        <li className="my-2 flex items-start gap-3">
          <input
            type="checkbox"
            checked={isChecked}
            disabled
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className={cn(
            isChecked ? "line-through text-muted-foreground" : ""
          )}>
            {textChild}
          </span>
        </li>
      );
    }

    return (
      <li className="leading-7">
        {children}
      </li>
    );
  },

  // Blockquotes with better styling
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Tables with full styling
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full">
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
    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {children}
    </td>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-4 h-px border-0 bg-border md:my-8" />
  ),

  // Images with better styling
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
    <strong className="font-semibold">{children}</strong>
  ),

  // Emphasis (italic) text
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),

  // Strikethrough (GFM extension)
  s: ({ children }) => (
    <s className="line-through text-muted-foreground">{children}</s>
  ),

  // Inline code with enhanced styling
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line;

    if (isInline) {
      return (
        <span
          className={cn(
            "rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-medium text-foreground",
            "before:content-[''] after:content-['']",
            className,
          )}
          {...props}
        >
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);
    const codeString = String(children || "");

    return (
      <div className="group relative">
        <CodeBlock className={className} language={language}>
          <CodeBlockCode code={codeString} language={language} />
        </CodeBlock>
        <CopyButton code={codeString} />
      </div>
    );
  },

  // Pre component - pass through as we handle everything in code
  pre: function PreComponent({ children }) {
    return <>{children}</>;
  },
};

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
