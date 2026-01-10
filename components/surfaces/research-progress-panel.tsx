/**
 * Research Progress Panel
 * 
 * Displays real-time progress of deep research generation.
 * Shows phases: Planning → Gathering → Synthesis → Generating → Complete
 * Inspired by ProcessingTimeline UI pattern.
 */

"use client";

import { memo, useEffect, useState } from "react";
import {
  PiMagnifyingGlass,
  PiLightbulb,
  PiPencilSimple,
  PiCheckCircle,
  PiSpinner,
  PiCircle,
  PiCaretDown,
  PiCaretRight,
  PiBookOpen,
  PiGraduationCap,
  PiGlobe,
  PiArrowSquareOut
} from "react-icons/pi";
import { cn } from "@/lib/utils";

interface VerticalProgress {
  id: string;
  name: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  sourcesCount: number;
}

interface GatheredSource {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  verticalId: string;
  sourceType: 'exa' | 'perplexity' | 'semantic_scholar';
}

interface ResearchProgressData {
  phase: 'planning' | 'gathering' | 'synthesis' | 'generating' | 'complete' | 'error';
  message: string;
  startedAt: number;
  estimatedRemaining?: number;
  
  // Planning phase
  verticals?: VerticalProgress[];
  
  // Gathering phase
  totalSources?: number;
  gatheredSources?: number;
  currentSource?: {
    title: string;
    url: string;
    domain: string;
  };
  sourcesByVertical?: Record<string, number>;
  allSources?: GatheredSource[];
  
  // Synthesis phase
  structure?: {
    title: string;
    sections: Array<{ heading: string }>;
    keyInsightsCount: number;
  };
  
  // Generation phase
  generationProgress?: number;
}

interface ResearchProgressPanelProps {
  researchProgress?: ResearchProgressData;
  progress?: {
    current: number;
    total: number;
    message: string;
    step?: string;
  };
  query?: string;
}

const PHASE_ORDER = ['planning', 'gathering', 'synthesis', 'generating', 'complete'];

const getPhaseIndex = (phase: string) => PHASE_ORDER.indexOf(phase);

const PhaseIcon = ({ phase, currentPhase }: { phase: string; currentPhase: string }) => {
  const currentIdx = getPhaseIndex(currentPhase);
  const phaseIdx = getPhaseIndex(phase);
  
  if (phaseIdx < currentIdx || currentPhase === 'complete') {
    return <PiCheckCircle className="h-5 w-5 text-green-500" />;
  }
  if (phaseIdx === currentIdx) {
    return <PiSpinner className="h-5 w-5 text-primary animate-spin" />;
  }
  return <PiCircle className="h-5 w-5 text-muted-foreground/40" />;
};

