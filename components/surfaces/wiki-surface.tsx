/**
 * Wiki Surface - Encyclopedic Reference View
 * 
 * Presents information in a Wikipedia-style format with:
 * - Infobox with key facts
 * - Table of contents (sticky)
 * - Structured sections with markdown
 * - Related topics
 * - References
 */

"use client";

import { memo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  PiBookOpenText, 
  PiCaretRight, 
  PiArrowSquareOut, 
  PiHash,
  PiArrowUp,
  PiLightbulb,
  PiInfo
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { WikiSectionSkeleton } from "@/components/surfaces/surface-skeletons";
import { SourcesFooter } from "@/components/chat/sources-footer";
import { SourceImages, type SourceImage } from "@/components/chat/source-images";
import { SelectableContent } from "@/components/selectable-content";
import { cn } from "@/lib/utils";
import type { WikiMetadata, SurfaceState } from "@/lib/services/domain-types";
import type { Citation } from "@/lib/types/citation";

interface WikiSurfaceProps {
  metadata: WikiMetadata;
  surfaceState?: SurfaceState;
  conversationId?: string;  // For navigation on related topics
  surfaceId?: string;       // For subchat functionality
  onSubChatSelect?: (text: string, sectionId?: string, fullContent?: string) => void;
  sectionIdsWithSubChats?: Set<string>;  // Sections that have existing subchats
}

export const WikiSurface = memo(function WikiSurface({
  metadata,
  surfaceState,
  conversationId,
  surfaceId,
  onSubChatSelect,
  sectionIdsWithSubChats,
}: WikiSurfaceProps) {
  const router = useRouter();
  
  // Defensive destructuring with defaults for progressive loading
  const title = metadata?.title || 'Loading...';
  const summary = metadata?.summary || '';
  const infobox = metadata?.infobox || { facts: [] };
  const sections = metadata?.sections || [];
  const relatedTopics = metadata?.relatedTopics || [];
  const references = metadata?.references || [];
  const categories = metadata?.categories || [];
  const availableImages = metadata?.availableImages || surfaceState?.availableImages || [];
  
  // Convert raw citations from surfaceState to Citation format for SourcesFooter
  const citations: Citation[] = (surfaceState?.citations || []).map((c, i) => ({
    id: i + 1,
    url: c.url,
    title: c.title || 'Source',
    snippet: c.snippet || '',
    source: (c.source || 'exa') as 'exa' | 'perplexity' | 'wikipedia',
    favicon: c.favicon,
    image: c.image
  }));
  
  // Extract images from citations for hero display
  const citationImages: SourceImage[] = citations
    .filter(c => c.image)
    .map(c => ({
      url: c.image!,
      sourceUrl: c.url,
      sourceTitle: c.title
    }));
  
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Use IntersectionObserver for BackToTop visibility since window.scroll events 
  // might not fire if the scrolling happens in a parent container
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show button when top sentinel is NOT visible (user scrolled down)
        setShowBackToTop(!entry.isIntersecting);
      },
      { rootMargin: '100px 0px 0px 0px' } // Add some buffer
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // IntersectionObserver to track which section is visible for TOC highlighting
  useEffect(() => {
    if (sections.length === 0) return;
    
    // Create observers for all section elements
    const sectionElements = sections.map(s => document.getElementById(`section-${s.id}`)).filter(Boolean);
    
    if (sectionElements.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first section that's intersecting (visible in viewport)
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id.replace('section-', '');
            setActiveSection(sectionId);
            break;
          }
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px', // Adjusted for better detection in scroll container
        threshold: 0
      }
    );
    
    sectionElements.forEach(el => {
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [sections]);


  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Fallback for manual active state set
      setActiveSection(sectionId);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    topSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative animate-in fade-in duration-500 bg-background text-foreground min-h-full">
      {/* Sentinel for scroll detection */}
      <div ref={topSentinelRef} className="h-px w-full absolute top-0 pointer-events-none opacity-0" />
      
      {availableImages.length > 0 && (
        <div className="relative h-48 md:h-64 mb-8 -mx-4 md:-mx-6 rounded-b-2xl overflow-hidden group">
          <img 
            src={availableImages[0].url} 
            alt={availableImages[0].title || title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
          
          {/* Image source pill */}
          {availableImages[0].sourceUrl && (
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/70 bg-black/20 backdrop-blur-md px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              Source: {new URL(availableImages[0].sourceUrl).hostname.replace('www.', '')}
            </div>
          )}
          
          {/* Image Gallery Trigger (if more images) */}
          {availableImages.length > 1 && (
             <div className="absolute bottom-3 left-3 flex gap-1">
              {availableImages.slice(1, 4).map((img: { url: string; title: string }, i: number) => (
                <div key={i} className="h-8 w-12 rounded-md overflow-hidden border border-white/20 shadow-sm relative">
                   <img src={img.url} className="w-full h-full object-cover" alt={img.title} />
                </div>
              ))}
              {availableImages.length > 4 && (
                <div className="h-8 w-12 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-[10px] text-white font-medium">
                  +{availableImages.length - 4}
                </div>
              )}
             </div>
          )}
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          {categories.map((cat, idx) => (
            <span 
              key={idx}
              className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
            >
              {cat}
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl">
          {summary}
        </p>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Sticky Table of Contents - Desktop */}
        <aside className="hidden lg:block w-72 shrink-0 z-30 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar pr-2">
          <div className="space-y-6">
             {/* TOC */}
            <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <PiHash className="h-4 w-4" />
                Contents
              </h3>
              <nav className="space-y-0.5">
                {sections.map((section) => (
                  <div key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-all duration-200",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {section.heading}
                    </button>
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/30 pl-2">
                        {section.subsections.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => scrollToSection(sub.id)}
                            className={cn(
                              "w-full text-left text-xs py-1 px-2 rounded-md transition-all",
                              activeSection === sub.id
                                ? "text-primary font-medium"
                                : "text-muted-foreground/70 hover:text-foreground"
                            )}
                          >
                            {sub.heading}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Infobox - Desktop */}
            {infobox.facts.length > 0 && (
              <div className="rounded-xl border border-border/30 bg-card p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 text-primary">
                  <PiInfo className="h-4 w-4" />
                  Quick Facts
                </h3>
                <dl className="space-y-3">
                  {infobox.facts.map((fact, idx) => (
                    <div key={idx} className="text-sm border-b border-border/30 last:border-0 pb-2 last:pb-0">
                      <dt className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wide mb-0.5">{fact.label}</dt>
                      <dd className="font-medium text-foreground break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </aside>


        {/* Main Content */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* Mobile Infobox */}
          {infobox.facts.length > 0 && (
            <div className="lg:hidden mb-8 bg-muted/20 border border-border/30 rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 text-primary">
                <PiInfo className="h-4 w-4" />
                Quick Facts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infobox.facts.map((fact, idx) => (
                  <div key={idx} className="text-sm">
                    <dt className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wide mb-0.5">{fact.label}</dt>
                    <dd className="font-medium">{fact.value}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article Sections */}
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:tracking-tight prose-p:leading-relaxed prose-img:rounded-xl">
            {sections.map((section, idx) => {
              // Check if section content is still loading (skeleton content)
              const isLoading = !section.content || section.content === 'Loading...' || section.content.startsWith('Loading:');
              const sectionCitations = section.citations || [];
              const sectionImages = section.images || [];
              
              return (
                <section 
                  key={section.id} 
                  id={`section-${section.id}`}
                  className="mb-12 scroll-mt-24 group"
                >
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 pb-2 border-b border-border/30 group-hover:border-primary/20 transition-colors">
                    <span className="text-primary/40 text-sm pt-1">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </h2>
                  
                  {isLoading ? (
                    // Show skeleton while content is loading
                    <WikiSectionSkeleton />
                  ) : (
                    // Animate content in when it loads
                    <div className="text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {/* Section Image - Wikipedia style float right */}
                      {sectionImages.length > 0 && (
                        <figure className="float-right ml-6 mb-4 mt-1 w-full md:w-64 max-w-full md:max-w-xs not-prose">
                          <a 
                            href={sectionImages[0].sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-border/20 shadow-sm transition-transform hover:scale-[1.01]"
                          >
                            <img 
                              src={sectionImages[0].url}
                              alt={section.heading}
                              className="w-full object-cover aspect-[4/3] bg-muted"
                              loading="lazy"
                            />
                          </a>
                          <figcaption className="text-xs text-muted-foreground mt-2 text-center line-clamp-2 px-2">
                            {sectionImages[0].sourceTitle}
                          </figcaption>
                        </figure>
                      )}
                      
                      <SelectableContent
                        sectionId={section.id}
                        onSelect={onSubChatSelect || (() => {})}
                        disabled={!onSubChatSelect}
                      >
                        <Markdown 
                          className="!bg-transparent !p-0 text-base"
                          citations={sectionCitations.map((c: { url: string; title: string; snippet?: string }, i: number) => ({
                            id: i + 1,
                            url: c.url,
                            title: c.title || 'Source',
                            snippet: c.snippet || '',
                            source: 'exa' as const
                          }))}
                        >
                          {section.content}
                        </Markdown>
                      </SelectableContent>
                      
                      {/* Section source pills */}
                      {sectionCitations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-6 not-prose clear-both pt-2">
                          {sectionCitations.slice(0, 4).map((c: { url: string; title: string; snippet?: string }, i: number) => {
                            let domain = 'source';
                            try { domain = new URL(c.url).hostname.replace('www.', ''); } catch {}
                            return (
                              <a 
                                key={i}
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border/30"
                              >
                                <img 
                                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} 
                                  className="h-3 w-3 rounded-sm opacity-70" 
                                  alt=""
                                />
                                <span className="truncate max-w-[120px]">{domain}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subsections */}
                  {section.subsections && section.subsections.map((sub) => {
                    const subIsLoading = !sub.content || sub.content === 'Loading...';
                    
                    return (
                      <div 
                        key={sub.id}
                        id={`section-${sub.id}`}
                        className="mt-8 pt-4"
                      >
                        <h3 className="text-xl font-semibold mb-3 text-foreground/90">{sub.heading}</h3>
                        {subIsLoading ? (
                          <WikiSectionSkeleton />
                        ) : (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Markdown className="!bg-transparent !p-0">
                              {sub.content}
                            </Markdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </article>

          {/* Related Topics - Clickable to generate new wiki */}
          {relatedTopics.length > 0 && (
            <div className="mt-16 pt-10 border-t border-border/30 bg-muted/10 -mx-4 px-4 py-8 md:mx-0 md:px-0 md:bg-transparent rounded-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 text-foreground/80 md:px-6">
                <PiLightbulb className="h-4 w-4 text-amber-500" />
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2 md:px-6">
                {relatedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      // Navigate to new wiki with topic as query
                      const newId = crypto.randomUUID();
                      router.push(`/surface/wiki/${newId}?q=${encodeURIComponent(topic)}`);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-card hover:bg-accent border border-border/30 hover:border-border/60 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 group text-muted-foreground hover:text-foreground"
                  >
                    {topic}
                    <PiCaretRight className="h-3.5 w-3.5 opacity-50 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sources - Use SourcesFooter if citations available, fallback to simple references */}
          {citations.length > 0 ? (
            <div className="mt-8 text-sm">
                <SourcesFooter citations={citations} variant="compact" />
            </div>
          ) : references.length > 0 && (
            <div className="mt-16 pt-8 border-t border-border/30">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 text-foreground/80">
                <PiBookOpenText className="h-4 w-4 text-primary" />
                References
              </h3>
              <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-decimal list-inside">
                {references.map((ref, idx) => (
                  <li key={ref.id} className="text-sm text-muted-foreground py-1">
                    <span className="text-foreground/90 font-medium">{ref.title}</span>
                    {ref.url && (
                      <a 
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline opacity-80 hover:opacity-100"
                      >
                        <PiArrowSquareOut className="h-3.5 w-3.5" />
                        <span className="text-xs">View</span>
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </main>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 h-10 w-10 rounded-full shadow-xl bg-primary hover:bg-primary/90 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 print:hidden"
        >
          <PiArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
});

export default WikiSurface;
