'use client'

import { cn } from "@/lib/utils"
import { PiArrowSquareOut } from "react-icons/pi"
import { useState } from "react"

interface SourceImage {
  url: string       // Image URL
  sourceUrl: string // Original article URL
  sourceTitle: string
}

interface SourceImagesProps {
  images: SourceImage[]
  className?: string
  maxImages?: number
}

/**
 * Displays a grid of images from web search results
 * - Filters out small images (likely icons)
 * - Links to original source
 * - Responsive grid layout
 */
export function SourceImages({ 
  images, 
  className,
  maxImages = 4 
}: SourceImagesProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  if (!images || images.length === 0) return null

  const visibleImages = images.slice(0, maxImages)

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    // Filter out small images (likely icons/logos) - min 100x100
    if (img.naturalWidth < 100 || img.naturalHeight < 100) {
      setFailedImages(prev => new Set(prev).add(index))
      return
    }
    setLoadedImages(prev => new Set(prev).add(index))
  }

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index))
  }

  // Count how many successfully loaded
  const loadedCount = Array.from(loadedImages).filter(i => !failedImages.has(i)).length
  
  // Don't render if all images failed or are still loading with no successes
  if (failedImages.size === visibleImages.length) {
    return null
  }

  return (
    <div className={cn("mt-4 pt-3 border-t border-border/30", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
        Images
      </span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {visibleImages.map((image, index) => (
          !failedImages.has(index) && (
            <a
              key={index}
              href={image.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative aspect-video rounded-lg overflow-hidden border border-border/40 bg-muted/30",
                "hover:border-primary/50 transition-all duration-200",
                !loadedImages.has(index) && "animate-pulse"
              )}
            >
              <img
                src={image.url}
                alt={image.sourceTitle}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onLoad={(e) => handleImageLoad(index, e)}
                onError={() => handleImageError(index)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs line-clamp-1 flex items-center gap-1">
                  <PiArrowSquareOut className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{image.sourceTitle}</span>
                </p>
              </div>
            </a>
          )
        ))}
      </div>
    </div>
  )
}

export type { SourceImage }
