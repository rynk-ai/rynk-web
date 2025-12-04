'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export interface DiscoveredSource {
  url: string
  title: string
  domain: string
  favicon?: string
  snippet?: string
  isNew?: boolean
}

interface LiveSourcePillsProps {
  sources: DiscoveredSource[]
  isSearching: boolean
}

export function LiveSourcePills({ sources, isSearching }: LiveSourcePillsProps) {
  if (sources.length === 0 && !isSearching) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 px-1">
      <AnimatePresence mode="popLayout">
        {sources.map((source, i) => (
          <motion.div
            key={source.url}
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <SourcePill source={source} />
          </motion.div>
        ))}
        {isSearching && (
          <motion.div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground border border-border/30"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Finding sources...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SourcePill({ source }: { source: DiscoveredSource }) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <a 
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/40 hover:bg-secondary/70 text-[10px] cursor-pointer transition-colors border border-border/30"
        >
          {source.favicon && (
            <img 
              src={source.favicon} 
              className="h-3 w-3 rounded-sm opacity-80" 
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <span className="max-w-[120px] truncate font-medium text-foreground/80">
            {source.domain}
          </span>
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-3">
        <h4 className="font-medium text-sm line-clamp-2">{source.title}</h4>
        {source.snippet && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
            {source.snippet}
          </p>
        )}
        <div className="text-[10px] text-muted-foreground mt-2 truncate opacity-70">
          {source.url}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
