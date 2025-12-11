/**
 * Comparison Surface - Side-by-Side Analysis Component
 * 
 * Features:
 * - Compare multiple items/options
 * - Pros/cons lists
 * - Attribute comparison table
 * - AI recommendation
 */

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  XCircle, 
  Trophy,
  Star,
  ArrowRight 
} from "lucide-react";
import type { ComparisonMetadata } from "@/lib/services/domain-types";

interface ComparisonSurfaceProps {
  metadata: ComparisonMetadata;
}

export const ComparisonSurface = memo(function ComparisonSurface({
  metadata,
}: ComparisonSurfaceProps) {
  const { items, criteria, recommendation } = metadata;
  
  // Find recommended item
  const recommendedItem = recommendation 
    ? items.find(i => i.id === recommendation.itemId)
    : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">⚖️ {metadata.title}</h1>
        <p className="text-muted-foreground">{metadata.description}</p>
      </div>

      {/* Quick Comparison Cards */}
      <div className={cn(
        "grid gap-4 mb-8",
        items.length === 2 ? "grid-cols-2" : 
        items.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
      )}>
        {items.map((item) => (
          <div 
            key={item.id}
            className={cn(
              "bg-card border rounded-xl p-5 transition-all",
              recommendedItem?.id === item.id && "ring-2 ring-primary border-primary"
            )}
          >
            {recommendedItem?.id === item.id && (
              <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-3">
                <Trophy className="h-3.5 w-3.5" />
                Recommended
              </div>
            )}
            <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
            
            {/* Pros */}
            <div className="mb-3">
              <h4 className="text-xs font-medium text-green-500 mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Pros
              </h4>
              <ul className="space-y-1">
                {item.pros.slice(0, 3).map((pro, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Cons */}
            <div>
              <h4 className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Cons
              </h4>
              <ul className="space-y-1">
                {item.cons.slice(0, 3).map((con, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">−</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Attribute Comparison Table */}
      {criteria.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Criteria</th>
                  {items.map(item => (
                    <th key={item.id} className="text-center p-4 font-medium">
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion, i) => (
                  <tr key={criterion.name} className={cn(i < criteria.length - 1 && "border-b")}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{criterion.name}</span>
                        {criterion.weight >= 0.8 && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
                      )}
                    </td>
                    {items.map(item => (
                      <td key={item.id} className="text-center p-4">
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

      {/* Recommendation */}
      {recommendation && recommendedItem && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Recommendation</h3>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium">{recommendedItem.name}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground italic">&ldquo;Best overall choice&rdquo;</span>
          </div>
          <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
        </div>
      )}
    </div>
  );
});

function renderAttributeValue(value: string | number | boolean | undefined) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') {
    return value 
      ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
      : <XCircle className="h-5 w-5 text-red-500 mx-auto" />;
  }
  return <span className="text-sm">{value}</span>;
}

export default ComparisonSurface;
