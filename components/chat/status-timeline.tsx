'use client'

import React from 'react'
import { motion } from 'motion/react'
import { PiBrain, PiGlobe, PiMagnifyingGlass, PiSparkle, PiCheck, PiSpinner } from 'react-icons/pi'
import { cn } from '@/lib/utils'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface StatusStep {
  id: string
  label: string
  description?: string
  icon: 'brain' | 'globe' | 'search' | 'sparkles' | 'check' | 'analyzing' | 'synthesizing'
  status: 'pending' | 'active' | 'complete' | 'error'
  metadata?: {
    sources?: string[]
    resultCount?: number
    duration?: number
  }
}

interface StatusTimelineProps {
  steps: StatusStep[]
  currentStep: number
  isComplete: boolean
  className?: string
}

export function StatusTimeline({ steps, currentStep, isComplete, className }: StatusTimelineProps) {
  // If no steps, don't render anything
  if (!steps || steps.length === 0) return null

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-muted/50 to-transparent rounded-xl border border-border/30 overflow-x-auto no-scrollbar",
      className
    )}>
      {steps.map((step, i) => (
        <React.Fragment key={`${step.id}-${i}`}>
          <StatusStepItem 
            step={step} 
            isActive={i === currentStep && !isComplete} 
            isCompleted={i < currentStep || isComplete}
          />
          {i < steps.length - 1 && (
            <div 
              className={cn(
                "flex-1 min-w-[20px] h-0.5 rounded-full transition-colors duration-500",
                i < currentStep || isComplete ? "bg-primary/50" : "bg-border"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function StatusStepItem({ 
  step, 
  isActive, 
  isCompleted 
}: { 
  step: StatusStep
  isActive: boolean
  isCompleted: boolean
}) {
  const icons = {
    brain: PiBrain,
    globe: PiGlobe,
    search: PiMagnifyingGlass,
    sparkles: PiSparkle,
    check: PiCheck,
    analyzing: PiBrain,
    synthesizing: PiSparkle
  }
  
  // Fallback to Sparkles if icon not found
  const Icon = icons[step.icon] || PiSparkle
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap cursor-default",
              isActive && "bg-primary/10 text-primary border border-primary/20",
              isCompleted && "text-muted-foreground",
              step.status === 'pending' && "text-muted-foreground/50"
            )}
            animate={isActive ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {isActive ? (
              <PiSpinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className={cn(
                "h-3.5 w-3.5",
                isCompleted && "text-primary"
              )} />
            )}
            
            <span className="font-medium text-xs">{step.label}</span>
            
            {step.metadata?.resultCount && (
              <span className="text-[10px] bg-primary/20 px-1.5 rounded-full font-semibold">
                {step.metadata.resultCount}
              </span>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{step.description || step.label}</p>
          {step.metadata?.sources && (
            <div className="text-xs mt-1 text-muted-foreground">
              {step.metadata.sources.join(', ')}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
