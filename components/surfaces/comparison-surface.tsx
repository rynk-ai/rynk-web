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
  CheckCircle2, 
  XCircle, 
  Trophy,
  Star,
  ArrowRight,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Minus,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComparisonMetadata } from "@/lib/services/domain-types";

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
    <div className="max-w-5xl mx-auto pb-10">
      {/* Clean Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-10 p-8 md:p-10 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">{metadata.title}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{metadata.description}</p>
        
        <div className="flex justify-center gap-4 mt-6">
           <div className="px-4 py-1.5 rounded-full bg-secondary/50 text-sm font-medium flex items-center gap-2">
             <span className="flex h-2 w-2 rounded-full bg-primary" />
             {items.length} Options
           </div>
           <div className="px-4 py-1.5 rounded-full bg-secondary/50 text-sm font-medium flex items-center gap-2">
             <span className="flex h-2 w-2 rounded-full bg-muted-foreground" />
             {criteria.length} Criteria
           </div>
        </div>
      </div>

      {/* Recommendation Card */}
      {recommendation && recommendedItem && (
        <div className="mb-10 bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                  Highest Rated
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                {recommendedItem.name}
                <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </h3>
              <p className="text-muted-foreground leading-relaxed">{recommendation.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Comparison Cards */}
      <div className={cn(
        "grid gap-6 mb-12",
        items.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
        items.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {items.map((item) => {
          const isRecommended = recommendedItem?.id === item.id;
          const isExpanded = expandedItem === item.id;
          
          return (
            <div 
              key={item.id}
              className={cn(
                "group relative bg-card rounded-2xl transition-all duration-300 flex flex-col h-full",
                isRecommended 
                  ? "border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02] z-10" 
                  : "border hover:border-indigo-500/30 hover:shadow-lg"
              )}
            >
              {isRecommended && (
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md">
                   Top Choice
                 </div>
              )}
              
              <div className="p-6 pb-4">
                <h3 className="text-xl font-bold mb-2 text-center">{item.name}</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 line-clamp-3 min-h-[3em]">{item.description}</p>
                
                <div className="space-y-4">
                  {/* Pros */}
                  <div className="bg-green-500/5 rounded-xl p-3 border border-green-500/10">
                    <h4 className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Positives
                    </h4>
                    <ul className="space-y-2">
                      {item.pros.slice(0, isExpanded ? undefined : 3).map((pro, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-snug">
                          <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Cons */}
                  <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <XCircle className="h-3.5 w-3.5" /> Drawbacks
                    </h4>
                    <ul className="space-y-2">
                      {item.cons.slice(0, isExpanded ? undefined : 2).map((con, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-snug">
                          <X className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto px-6 pb-6 pt-2">
                {(item.pros.length > 3 || item.cons.length > 2) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full gap-1 h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Show More <ChevronDown className="h-3 w-3" /></>
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
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-6 border-b bg-muted/20">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-500" />
              Detailed Breakdown
            </h2>
          </div>
          
          <div className="overflow-x-auto relative">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b">
                  <th className="text-left p-5 font-medium text-muted-foreground w-1/4 sticky left-0 bg-background/95 backdrop-blur z-10 border-r">Feature</th>
                  {items.map((item) => (
                    <th key={item.id} className={cn(
                      "text-center p-5 font-semibold w-1/4",
                      recommendedItem?.id === item.id && "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <div className="flex flex-col items-center gap-1">
                        {item.name}
                        {recommendedItem?.id === item.id && (
                          <span className="text-[10px] font-normal px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">Top Pick</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {criteria.map((criterion, i) => (
                  <tr key={criterion.name} className="hover:bg-muted/30 transition-colors">
                    <td className="p-5 sticky left-0 bg-background/95 backdrop-blur border-r z-10">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          {criterion.name}
                          {criterion.weight >= 0.8 && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </span>
                        {criterion.description && (
                          <span className="text-xs text-muted-foreground mt-0.5">{criterion.description}</span>
                        )}
                      </div>
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className={cn(
                        "text-center p-5",
                        recommendedItem?.id === item.id && "bg-indigo-500/5"
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
      ? <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-500 ring-1 ring-green-500/20"><Check className="h-4 w-4" /></div>
      : <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"><Minus className="h-4 w-4" /></div>;
  }
  
  // Check if value is a rating (e.g. 4.5/5) to possibly show stars? 
  // For now just consistent styling
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

export default ComparisonSurface;
