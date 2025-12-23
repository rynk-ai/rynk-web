"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PiCaretLeft, PiCaretRight } from "react-icons/pi"
import { cn } from "@/lib/utils"
import type { Message } from "@/lib/services/indexeddb"

interface VersionIndicatorProps {
  message: Message
  versions: Message[]
  onSwitchVersion: (messageId: string) => Promise<void>
  onReloadMessages?: () => void
  isLoading?: boolean
}

export function VersionIndicator({
  message,
  versions,
  onSwitchVersion,
  onReloadMessages,
  isLoading = false,
}: VersionIndicatorProps) {
  const [isSwitching, setIsSwitching] = useState(false)

  // Don't show version indicator for messages with no versions
  if (versions.length <= 1) {
    return null
  }

  // Sort versions by version number
  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber)
  const currentIndex = sortedVersions.findIndex(v => v.id === message.id)
  const currentVersion = currentIndex + 1
  const totalVersions = sortedVersions.length

  const handleSwitch = async (direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= sortedVersions.length) {
      return
    }

    const targetVersion = sortedVersions[targetIndex]
    if (targetVersion.id === message.id) return

    try {
      setIsSwitching(true)
      await onSwitchVersion(targetVersion.id)
      // Reload messages after version switch
      onReloadMessages?.()
    } catch (err) {
      console.error('Failed to switch version:', err)
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        isSwitching && "opacity-50 pointer-events-none"
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-accent"
        onClick={() => handleSwitch('prev')}
        disabled={currentIndex === 0 || isSwitching || isLoading}
      >
        <PiCaretLeft size={14} />
      </Button>

      <span className="px-2 text-xs font-mono tabular-nums">
        {currentVersion}/{totalVersions}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-accent"
        onClick={() => handleSwitch('next')}
        disabled={currentIndex === totalVersions - 1 || isSwitching || isLoading}
      >
        <PiCaretRight size={14} />
      </Button>
    </div>
  )
}
