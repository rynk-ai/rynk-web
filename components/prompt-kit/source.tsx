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
}

function SourceComponent({ sources, className }: SourceProps) {
  if (!sources || sources.length === 0) {
    return null
  }

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
