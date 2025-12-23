/**
 * Comparison Surface - Decision Dashboard
 * 
 * Clean, wiki-inspired design with:
 * - Hero header (no card wrapper)
 * - Verdict section with winner highlight
 * - Scenario-based recommendations
 * - Side-by-side comparison cards
 * - Detailed comparison analysis
 * - Sources footer from web research
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  PiTrophy,
  PiStarFill,
  PiScales,
  PiSparkle,
  PiCaretDown,
  PiCaretUp,
  PiCheck,
  PiX,
  PiTarget,
  PiLightning,
  PiChartBar,
  PiShieldCheck,
  PiUsers,
  PiMoney,
  PiGear,
  PiQuestion,
  PiArrowRight
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { SourcesFooter } from "@/components/chat/sources-footer";
import type { ComparisonMetadata } from "@/lib/services/domain-types";
import type { Citation } from "@/lib/types/citation";
import { ComparisonItemSkeleton } from "@/components/surfaces/surface-skeletons";

interface ComparisonSurfaceProps {
  metadata: ComparisonMetadata;
}

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  pricing: <PiMoney className="h-4 w-4" />,
  performance: <PiLightning className="h-4 w-4" />,
  features: <PiGear className="h-4 w-4" />,
  usability: <PiUsers className="h-4 w-4" />,
  support: <PiShieldCheck className="h-4 w-4" />,
  other: <PiChartBar className="h-4 w-4" />
};

// Main Component
export const ComparisonSurface = memo(function ComparisonSurface({
  metadata,
}: ComparisonSurfaceProps) {
  const { items, criteria, verdict, scenarios, recommendation, sources } = metadata;
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Find winner
  const winnerId = verdict?.winnerId || recommendation?.itemId;
  const winnerItem = winnerId ? items.find(i => i.id === winnerId) : null;

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Convert sources to citations format for SourcesFooter
  const citations: Citation[] = (sources || []).map((s, i) => ({
    id: i + 1,
    url: s.url,
    title: s.title,
    snippet: s.snippet || '',
    source: 'exa' as const
  }));

  // Group criteria by category
  const groupedCriteria = criteria.reduce((acc, c) => {
    const cat = c.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {} as Record<string, typeof criteria>);

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item?.name || itemId;
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Hero Header - Wiki style, no card wrapper */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary">
            Comparison
          </span>
          {metadata.targetAudience && (
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
              {metadata.targetAudience}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
          {metadata.title}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl">
          {metadata.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <PiScales className="h-4 w-4 text-primary" />
            {items.length} options compared
          </span>
          <span className="flex items-center gap-2">
            <PiChartBar className="h-4 w-4" />
            {criteria.length} criteria analyzed
          </span>
          {metadata.lastUpdated && (
            <span className="hidden md:inline">Updated {metadata.lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Verdict Banner */}
      {verdict && winnerItem && (
        <div className="mb-10 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <PiTrophy className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Our Pick</span>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full",
                    verdict.confidence === 'high' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                    verdict.confidence === 'situational' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  )}>
                    {verdict.confidence}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {winnerItem.name}
                  <PiSparkle className="h-5 w-5 text-yellow-500" />
                </h2>
              </div>
            </div>
            <div className="md:ml-auto md:max-w-lg">
              <p className="text-muted-foreground leading-relaxed">{verdict.bottomLine}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Scenarios */}
      {scenarios && scenarios.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <PiTarget className="h-4 w-4" />
            Quick Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenarios.map((scenario, i) => (
              <div 
                key={i}
                className="p-4 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{scenario.label}</span>
                  <span className="text-sm text-primary font-semibold flex items-center gap-1">
                    {getItemName(scenario.itemId)}
                    <PiArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{scenario.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Cards */}
      <div className="mb-12">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
          <PiScales className="h-4 w-4" />
          Options Overview
        </h3>
        <div className={cn(
          "grid gap-4",
          items.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
          items.length === 3 ? "grid-cols-1 md:grid-cols-3" : 
          "grid-cols-1 md:grid-cols-2"
        )}>
          {items.map((item) => {
            const isWinner = item.id === winnerId;
            const isExpanded = expandedItems.has(item.id);
            const isLoading = !item.description || item.description === 'Loading...';

            if (isLoading) {
              return <ComparisonItemSkeleton key={item.id} />;
            }

            return (
              <div 
                key={item.id}
                className={cn(
                  "rounded-xl border bg-card overflow-hidden transition-all duration-300",
                  isWinner 
                    ? "border-primary/50 ring-2 ring-primary/20" 
                    : "border-border/30 hover:border-border/60"
                )}
              >
                {/* Card Header */}
                <div className={cn(
                  "p-5 border-b",
                  isWinner ? "bg-primary/5 border-primary/20" : "border-border/30"
                )}>
                  {isWinner && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary mb-2">
                      <PiStarFill className="h-3 w-3" /> Winner
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
                  {item.tagline && (
                    <p className="text-sm text-muted-foreground mt-1">{item.tagline}</p>
                  )}
                  {item.pricing && (
                    <div className="mt-3 text-sm font-medium text-foreground/80">
                      {item.pricing}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  {/* Pros */}
                  <div>
                    <h4 className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <PiCheck className="h-3.5 w-3.5" /> Strengths
                    </h4>
                    <ul className="space-y-1.5">
                      {item.pros.slice(0, isExpanded ? undefined : 3).map((pro, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div>
                    <h4 className="text-[10px] font-bold text-red-600 dark:text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <PiX className="h-3.5 w-3.5" /> Weaknesses
                    </h4>
                    <ul className="space-y-1.5">
                      {item.cons.slice(0, isExpanded ? undefined : 2).map((con, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Ideal For */}
                      {item.idealFor && item.idealFor.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wide mb-2">
                            Ideal For
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {item.idealFor.map((use, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-blue-500/10 rounded text-blue-700 dark:text-blue-300">
                                {use}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unique Features */}
                      {item.uniqueFeatures && item.uniqueFeatures.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-purple-600 dark:text-purple-500 uppercase tracking-wide mb-2">
                            Unique Features
                          </h4>
                          <ul className="space-y-1">
                            {item.uniqueFeatures.map((feature, i) => (
                              <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                                <PiSparkle className="h-3 w-3 text-purple-500 mt-0.5 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand Toggle */}
                {(item.pros.length > 3 || item.cons.length > 2 || item.idealFor?.length || item.uniqueFeatures?.length) && (
                  <div className="px-5 pb-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(item.id)}
                      className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>Less <PiCaretUp className="h-3.5 w-3.5 ml-1" /></>
                      ) : (
                        <>More details <PiCaretDown className="h-3.5 w-3.5 ml-1" /></>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Analysis */}
      {criteria.length > 0 && (
        <div className="mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
            <PiChartBar className="h-4 w-4" />
            Detailed Analysis
          </h3>

          <div className="space-y-6">
            {Object.entries(groupedCriteria).map(([category, criteriaList]) => (
              <div key={category} className="rounded-xl border border-border/30 overflow-hidden">
                {/* Category Header */}
                <div className="px-5 py-3 bg-muted/20 border-b border-border/30 flex items-center gap-2">
                  {categoryIcons[category] || categoryIcons.other}
                  <span className="text-sm font-semibold capitalize">{category}</span>
                </div>
                
                {/* Criteria */}
                <div className="divide-y divide-border/20">
                  {criteriaList.map((criterion) => (
                    <div key={criterion.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{criterion.name}</span>
                          {criterion.weight >= 0.8 && (
                            <PiStarFill className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        {criterion.winnerId && (
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            criterion.winnerId === 'tie' 
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          )}>
                            {criterion.winnerId === 'tie' ? 'Tie' : getItemName(criterion.winnerId)}
                          </span>
                        )}
                      </div>
                      {criterion.analysis && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {criterion.analysis}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources - Uses wiki's SourcesFooter component */}
      {citations.length > 0 && (
        <div className="mt-8">
          <SourcesFooter citations={citations} variant="compact" />
        </div>
      )}
    </div>
  );
});

export default ComparisonSurface;
