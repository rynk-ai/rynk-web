/**
 * Timeline Surface - Chronological Events Display
 * 
 * Features:
 * - Visual timeline with events
 * - Category filtering
 * - Importance indicators
 * - Expandable event details
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Circle,
  Filter
} from "lucide-react";
import type { TimelineMetadata } from "@/lib/services/domain-types";

interface TimelineSurfaceProps {
  metadata: TimelineMetadata;
}

export const TimelineSurface = memo(function TimelineSurface({
  metadata,
}: TimelineSurfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  
  // Get unique categories
  const categories = [...new Set(metadata.events.map(e => e.category).filter(Boolean))];
  
  // Filter events
  const filteredEvents = selectedCategory 
    ? metadata.events.filter(e => e.category === selectedCategory)
    : metadata.events;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">📅 {metadata.title}</h1>
        <p className="text-muted-foreground">{metadata.description}</p>
        {metadata.startDate && metadata.endDate && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            {metadata.startDate} — {metadata.endDate}
          </p>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category as string)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
        
        {/* Events */}
        <div className="space-y-6">
          {filteredEvents.map((event, index) => (
            <div 
              key={event.id}
              className={cn(
                "relative flex items-start gap-4",
                "md:grid md:grid-cols-2 md:gap-8"
              )}
            >
              {/* Left side (date on desktop) */}
              <div className={cn(
                "hidden md:block text-right pr-8",
                index % 2 === 1 && "md:order-2 md:text-left md:pl-8 md:pr-0"
              )}>
                <div className="text-sm font-medium">{event.date}</div>
                {event.category && (
                  <span className="text-xs text-muted-foreground">{event.category}</span>
                )}
              </div>
              
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-4 md:left-1/2 -translate-x-1/2 z-10",
                "flex items-center justify-center"
              )}>
                <Circle className={cn(
                  "h-3 w-3 fill-current",
                  event.importance === 'major' ? "text-primary h-4 w-4" :
                  event.importance === 'moderate' ? "text-yellow-500" :
                  "text-muted-foreground"
                )} />
              </div>
              
              {/* Right side (content) */}
              <div className={cn(
                "flex-1 ml-8 md:ml-0",
                "md:pl-8",
                index % 2 === 1 && "md:order-1 md:pr-8 md:pl-0 md:text-right"
              )}>
                {/* Mobile date */}
                <div className="md:hidden text-xs text-muted-foreground mb-1">
                  {event.date}
                </div>
                
                <div 
                  className={cn(
                    "bg-card border rounded-lg p-4 cursor-pointer transition-all",
                    "hover:shadow-md",
                    expandedEvent === event.id && "ring-2 ring-primary",
                    event.importance === 'major' && "border-primary"
                  )}
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  <div className="flex items-start gap-2">
                    {event.importance === 'major' && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                        KEY
                      </span>
                    )}
                    <h3 className="font-medium flex-1">{event.title}</h3>
                  </div>
                  
                  <p className={cn(
                    "text-sm text-muted-foreground mt-2",
                    expandedEvent !== event.id && "line-clamp-2"
                  )}>
                    {event.description}
                  </p>
                  
                  {event.description.length > 100 && (
                    <button className="text-xs text-primary mt-2 hover:underline">
                      {expandedEvent === event.id ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="mt-8 pt-8 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">
            {metadata.events.filter(e => e.importance === 'major').length}
          </div>
          <div className="text-xs text-muted-foreground">Key Events</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{metadata.events.length}</div>
          <div className="text-xs text-muted-foreground">Total Events</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{categories.length || 1}</div>
          <div className="text-xs text-muted-foreground">Categories</div>
        </div>
      </div>
    </div>
  );
});

export default TimelineSurface;
