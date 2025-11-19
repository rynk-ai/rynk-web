"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface InlineTitleEditProps {
  title: string
  onSave: (newTitle: string) => Promise<void>
  className?: string
  isEditing?: boolean
  onEditChange?: (isEditing: boolean) => void
  autoFocus?: boolean
}

export function InlineTitleEdit({
  title,
  onSave,
  className,
  isEditing: controlledIsEditing,
  onEditChange,
  autoFocus = true,
}: InlineTitleEditProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false)
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEditing = controlledIsEditing ?? internalIsEditing

  useEffect(() => {
    setValue(title)
  }, [title])

  useEffect(() => {
    if (isEditing && autoFocus) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing, autoFocus])

  const handleSave = async () => {
    if (value.trim() && value !== title) {
      await onSave(value)
    } else {
      setValue(title) // Reset if empty or unchanged
    }
    
    if (onEditChange) {
      onEditChange(false)
    } else {
      setInternalIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setValue(title)
      if (onEditChange) {
        onEditChange(false)
      } else {
        setInternalIsEditing(false)
      }
    }
  }

  const handleBlur = () => {
    handleSave()
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-auto py-0 px-0 text-inherit font-inherit bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 m-0 w-full min-w-[200px]",
          className
        )}
      />
    )
  }

  return (
    <span 
      className={cn("truncate cursor-text", className)}
      onDoubleClick={() => {
        if (onEditChange) {
          onEditChange(true)
        } else {
          setInternalIsEditing(true)
        }
      }}
    >
      {title}
    </span>
  )
}
