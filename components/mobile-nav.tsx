"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  children: React.ReactNode
  title?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MobileNav({ children, title = "Menu", open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface MobileTriggerProps {
  className?: string
}

export function MobileTrigger({ className }: MobileTriggerProps) {
  return (
    <SheetTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn("md:hidden h-10 w-10", className)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
  )
}
