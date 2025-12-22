'use client'

import { cn } from '@/lib/utils'
import { PiBrain, PiMagnifyingGlass, PiSpinner, PiCheckCircle } from 'react-icons/pi'
import { Badge } from '@/components/ui/badge'

export interface StatusPill {
  status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
  message: string
  timestamp: number
}

interface StatusPillsProps {
  statuses: StatusPill[]
  className?: string
}

export function StatusPills({ statuses, className }: StatusPillsProps) {
  // Only show last 3 statuses to avoid clutter
  const visibleStatuses = statuses.slice(-3)
  
  if (visibleStatuses.length === 0) {
    return null
  }
  
  return (
    <div className={cn('flex flex-wrap gap-2 mb-3', className)}>
      {visibleStatuses.map((status, i) => {
        const config = getStatusConfig(status.status)
        const isLatest = i === visibleStatuses.length - 1
        
        return (
          <Badge
            key={status.timestamp}
            variant="secondary"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all',
              config.className,
              isLatest && 'animate-in fade-in-0 slide-in-from-left-2 duration-300',
              !isLatest && 'opacity-60'
            )}
          >
            {config.icon}
            <span>{status.message}</span>
          </Badge>
        )
      })}
    </div>
  )
}

function getStatusConfig(status: StatusPill['status']) {
  switch (status) {
    case 'analyzing':
      return {
        icon: <PiBrain className="h-3 w-3 animate-pulse" />,
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      }
    case 'searching':
      return {
        icon: <PiMagnifyingGlass className="h-3 w-3 animate-pulse" />,
        className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      }
    case 'synthesizing':
      return {
        icon: <PiSpinner className="h-3 w-3 animate-spin" />,
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      }
    case 'complete':
      return {
        icon: <PiCheckCircle className="h-3 w-3" />,
        className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      }
  }
}
