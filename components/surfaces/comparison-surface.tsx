/**
 * Comparison Surface - Decision Dashboard Style
 * 
 * Features:
 * - VerdictBar at top with winner + bottom line
 * - ScenarioPills for use-case recommendations
 * - ItemCards with expandable pros/cons
 * - ComparisonTable with per-criterion winners
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  PiCheckCircle, 
  PiXCircle, 
  PiTrophy,
  PiStar,
  PiStarFill,
  PiScales,
  PiSparkle,
  PiCaretDown,
  PiCaretUp,
  PiCheck,
  PiX,
  PiTarget,
  PiLightningFill,
  PiCurrencyDollar,
  PiUser,
  PiGear,
  PiQuestion,
  PiShieldCheck,
  PiLink,
  PiGlobe
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import type { ComparisonMetadata } from "@/lib/services/domain-types";
import { ComparisonItemSkeleton } from "@/components/surfaces/surface-skeletons";

interface ComparisonSurfaceProps {
  metadata: ComparisonMetadata;
}

// Map category to icon
const categoryIcons: Record<string, React.ReactNode> = {
  pricing: <PiCurrencyDollar className="h-4 w-4" />,
  performance: <PiLightningFill className="h-4 w-4" />,
  features: <PiGear className="h-4 w-4" />,
  usability: <PiUser className="h-4 w-4" />,
  support: <PiShieldCheck className="h-4 w-4" />,
  other: <PiQuestion className="h-4 w-4" />
};

// Confidence badge colors
const confidenceStyles = {
  high: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  situational: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
};

// Verdict Bar Component
function VerdictBar({ 
  verdict, 
  winnerName 
}: { 
  verdict: ComparisonMetadata['verdict']; 
  winnerName: string;
}) {
  if (!verdict) return null;
  
  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <PiTrophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Winner</span>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full border",
                confidenceStyles[verdict.confidence]
              )}>
                {verdict.confidence} confidence
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              {winnerName}
              <PiSparkle className="h-4 w-4 text-yellow-500 animate-pulse" />
            </h3>
          </div>
        </div>
        <div className="flex-1 md:border-l md:border-border/50 md:pl-6">
          <p className="text-muted-foreground leading-relaxed">{verdict.bottomLine}</p>
        </div>
      </div>
    </div>
  );
}

// Scenario Pills Component
function ScenarioPills({ 
  scenarios, 
  items 
}: { 
  scenarios: ComparisonMetadata['scenarios']; 
  items: ComparisonMetadata['items'];
}) {
  if (!scenarios || scenarios.length === 0) return null;
  
  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item?.name || itemId;
  };
  
  return (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <PiTarget className="h-4 w-4" />
        Quick Recommendations
      </h3>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario, i) => (
          <div 
            key={i}
            className="group relative px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary transition-all cursor-default"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{scenario.label}</span>
              <span className="text-xs text-primary font-semibold">→ {getItemName(scenario.itemId)}</span>
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
              <p className="text-xs text-muted-foreground">{scenario.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Item Card Component
function ItemCard({ 
  item, 
  isWinner, 
  isExpanded, 
  onToggle 
}: { 
  item: ComparisonMetadata['items'][0]; 
  isWinner: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Check if loading
  const isLoading = item.description === 'Loading...' || item.pros?.length === 0;
  
  if (isLoading) {
    return <ComparisonItemSkeleton />;
  }
  
  return (
    <div className={cn(
      "group relative bg-card rounded-2xl transition-all duration-300 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2",
      isWinner 
        ? "border-2 border-primary shadow-xl shadow-primary/10 scale-[1.02] z-10" 
        : "border border-border/40 hover:border-primary/30 hover:shadow-lg"
    )}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
          <PiStarFill className="h-3 w-3" /> Winner
        </div>
      )}
      
      <div className="p-6 pb-4 flex-1">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-foreground mb-1">{item.name}</h3>
          {item.tagline && (
            <p className="text-sm text-muted-foreground italic">{item.tagline}</p>
          )}
          {item.pricing && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 text-xs font-medium text-foreground/80">
              <PiCurrencyDollar className="h-3.5 w-3.5" />
              {item.pricing}
            </div>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground text-center mb-6 line-clamp-3">{item.description}</p>
        
        {/* Pros */}
        <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/10 mb-3">
          <h4 className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
            <PiCheckCircle className="h-3.5 w-3.5" /> Strengths
          </h4>
          <ul className="space-y-2">
            {item.pros.slice(0, isExpanded ? undefined : 3).map((pro, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2 leading-snug">
                <PiCheck className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Cons */}
        <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
          <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
            <PiXCircle className="h-3.5 w-3.5" /> Weaknesses
          </h4>
          <ul className="space-y-2">
            {item.cons.slice(0, isExpanded ? undefined : 2).map((con, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2 leading-snug">
                <PiX className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Ideal For (expanded) */}
        {isExpanded && item.idealFor && item.idealFor.length > 0 && (
          <div className="mt-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
            <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
              Ideal For
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.idealFor.map((use, i) => (
                <span key={i} className="px-2 py-1 text-xs bg-blue-500/10 rounded-md text-blue-700 dark:text-blue-300">
                  {use}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Unique Features (expanded) */}
        {isExpanded && item.uniqueFeatures && item.uniqueFeatures.length > 0 && (
          <div className="mt-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
            <h4 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wide">
              Unique Features
            </h4>
            <ul className="space-y-1.5">
              {item.uniqueFeatures.map((feature, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <PiSparkle className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Expand button */}
      <div className="mt-auto px-6 pb-6 pt-2">
        {(item.pros.length > 3 || item.cons.length > 2 || item.idealFor?.length || item.uniqueFeatures?.length) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className="w-full gap-2 h-9 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          >
            {isExpanded ? (
              <>Show Less <PiCaretUp className="h-3.5 w-3.5" /></>
            ) : (
              <>Show More <PiCaretDown className="h-3.5 w-3.5" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Sources Section Component
function SourcesSection({ sources }: { sources?: ComparisonMetadata['sources'] }) {
  if (!sources || sources.length === 0) return null;
  
  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm mt-8">
      <div className="p-5 border-b border-border/30 bg-muted/5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PiGlobe className="h-5 w-5 text-primary" />
          Sources
        </h2>
        <p className="text-xs text-muted-foreground mt-1">This comparison was informed by current web research</p>
      </div>
      
      <div className="divide-y divide-border/30">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 hover:bg-muted/20 transition-colors group"
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
              <PiLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {source.title}
              </h3>
              {source.snippet && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{source.snippet}</p>
              )}
              <span className="text-[10px] text-muted-foreground/60 mt-1 block truncate">{source.url}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Comparison Table Component
function ComparisonTable({ 
  criteria, 
  items 
}: { 
  criteria: ComparisonMetadata['criteria']; 
  items: ComparisonMetadata['items'];
}) {
  if (!criteria || criteria.length === 0) return null;
  
  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item?.name || itemId;
  };
  
  // Group criteria by category
  const groupedCriteria = criteria.reduce((acc, c) => {
    const cat = c.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {} as Record<string, typeof criteria>);
  
  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm mt-12">
      <div className="p-6 border-b border-border/30 bg-muted/5">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <PiScales className="h-6 w-6 text-primary" />
          Detailed Comparison
        </h2>
        <p className="text-sm text-muted-foreground mt-1">See how each option performs across key criteria</p>
      </div>
      
      <div className="divide-y divide-border/30">
        {Object.entries(groupedCriteria).map(([category, criteriaList]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="px-6 py-3 bg-muted/30 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {categoryIcons[category] || categoryIcons.other}
              {category}
            </div>
            
            {/* Criteria rows */}
            {criteriaList.map((criterion) => (
              <div key={criterion.id} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Criterion name */}
                  <div className="lg:w-1/4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{criterion.name}</span>
                      {criterion.weight >= 0.8 && (
                        <PiStarFill className="h-3.5 w-3.5 text-yellow-500" title="High importance" />
                      )}
                    </div>
                    {criterion.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
                    )}
                  </div>
                  
                  {/* Analysis + Winner */}
                  <div className="flex-1">
                    {criterion.analysis && (
                      <p className="text-sm text-foreground/80 mb-2">{criterion.analysis}</p>
                    )}
                    {criterion.winnerId && criterion.winnerId !== 'tie' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        <PiTrophy className="h-3 w-3" />
                        Winner: {getItemName(criterion.winnerId)}
                      </span>
                    )}
                    {criterion.winnerId === 'tie' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Tie
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Component
export const ComparisonSurface = memo(function ComparisonSurface({
  metadata,
}: ComparisonSurfaceProps) {
  const { items, criteria, verdict, scenarios, recommendation } = metadata;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  // Find winner
  const winnerId = verdict?.winnerId || recommendation?.itemId;
  const winnerItem = winnerId ? items.find(i => i.id === winnerId) : null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="bg-card border border-border/30 rounded-2xl shadow-sm mb-8 p-8 md:p-10 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 text-primary shadow-sm">
            <PiScales className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-foreground">{metadata.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{metadata.description}</p>
          
          <div className="flex justify-center gap-4 mt-6">
            <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium flex items-center gap-2 text-foreground/80">
              <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
              {items.length} Options
            </div>
            <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium flex items-center gap-2 text-foreground/80">
              <span className="flex h-2 w-2 rounded-full bg-muted-foreground/60" />
              {criteria.length} Criteria
            </div>
            {metadata.lastUpdated && (
              <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium text-foreground/80 hidden md:block">
                Updated {metadata.lastUpdated}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verdict Bar */}
      {verdict && winnerItem && (
        <VerdictBar verdict={verdict} winnerName={winnerItem.name} />
      )}

      {/* Scenario Pills */}
      <ScenarioPills scenarios={scenarios} items={items} />

      {/* Item Cards Grid */}
      <div className={cn(
        "grid gap-6 mb-8",
        items.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
        items.length === 3 ? "grid-cols-1 md:grid-cols-3" : 
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isWinner={item.id === winnerId}
            isExpanded={expandedItem === item.id}
            onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
          />
        ))}
      </div>

      {/* Comparison Table */}
      <ComparisonTable criteria={criteria} items={items} />

      {/* Sources Section */}
      <SourcesSection sources={metadata.sources} />
    </div>
  );
});

export default ComparisonSurface;
