/**
 * Comparison Surface - Premium Side-by-Side Analysis
 * 
 * Features:
 * - Responsive comparison cards with pros/cons
 * - Sticky header attribute comparison table
 * - Alternating row visuals
 * - Highlighted recommendation engine
 * - Collapsible details
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
  PiArrowRight,
  PiScales,
  PiSparkle,
  PiCaretDown,
  PiCaretUp,
  PiMinus,
  PiCheck,
  PiX
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import type { ComparisonMetadata } from "@/lib/services/domain-types";
import { ComparisonItemSkeleton } from "@/components/surfaces/surface-skeletons";

interface ComparisonSurfaceProps {
  metadata: ComparisonMetadata;
}

export const ComparisonSurface = memo(function ComparisonSurface({
  metadata,
}: ComparisonSurfaceProps) {
  const { items, criteria, recommendation } = metadata;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  // Find recommended item
  const recommendedItem = recommendation 
    ? items.find(i => i.id === recommendation.itemId)
    : null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Clean Hero Header */}
      <div className="bg-card border border-border/30 rounded-2xl shadow-sm mb-12 p-8 md:p-12 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5 text-primary shadow-sm">
            <PiScales className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-foreground font-display">{metadata.title}</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">{metadata.description}</p>
          
          <div className="flex justify-center gap-4 mt-8">
             <div className="px-5 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium flex items-center gap-2.5 text-foreground/80">
               <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
               {items.length} Options
             </div>
             <div className="px-5 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium flex items-center gap-2.5 text-foreground/80">
               <span className="flex h-2 w-2 rounded-full bg-muted-foreground/60" />
               {criteria.length} Criteria
             </div>
          </div>
        </div>
      </div>

      {/* Recommendation Card */}
      {recommendation && recommendedItem && (
        <div className="mb-12 bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 rotate-3">
              <PiTrophy className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                  Top Recommendation
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-3 flex items-center gap-3 text-foreground font-display">
                {recommendedItem.name}
                <PiSparkle className="h-6 w-6 text-yellow-500 fill-yellow-500 animate-pulse" />
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">{recommendation.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Comparison Cards */}
      <div className={cn(
        "grid gap-8 mb-16",
        items.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
        items.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {items.map((item) => {
          const isRecommended = recommendedItem?.id === item.id;
          const isExpanded = expandedItem === item.id;
          
          // Check if item content is still loading (progressive loading)
          const isLoading = item.description === 'Loading...' || 
            (item as any).status === 'pending' ||
            item.pros?.length === 0;
          
          if (isLoading) {
            return <ComparisonItemSkeleton key={item.id} />;
          }
          
          return (
            <div 
              key={item.id}
              className={cn(
                "group relative bg-card rounded-2xl transition-all duration-300 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2",
                isRecommended 
                  ? "border-2 border-primary shadow-xl shadow-primary/10 scale-[1.02] z-10" 
                  : "border border-border/40 hover:border-primary/30 hover:shadow-lg"
              )}
            >
              {isRecommended && (
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
                   <PiStarFill className="h-3 w-3" /> Top Choice
                 </div>
              )}
              
              <div className="p-8 pb-4 flex-1">
                <h3 className="text-2xl font-bold mb-3 text-center font-display text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground text-center mb-8 line-clamp-4 min-h-[4em] leading-relaxed">{item.description}</p>
                
                <div className="space-y-6">
                  {/* Pros */}
                  <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/10">
                    <h4 className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                      <PiCheckCircle className="h-3.5 w-3.5" /> Positives
                    </h4>
                    <ul className="space-y-2.5">
                      {item.pros.slice(0, isExpanded ? undefined : 3).map((pro, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2.5 leading-snug">
                          <PiCheck className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Cons */}
                  <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                    <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                      <PiXCircle className="h-3.5 w-3.5" /> Drawbacks
                    </h4>
                    <ul className="space-y-2.5">
                      {item.cons.slice(0, isExpanded ? undefined : 2).map((con, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2.5 leading-snug">
                          <PiX className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto px-8 pb-8 pt-4">
                {(item.pros.length > 3 || item.cons.length > 2) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
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
        })}
      </div>

      {/* Attribute Comparison Grid */}
      {criteria.length > 0 && (
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-8 border-b border-border/30 bg-muted/5">
            <h2 className="text-xl font-bold flex items-center gap-3 font-display">
              <PiScales className="h-6 w-6 text-primary" />
              Detailed Breakdown
            </h2>
          </div>
          
          <div className="overflow-x-auto relative">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/30">
                  <th className="text-left p-6 font-semibold text-muted-foreground w-1/4 sticky left-0 bg-background/95 backdrop-blur z-20 border-r border-border/30 text-sm uppercase tracking-wide">Feature</th>
                  {items.map((item) => (
                    <th key={item.id} className={cn(
                      "text-center p-6 font-semibold w-1/4 relative",
                      recommendedItem?.id === item.id && "bg-primary/5 text-primary"
                    )}>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg">{item.name}</span>
                        {recommendedItem?.id === item.id && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">Top Pick</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {criteria.map((criterion, i) => (
                  <tr key={criterion.name} className="hover:bg-muted/20 transition-colors group">
                    <td className="p-6 sticky left-0 bg-background/95 backdrop-blur border-r border-border/30 z-10 group-hover:bg-muted/20 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                          {criterion.name}
                          {criterion.weight >= 0.8 && (
                            <PiStarFill className="h-3 w-3 text-yellow-500" />
                          )}
                        </span>
                        {criterion.description && (
                          <span className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-snug">{criterion.description}</span>
                        )}
                      </div>
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className={cn(
                        "text-center p-6 group-hover:bg-muted/10 transition-colors",
                        recommendedItem?.id === item.id && "bg-primary/5 group-hover:bg-primary/10"
                      )}>
                        {renderAttributeValue(item.attributes[criterion.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

function renderAttributeValue(value: string | number | boolean | undefined) {
  if (value === undefined) return <span className="text-muted-foreground/30">—</span>;
  
  if (typeof value === 'boolean') {
    return value 
      ? <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-500 ring-1 ring-green-500/20 shadow-sm"><PiCheck className="h-4 w-4" /></div>
      : <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border"><PiMinus className="h-4 w-4" /></div>;
  }
  
  // Check if value is a rating (e.g. 4.5/5) to possibly show stars? 
  // For now just consistent styling
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

export default ComparisonSurface;
