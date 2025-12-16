/**
 * Research Progress Component
 * 
 * Shows real-time progress during research generation with:
 * - Phase indicator with animated steps
 * - Vertical search progress
 * - Sources found counter
 * - Section generation progress
 */

"use client";

import { memo } from "react";
import { 
  Search, 
  GitBranch, 
  Globe, 
  FileText, 
  Edit, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResearchProgressProps {
  progress?: {
    current: number;
    total: number;
    message: string;
    step?: string;
  };
  isComplete?: boolean;
}

interface ProgressStepProps {
  icon: React.ElementType;
  label: string;
  status: 'pending' | 'active' | 'completed';
  detail?: string;
}

function ProgressStep({ icon: Icon, label, status, detail }: ProgressStepProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300",
      status === 'active' && "bg-primary/10 border border-primary/20",
      status === 'completed' && "opacity-60",
      status === 'pending' && "opacity-40"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
        status === 'active' && "bg-primary text-primary-foreground",
        status === 'completed' && "bg-green-500/20 text-green-600",
        status === 'pending' && "bg-muted text-muted-foreground"
      )}>
        {status === 'active' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          status === 'active' && "text-foreground",
          status !== 'active' && "text-muted-foreground"
        )}>
          {label}
        </p>
        {detail && status === 'active' && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

export const ResearchProgress = memo(function ResearchProgress({
  progress,
  isComplete = false,
}: ResearchProgressProps) {
  const currentStep = progress?.step || 'analyzing';
  const message = progress?.message || 'Starting research...';

  const getStepStatus = (step: string): 'pending' | 'active' | 'completed' => {
    const steps = ['analyzing', 'verticals', 'searching', 'skeleton', 'sections', 'synthesis', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (isComplete || currentStep === 'complete') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-1">Deep Research in Progress</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-2">
        <ProgressStep
          icon={Search}
          label="Analyzing research question"
          status={getStepStatus('analyzing')}
        />
        <ProgressStep
          icon={GitBranch}
          label="Creating research angles"
          status={getStepStatus('searching')}
          detail={currentStep === 'searching' ? message : undefined}
        />
        <ProgressStep
          icon={FileText}
          label="Building document structure"
          status={getStepStatus('skeleton')}
        />
        <ProgressStep
          icon={Edit}
          label="Writing sections"
          status={getStepStatus('sections')}
          detail={currentStep === 'sections' ? message : undefined}
        />
        <ProgressStep
          icon={Globe}
          label="Finalizing research"
          status={getStepStatus('synthesis')}
        />
        <ProgressStep
          icon={CheckCircle2}
          label="Complete"
          status={getStepStatus('complete')}
        />
      </div>

      {/* Progress bar */}
      {progress && !isComplete && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default ResearchProgress;
