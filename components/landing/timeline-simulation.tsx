"use client";

import { useEffect, useState, useRef } from "react";
import { ProcessingTimeline } from "@/components/chat/processing-timeline";
import { StatusPill, SearchResults } from "@/lib/utils/stream-parser";

/**
 * Compact Timeline Simulation for Landing Page
 */
export function TimelineSimulation() {
  const [statusPills, setStatusPills] = useState<StatusPill[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const addTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(callback, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  const startSimulation = () => {
    setStatusPills([]);
    setSearchResults(null);
    setHasContent(false);

    // Timeline Sequence
    // T+0.3s: Searching
    addTimeout(() => {
        setStatusPills(prev => [...prev, {
            status: "searching",
            message: "Exploring topic...",
            timestamp: Date.now()
        }]);
    }, 300);

    // T+1.5s: Reading
    addTimeout(() => {
        setStatusPills(prev => [...prev, {
            status: "reading_sources",
            message: "Reading 4 verified sources...",
            timestamp: Date.now(),
            metadata: { sourceCount: 4 }
        }]);

        setSearchResults({
            query: "example query",
            totalResults: 4,
            strategy: "default",
            sources: [
                { type: "web", url: "https://arxiv.org", title: "Attention Is All You Need", snippet: "Transformers...", images: [] },
                { type: "web", url: "https://nature.com", title: "Scalable language models", snippet: "Scaling laws...", images: [] }
            ]
        });
    }, 1500);

    // T+3.5s: Synthesizing
    addTimeout(() => {
        setStatusPills(prev => [...prev, {
            status: "synthesizing",
            message: "Synthesizing answer...",
            timestamp: Date.now()
        }]);
    }, 3500);

    // T+5.0s: Content appears
    addTimeout(() => {
        setHasContent(true);
    }, 5000);

    // T+8s: Restart
    addTimeout(() => {
        startSimulation();
    }, 8000);
  };

  useEffect(() => {
    startSimulation();
    return () => {
        timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[100px] bg-secondary/10 border border-border/50 rounded-lg p-3 flex items-center justify-center pointer-events-none select-none relative overflow-hidden">
       {/* Background */}
       <div className="absolute inset-0 bg-background/50" />
       
       <div className="w-full max-w-[90%] scale-90 origin-center relative z-10">
            <ProcessingTimeline 
                statusPills={statusPills}
                isStreaming={!hasContent}
                hasContent={hasContent}
                searchResults={searchResults}
                className="mb-0" 
            />
            
            <div 
                className={`mt-4 space-y-2 transition-opacity duration-700 ${hasContent ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="h-2 w-3/4 bg-foreground/10 rounded-full" />
                <div className="h-2 w-1/2 bg-foreground/10 rounded-full" />
                <div className="h-2 w-5/6 bg-foreground/10 rounded-full" />
            </div>
       </div>
    </div>
  );
}
