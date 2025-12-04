"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

export type Source = {
  url: string
  title?: string
  description?: string
}

export type SourceProps = {
  sources: Source[]
  className?: string
  showAsCards?: boolean // New prop to control display style
}

/**
 * Extract domain name from URL for display
 */
function getDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    const name = domain.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return 'Source'
  }
}

/**
 * Get favicon URL using Google's favicon service
 */
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
  } catch {
    return ''
  }
}

function SourceComponent({ sources, className, showAsCards = false }: SourceProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  if (showAsCards) {
    // Card-based layout for after content
    return (
      <div className={cn("flex flex-col gap-2 mt-4 pt-4 border-t", className)}>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Sources
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((source, index) => (
            <HoverCard key={`${source.url}-${index}`}>
              <HoverCardTrigger asChild>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                    "text-xs bg-secondary/50 hover:bg-secondary",
                    "text-foreground/80 hover:text-foreground",
                    "transition-colors border border-border/50"
                  )}
                >
                  {getFaviconUrl(source.url) && (
                    <img
                      src={getFaviconUrl(source.url)}
                      alt=""
                      className="h-3.5 w-3.5"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span>{getDomainName(source.url)}</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  {source.title && (
                    <h4 className="text-sm font-semibold">{source.title}</h4>
                  )}
                  {source.description && (
                    <p className="text-sm text-muted-foreground">
                      {source.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground break-all">
                    {source.url}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      </div>
    )
  }

  // Original inline style
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {sources.map((source, index) => (
        <HoverCard key={`${source.url}-${index}`}>
          <HoverCardTrigger asChild>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 text-xs text-blue-600",
                "hover:text-blue-800 hover:underline dark:text-blue-400",
                "dark:hover:text-blue-300"
              )}
            >
              <ExternalLink className="h-3 w-3" />
              Source {index + 1}
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              {source.title && (
                <h4 className="text-sm font-semibold">{source.title}</h4>
              )}
              {source.description && (
                <p className="text-sm text-muted-foreground">
                  {source.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground break-all">
                {source.url}
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  )
}

const Source = SourceComponent
export { Source }

