/**
 * Timeline Surface - Premium Chronological Events Display
 * 
 * Features:
 * - Beautiful vertical timeline with gradient connector
 * - Alternating cards layout for desktop
 * - Collapsible event details
 * - Category filtering with animated indicators
 */

"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  Sparkles,
  Flag,
  MapPin,
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
  
  const majorEvents = metadata.events.filter(e => e.importance === 'major');

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Clean Hero Header */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-lg mb-10 p-8 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 mb-4">
          <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">{metadata.title}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-6">{metadata.description}</p>
        
        {metadata.startDate && metadata.endDate && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/50 rounded-full text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>{metadata.startDate}</span>
            <span className="opacity-60">to</span>
            <span>{metadata.endDate}</span>
          </div>
        )}
      </div>

      {/* Stats & Filter Bar */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 mb-4 border-b border-border/40 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-filter-none md:border-none md:static md:mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-xl shadow-sm min-w-max">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold">{majorEvents.length} Key Events</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-xl shadow-sm min-w-max">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-bold">{metadata.events.length} Total</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="rounded-full h-8 flex-shrink-0"
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category as string}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category as string)}
                  className="rounded-full h-8 flex-shrink-0"
                >
                  {category as string}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative px-4 md:px-0">
        {/* Timeline line */}
        <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-0.5 bg-border md:-translate-x-1/2 rounded-full" />
        
        {/* Events */}
        <div className="space-y-12">
          {filteredEvents.map((event, index) => {
            const isExpanded = expandedEvent === event.id;
            const isMajor = event.importance === 'major';
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={event.id}
                className={cn(
                  "relative flex gap-8",
                  "md:grid md:grid-cols-2 md:gap-12"
                )}
              >
                {/* Mobile Date Marker (Left side for mobile) */}
                <div className="md:hidden absolute left-8 -translate-x-1/2 w-4 h-full flex flex-col items-center">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 z-10 bg-background transition-all",
                    isMajor 
                      ? "border-amber-500 bg-amber-500 ring-4 ring-amber-500/20" 
                      : "border-muted-foreground"
                  )} />
                </div>

                {/* Left side (Desktop: Date/Content based on parity) */}
                <div className={cn(
                  "hidden md:flex flex-col justify-start",
                  !isEven ? "items-start text-left" : "items-end text-right"
                )}>
                  {isEven ? (
                     // Left side when even: Date
                     <div className="sticky top-24 pt-2">
                       <span className={cn(
                         "text-2xl font-bold tracking-tight",
                         isMajor ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                       )}>
                         {event.date}
                       </span>
                       {event.category && (
                         <div className="flex justify-end mt-1">
                           <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                             {event.category}
                           </span>
                         </div>
                       )}
                     </div>
                  ) : (
                    // Left side when odd: Content Card
                    <EventCard 
                       event={event} 
                       isExpanded={isExpanded} 
                       onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)} 
                       isMajor={isMajor}
                    />
                  )}
                </div>
                
                {/* Desktop Timeline Dot */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 h-full flex-col items-center">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-4 z-10 transition-all duration-500",
                    isMajor 
                      ? "border-amber-500 bg-background ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/30 scale-125" 
                      : "border-muted-foreground bg-background ring-4 ring-background"
                  )} />
                </div>
                
                {/* Right side (Desktop: Content/Date based on parity) */}
                <div className={cn(
                  "flex-1 pl-12 md:pl-0", // Mobile: padding left for content
                  "md:flex md:flex-col md:justify-start",
                  !isEven ? "items-end text-right" : "items-start text-left"
                )}>
                  {/* Mobile Date (Always shown above card on mobile) */}
                  <div className="md:hidden mb-2 flex items-center gap-2">
                     <span className={cn(
                       "font-bold text-lg",
                       isMajor ? "text-amber-600 dark:text-amber-500" : "text-foreground"
                     )}>
                       {event.date}
                     </span>
                     {event.category && (
                       <span className="px-2 py-0.5 rounded-full bg-muted/50 text-[10px] uppercase font-medium">
                         {event.category}
                       </span>
                     )}
                  </div>

                  {isEven ? (
                    // Right side when even: Content Card
                    <EventCard 
                       event={event} 
                       isExpanded={isExpanded} 
                       onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)} 
                       isMajor={isMajor}
                    />
                  ) : (
                    // Right side when odd: Date
                    <div className="sticky top-24 pt-2 hidden md:block">
                       <span className={cn(
                         "text-2xl font-bold tracking-tight",
                         isMajor ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                       )}>
                         {event.date}
                       </span>
                       {event.category && (
                         <div className="flex justify-start mt-1">
                           <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                             {event.category}
                           </span>
                         </div>
                       )}
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* End Marker */}
      <div className="relative mt-12 mb-8">
        <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-medium">
             <Sparkles className="h-3 w-3" />
             End of Timeline
          </div>
        </div>
      </div>
    </div>
  );
});

// Extracted card component for reuse
function EventCard({ 
  event, 
  isExpanded, 
  onToggle, 
  isMajor 
}: { 
  event: any; 
  isExpanded: boolean; 
  onToggle: () => void; 
  isMajor: boolean; 
}) {
  return (
    <div 
      className={cn(
        "group w-full bg-card border rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 relative overflow-hidden",
        "hover:shadow-md hover:border-amber-500/30",
        isExpanded && "ring-1 ring-amber-500/30 shadow-md",
        isMajor && "border-amber-500/40 bg-amber-500/5"
      )}
      onClick={onToggle}
    >
      {isMajor && (
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Star className="h-12 w-12 text-amber-500 rotate-12" />
        </div>
      )}
      
      <div className="relative z-10">
        <h3 className={cn(
          "text-lg font-bold mb-2 pr-8",
          isMajor && "text-amber-700 dark:text-amber-400"
        )}>
          {event.title}
        </h3>
        
        <div className={cn(
          "text-sm text-muted-foreground leading-relaxed",
          !isExpanded && "line-clamp-3"
        )}>
          {event.description}
        </div>
        
        {event.description.length > 120 && (
          <div className="mt-3 flex items-center text-xs font-medium text-primary/80 group-hover:text-primary transition-colors">
            {isExpanded ? (
              <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
            ) : (
              <>Read more <ChevronDown className="h-3 w-3 ml-1" /></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineSurface;