export const ResearchProgressPanel = memo(function ResearchProgressPanel({
  researchProgress,
  progress,
  query
}: ResearchProgressPanelProps) {
  const [verticalsExpanded, setVerticalsExpanded] = useState(true);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  
  const currentPhase = researchProgress?.phase || 'planning';
  const verticals = researchProgress?.verticals || [];
  const gatheredSources = researchProgress?.gatheredSources || 0;
  const currentSource = researchProgress?.currentSource;
  const structure = researchProgress?.structure;
  const allSources = researchProgress?.allSources || [];
  
  // Calculate elapsed time
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!researchProgress?.startedAt || currentPhase === 'complete') return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - researchProgress.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [researchProgress?.startedAt, currentPhase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-sm font-medium mb-4">
          <PiMagnifyingGlass className="h-4 w-4" />
          Deep Research
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {structure?.title || query || 'Researching...'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentPhase === 'complete' 
            ? `Completed in ${formatTime(elapsed)}`
            : `${formatTime(elapsed)} elapsed${researchProgress?.estimatedRemaining ? ` • ~${formatTime(researchProgress.estimatedRemaining)} remaining` : ''}`
          }
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="space-y-2 mb-6">
        {/* Phase 1: Planning */}
        <PhaseItem
          phase="planning"
          currentPhase={currentPhase}
          title="Planning research"
          subtitle={verticals.length > 0 ? `Found ${verticals.length} research angles` : undefined}
        >
          {verticals.length > 0 && (
            <button 
              onClick={() => setVerticalsExpanded(!verticalsExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              {verticalsExpanded ? <PiCaretDown className="h-3 w-3" /> : <PiCaretRight className="h-3 w-3" />}
              {verticalsExpanded ? 'Hide' : 'Show'} angles
            </button>
          )}
          {verticalsExpanded && verticals.length > 0 && (
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-border/50">
              {verticals.map(v => (
                <div key={v.id} className="flex items-center gap-2 text-xs py-1">
                  {v.status === 'completed' && <PiCheckCircle className="h-3.5 w-3.5 text-green-500" />}
                  {v.status === 'searching' && <PiSpinner className="h-3.5 w-3.5 text-primary animate-spin" />}
                  {v.status === 'pending' && <PiCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  <span className={cn(
                    "flex-1",
                    v.status === 'completed' ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {v.name}
                  </span>
                  {v.sourcesCount > 0 && (
                    <span className="text-muted-foreground">{v.sourcesCount} sources</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </PhaseItem>

        {/* Phase 2: Gathering */}
        <PhaseItem
          phase="gathering"
          currentPhase={currentPhase}
          title="Gathering sources"
          subtitle={gatheredSources > 0 ? `${gatheredSources} sources found` : undefined}
        >
          {/* Current source being read */}
          {currentPhase === 'gathering' && currentSource && (
            <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-start gap-2">
                <PiBookOpen className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{currentSource.title}</p>
                  <p className="text-[10px] text-muted-foreground">{currentSource.domain}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Source list */}
          {allSources.length > 0 && (
            <>
              <button 
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                {sourcesExpanded ? <PiCaretDown className="h-3 w-3" /> : <PiCaretRight className="h-3 w-3" />}
                {sourcesExpanded ? 'Hide' : 'Show'} sources ({allSources.length})
              </button>
              {sourcesExpanded && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {allSources.slice(-10).reverse().map((s, i) => (
                    <a
                      key={`${s.url}-${i}`}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-xs group"
                    >
                      {s.sourceType === 'semantic_scholar' ? (
                        <PiGraduationCap className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <PiGlobe className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground">
                        {s.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{s.domain}</span>
                      <PiArrowSquareOut className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </PhaseItem>

        {/* Phase 3: Synthesis */}
        <PhaseItem
          phase="synthesis"
          currentPhase={currentPhase}
          title="Synthesizing findings"
          subtitle={structure ? `${structure.keyInsightsCount} key insights, ${structure.sections.length} sections` : undefined}
        />

        {/* Phase 4: Generating */}
        <PhaseItem
          phase="generating"
          currentPhase={currentPhase}
          title="Generating research document"
          subtitle={researchProgress?.generationProgress ? `${Math.round(researchProgress.generationProgress * 100)}%` : undefined}
        >
          {currentPhase === 'generating' && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(researchProgress?.generationProgress || 0.1) * 100}%` }}
              />
            </div>
          )}
        </PhaseItem>
      </div>

      {/* Footer message */}
      {currentPhase !== 'complete' && (
        <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/40">
          <p className="text-sm text-muted-foreground">
            💡 You can leave this page — we'll notify you when your research is ready
          </p>
        </div>
      )}
    </div>
  );
});

// Individual phase item
const PhaseItem = memo(function PhaseItem({
  phase,
  currentPhase,
  title,
  subtitle,
  children
}: {
  phase: string;
  currentPhase: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const isActive = getPhaseIndex(phase) === getPhaseIndex(currentPhase);
  const isComplete = getPhaseIndex(phase) < getPhaseIndex(currentPhase) || currentPhase === 'complete';
  
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isActive && "bg-primary/5 border-primary/30",
      isComplete && "bg-muted/30 border-border/40",
      !isActive && !isComplete && "bg-transparent border-border/20"
    )}>
      <div className="flex items-center gap-3">
        <PhaseIcon phase={phase} currentPhase={currentPhase} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium",
            isComplete ? "text-muted-foreground" : "text-foreground"
          )}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {isComplete && (
          <span className="text-xs text-green-500 font-medium">Complete</span>
        )}
        {isActive && (
          <span className="text-xs text-primary font-medium">In Progress</span>
        )}
      </div>
      {children && (isActive || isComplete) && (
        <div className="mt-2 ml-8">
          {children}
        </div>
      )}
    </div>
  );
});

export default ResearchProgressPanel;
