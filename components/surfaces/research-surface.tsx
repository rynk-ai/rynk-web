/**
 * Research Surface - Deep Research Document View
 * 
 * Presents comprehensive research in a professional format with:
 * - Hero image gallery
 * - Abstract/Executive summary
 * - Key findings
 * - Table of contents
 * - Structured sections with citations
 * - References section
 */

"use client";

import { memo, useState, useEffect, useRef } from "react";
import { 
  PiBookOpenText, 
  PiCaretRight, 
  PiArrowSquareOut, 
  PiHash,
  PiArrowUp,
  PiLightbulb,
  PiClock,
  PiFileText,
  PiQuotes,
  PiWarningCircle,
  PiCheckCircle
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { ResearchProgress } from "./research-progress";
import { ResearchSectionSkeleton } from "./surface-skeletons";
import { SelectableContent } from "@/components/selectable-content";
import { cn } from "@/lib/utils";
import type { ResearchMetadata, SurfaceState } from "@/lib/services/domain-types";

interface ResearchSurfaceProps {
  metadata: ResearchMetadata;
  surfaceState?: SurfaceState;
  isGenerating?: boolean;
  progress?: {
    current: number;
    total: number;
    message: string;
    step?: string;
  };
  surfaceId?: string;  // For subchat functionality
  onSubChatSelect?: (text: string, sectionId?: string, fullContent?: string) => void;
  sectionIdsWithSubChats?: Set<string>;  // Sections that have existing subchats
  onRetrySection?: (sectionId: string) => void;  // For retrying failed sections
}

export const ResearchSurface = memo(function ResearchSurface({
  metadata,
  surfaceState,
  isGenerating = false,
  progress,
  surfaceId,
  onSubChatSelect,
  sectionIdsWithSubChats,
  onRetrySection,
}: ResearchSurfaceProps) {
  // Defensive destructuring with defaults for progressive/skeleton loading
  const title = metadata?.title || 'Loading...';
  const abstract = metadata?.abstract || '';
  const keyFindings = metadata?.keyFindings || [];
  const methodology = metadata?.methodology || '';
  const limitations = metadata?.limitations || [];
  const sections = metadata?.sections || [];
  const allCitations = metadata?.allCitations || [];
  const heroImages = metadata?.heroImages || [];
  const totalSources = metadata?.totalSources || 0;
  const totalWordCount = metadata?.totalWordCount || 0;
  const estimatedReadTime = metadata?.estimatedReadTime || 0;
  
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`research-section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show progress overlay only before skeleton is available
  // Once skeleton has sections (even with pending status), show the structure
  if (isGenerating && (!sections || sections.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-16">
        <ResearchProgress progress={progress} />
      </div>
    );
  }

  // Source type badge
  const SourceBadge = ({ type }: { type: string }) => {
    const colors: Record<string, string> = {
      academic: 'bg-purple-500/10 text-purple-600',
      news: 'bg-blue-500/10 text-blue-600',
      official: 'bg-green-500/10 text-green-600',
      web: 'bg-gray-500/10 text-gray-600',
    };
    return (
      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-transparent", colors[type] || colors.web)}>
        {type}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Hero Images */}
      {heroImages.length > 0 && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {heroImages.slice(0, 4).map((img, idx) => (
            <a
              key={idx}
              href={img.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-xl overflow-hidden bg-secondary/50 shadow-sm border border-border/20"
            >
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-10 p-2">
        <div className="flex items-center gap-3 mb-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md border border-border/40">
            <PiFileText className="h-3.5 w-3.5" />
            <span>Research Document</span>
          </div>
          <span className="text-border">•</span>
          <span>{totalSources} sources</span>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5">
            <PiClock className="h-3.5 w-3.5" />
            <span>{estimatedReadTime} min read</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 font-display text-foreground">
          {title}
        </h1>
      </div>

      {/* Abstract Box */}
      {abstract && (
        <div className="mb-10 p-8 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl shadow-sm">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wide text-primary">
            <PiQuotes className="h-5 w-5" />
            Abstract
          </h2>
          <p className="text-lg text-foreground/80 leading-relaxed font-serif italic">
            {abstract}
          </p>
        </div>
      )}

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div className="mb-12 p-8 bg-primary/5 border border-primary/10 rounded-2xl">
          <h2 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wide text-primary">
            <PiCheckCircle className="h-5 w-5" />
            Key Findings
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/20">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5 border border-primary/20">
                  {idx + 1}
                </span>
                <span className="text-base text-foreground/90 leading-snug">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-12 relative">
        {/* Sticky Table of Contents */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 space-y-6">
            <div className="border border-border/40 rounded-2xl p-5 shadow-sm bg-card/40 backdrop-blur-md">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider pl-1">
                <PiHash className="h-4 w-4" />
                Contents
              </h3>
              <nav className="space-y-0.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-3 group relative overflow-hidden",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                     {activeSection === section.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                     )}
                    <span className="flex-shrink-0 mt-0.5">
                      {section.status === 'completed' ? (
                        <PiCheckCircle className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          activeSection === section.id ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                        )} />
                      ) : section.status === 'generating' ? (
                        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                      )}
                    </span>
                    <span className="truncate">{section.heading}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Stats */}
            <div className="p-5 bg-secondary/30 rounded-2xl border border-border/30 text-xs font-medium space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground uppercase tracking-wide">Words</span>
                <span className="bg-background px-2 py-0.5 rounded border border-border/50 font-mono text-foreground/80">{totalWordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground uppercase tracking-wide">Sources</span>
                <span className="bg-background px-2 py-0.5 rounded border border-border/50 font-mono text-foreground/80">{totalSources}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground uppercase tracking-wide">Sections</span>
                <span className="bg-background px-2 py-0.5 rounded border border-border/50 font-mono text-foreground/80">{sections.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* Sections */}
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-display prose-p:leading-relaxed prose-li:leading-relaxed">
            {sections.map((section, idx) => {
              // Check if section content is still loading (progressive loading)
              const isLoading = !section.content || 
                section.content === 'Loading...' || 
                section.content.startsWith('Loading:') ||
                section.status === 'pending';
              
              return (
                <section 
                  key={section.id} 
                  id={`research-section-${section.id}`}
                  className="mb-16 scroll-mt-28"
                >
                  <h2 className="text-2xl font-bold flex items-center gap-4 mb-6 pb-3 border-b border-border/40 group">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-primary font-mono text-sm shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </h2>
                  
                  {isLoading ? (
                    // Show skeleton while content is loading
                    <ResearchSectionSkeleton />
                  ) : (
                    // Animate content in when it loads
                    <div className="text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {/* Section Image - Wikipedia style float right */}
                      {section.sectionImages && section.sectionImages.length > 0 && (
                        <figure className="float-right ml-6 mb-6 mt-1 w-44 md:w-64 not-prose p-1 bg-card border rounded-xl shadow-sm">
                          <a 
                            href={section.sectionImages[0].sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden relative group"
                          >
                            <img 
                              src={section.sectionImages[0].url}
                              alt={section.heading}
                              className="w-full object-cover aspect-[4/3] transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg pointer-events-none" />
                          </a>
                          <figcaption className="text-[10px] text-muted-foreground mt-2 text-center line-clamp-2 px-2 pb-1 font-medium">
                            {section.sectionImages[0].sourceTitle}
                          </figcaption>
                        </figure>
                      )}
                      
                      <SelectableContent
                        sectionId={section.id}
                        onSelect={onSubChatSelect || (() => {})}
                        disabled={!onSubChatSelect}
                      >
                        <Markdown 
                          className="!bg-transparent !p-0 font-serif md:font-sans md:text-base leading-7"
                          citations={section.sectionCitations?.map((c: any, i: number) => ({
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
                      {section.sectionCitations && section.sectionCitations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-6 not-prose clear-both pt-4 border-t border-border/30 border-dashed">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wider mr-1">Sources:</span>
                          {section.sectionCitations.slice(0, 4).map((c: any, i: number) => {
                            let domain = 'source';
                            try { domain = new URL(c.url).hostname.replace('www.', ''); } catch {}
                            return (
                              <a 
                                key={i}
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full bg-secondary/40 hover:bg-secondary transition-all hover:scale-105 text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50"
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
                </section>
              );
            })}
          </article>

          {/* Methodology */}
          {methodology && (
            <div className="mt-16 pt-10 border-t border-border/40">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wide text-amber-600 dark:text-amber-500">
                <PiLightbulb className="h-4 w-4" />
                Methodology
              </h3>
              <div className="text-sm text-foreground/80 bg-amber-500/5 p-6 rounded-xl border border-amber-500/10 leading-relaxed font-serif italic">
                {methodology}
              </div>
            </div>
          )}

          {/* Limitations */}
          {limitations.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wide text-orange-600 dark:text-orange-500">
                <PiWarningCircle className="h-4 w-4" />
                Limitations
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2 bg-orange-500/5 p-6 rounded-xl border border-orange-500/10">
                {limitations.map((limit, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-orange-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500/50"></span>
                    <span className="leading-relaxed">{limit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          {allCitations.length > 0 && (
            <div className="mt-16 pt-10 border-t border-border/40">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                <PiBookOpenText className="h-4 w-4" />
                References ({allCitations.length})
              </h3>
              <ol className="grid gap-3">
                {allCitations.map((citation) => (
                  <li key={citation.id} className="text-sm flex items-start gap-4 p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/30">
                    <span className="flex-shrink-0 w-6 h-6 rounded bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground font-mono">
                      {citation.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-semibold text-foreground text-sm leading-snug">{citation.title}</span>
                        <SourceBadge type={citation.sourceType} />
                      </div>
                      {citation.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed opacity-80 pl-2 border-l-2 border-border/50">
                          {citation.snippet}
                        </p>
                      )}
                      {citation.url && (
                        <a 
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 hover:underline mt-2.5 transition-colors"
                        >
                          <PiArrowSquareOut className="h-3 w-3" />
                          View source
                        </a>
                      )}
                    </div>
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
          className="fixed bottom-10 right-10 h-10 w-10 text-primary-foreground rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:scale-110 active:scale-90 transition-all z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <PiArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
});

export default ResearchSurface;
