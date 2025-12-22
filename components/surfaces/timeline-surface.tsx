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
  PiCalendar,
  PiFunnel,
  PiCaretDown,
  PiCaretUp,
  PiStar,
  PiStarFill,
  PiClock,
  PiSparkle,
  PiFlag,
  PiMapPin,
  PiCalendarBlank
} from "react-icons/pi";
import type { TimelineMetadata } from "@/lib/services/domain-types";
import { TimelineEventSkeleton } from "@/components/surfaces/surface-skeletons";

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
    <div className="max-w-5xl mx-auto pb-12">
      {/* Clean Hero Header */}
      <div className="bg-card border border-border/30 rounded-2xl shadow-sm mb-12 p-10 text-center relative overflow-hidden bg-gradient-to-br from-card to-muted/20">
        <div className="relative z-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mb-5 text-amber-600 dark:text-amber-500 shadow-sm">
            <PiCalendar className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight font-display text-foreground">{metadata.title}</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-8">{metadata.description}</p>
          
          {metadata.startDate && metadata.endDate && (
            <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-background border border-border/40 rounded-full text-sm font-medium text-foreground/80 shadow-sm">
              <PiClock className="h-4 w-4 text-amber-500" />
              <span>{metadata.startDate}</span>
              <span className="opacity-40 px-1">—</span>
              <span>{metadata.endDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats & Filter Bar */}
      <div className="sticky top-20 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 mb-8 border-b border-border/30 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-filter-none md:border-none md:static md:mb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border/40 rounded-xl shadow-sm min-w-max hover:border-amber-500/20 transition-colors cursor-default">
              <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-500">
                <PiStarFill className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{majorEvents.length} Key Events</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border/40 rounded-xl shadow-sm min-w-max hover:border-primary/20 transition-colors cursor-default">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                <PiFlag className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{metadata.events.length} Total</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <div className="p-2 text-muted-foreground bg-muted/30 rounded-lg mr-1 hidden md:block">
                <PiFunnel className="h-4 w-4" />
              </div>
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "rounded-full h-8 flex-shrink-0 text-xs font-medium px-4",
                  selectedCategory === null ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category as string}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category as string)}
                  className={cn(
                    "rounded-full h-8 flex-shrink-0 text-xs font-medium px-4 border shadow-sm",
                    selectedCategory === category 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-border/50"
                  )}
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
        <div className="absolute left-8 md:left-1/2 top-4 bottom-12 w-[1px] bg-gradient-to-b from-transparent via-border to-transparent md:-translate-x-1/2" />
        
        {/* Events */}
        <div className="space-y-16">
          {filteredEvents.map((event, index) => {
            const isExpanded = expandedEvent === event.id;
            const isMajor = event.importance === 'major';
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={event.id}
                className={cn(
                  "relative flex gap-8",
                  "md:grid md:grid-cols-2 md:gap-16"
                )}
              >
                {/* Mobile Date Marker (Left side for mobile) */}
                <div className="md:hidden absolute left-8 -translate-x-1/2 w-4 h-full flex flex-col items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 z-10 bg-background transition-all box-content",
                    isMajor 
                      ? "border-amber-500 bg-amber-500 ring-4 ring-amber-500/10 shadow-lg shadow-amber-500/20" 
                      : "border-border bg-muted ring-2 ring-background"
                  )} />
                </div>

                {/* Left side (Desktop: Date/Content based on parity) */}
                <div className={cn(
                  "hidden md:flex flex-col justify-start",
                  !isEven ? "items-start text-left" : "items-end text-right"
                )}>
                  {isEven ? (
                     // Left side when even: Date
                     <div className="sticky top-32 pt-3 opacity-80 hover:opacity-100 transition-opacity">
                       <span className={cn(
                         "text-3xl font-bold tracking-tight font-display",
                         isMajor ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                       )}>
                         {event.date}
                       </span>
                       {event.category && (
                         <div className="flex justify-end mt-2">
                           <span className="px-2.5 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                    "w-4 h-4 rounded-full border-[3px] z-10 transition-all duration-500 box-content",
                    isMajor 
                      ? "border-amber-500 bg-background ring-4 ring-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-110" 
                      : "border-muted-foreground/30 bg-background ring-4 ring-background shadow-sm"
                  )} />
                </div>
                
                {/* Right side (Desktop: Content/Date based on parity) */}
                <div className={cn(
                  "flex-1 pl-12 md:pl-0", // Mobile: padding left for content
                  "md:flex md:flex-col md:justify-start",
                  !isEven ? "items-end text-right" : "items-start text-left"
                )}>
                  {/* Mobile Date (Always shown above card on mobile) */}
                  <div className="md:hidden mb-3 flex items-center gap-3">
                     <span className={cn(
                       "font-bold text-xl font-display",
                       isMajor ? "text-amber-600 dark:text-amber-500" : "text-foreground"
                     )}>
                       {event.date}
                     </span>
                     {event.category && (
                       <span className="px-2 py-0.5 rounded-md bg-muted/50 border border-border/30 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
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
                    <div className="sticky top-32 pt-3 hidden md:block opacity-80 hover:opacity-100 transition-opacity">
                       <span className={cn(
                         "text-3xl font-bold tracking-tight font-display",
                         isMajor ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                       )}>
                         {event.date}
                       </span>
                       {event.category && (
                         <div className="flex justify-start mt-2">
                           <span className="px-2.5 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
      <div className="relative mt-20 mb-8">
        <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-border/60" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-bold bg-background/50 backdrop-blur-sm px-4 py-1 rounded-full border border-border/20">
             <PiSparkle className="h-3.5 w-3.5" />
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
  // Check if event content is still loading (progressive loading)
  const isLoading = event.description === 'Loading...' || 
    event.status === 'pending' ||
    !event.description;
    
  if (isLoading) {
    return <TimelineEventSkeleton />;
  }
  
  return (
    <div 
      className={cn(
        "group w-full bg-card border rounded-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2",
        "hover:shadow-lg hover:-translate-y-0.5",
        isExpanded && "ring-1 ring-primary/20 shadow-md",
        isMajor && "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:shadow-amber-500/10",
        !isMajor && "border-border/40 hover:border-border"
      )}
      onClick={onToggle}
    >
      {isMajor && (
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <PiStarFill className="h-16 w-16 text-amber-500 rotate-12" />
        </div>
      )}
      
      <div className="relative z-10">
        <h3 className={cn(
          "text-xl font-bold mb-3 pr-8 leading-snug font-display",
          isMajor ? "text-amber-700 dark:text-amber-400" : "text-foreground"
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
          <div className={cn(
            "mt-4 flex items-center text-xs font-bold uppercase tracking-wider transition-colors",
            isMajor ? "text-amber-600/70 group-hover:text-amber-600" : "text-primary/70 group-hover:text-primary"
          )}>
            {isExpanded ? (
              <>Show less <PiCaretUp className="h-3 w-3 ml-1.5" /></>
            ) : (
              <>Read more <PiCaretDown className="h-3 w-3 ml-1.5" /></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineSurface;
