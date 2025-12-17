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
import { 
  BookOpen, 
  ChevronRight, 
  ExternalLink, 
  Hash,
  ArrowUp,
  Lightbulb,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { WikiSectionSkeleton } from "@/components/surfaces/surface-skeletons";
import { cn } from "@/lib/utils";
import type { WikiMetadata, SurfaceState } from "@/lib/services/domain-types";

interface WikiSurfaceProps {
  metadata: WikiMetadata;
  surfaceState?: SurfaceState;
}

export const WikiSurface = memo(function WikiSurface({
  metadata,
  surfaceState,
}: WikiSurfaceProps) {
  // Defensive destructuring with defaults for progressive loading
  const title = metadata?.title || 'Loading...';
  const summary = metadata?.summary || '';
  const infobox = metadata?.infobox || { facts: [] };
  const sections = metadata?.sections || [];
  const relatedTopics = metadata?.relatedTopics || [];
  const references = metadata?.references || [];
  const categories = metadata?.categories || [];
  const availableImages = surfaceState?.availableImages || [];
  
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track scroll position for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Hero Images */}
      {availableImages.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableImages.slice(0, 4).map((img, idx) => (
            <a
              key={idx}
              href={img.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-lg overflow-hidden bg-secondary/50"
            >
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {categories.map((cat, idx) => (
            <span 
              key={idx}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary"
            >
              {cat}
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-8 relative">
        {/* Sticky Table of Contents - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <div className="border-border/40 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <div key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {section.heading}
                    </button>
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="ml-3 mt-1 space-y-0.5">
                        {section.subsections.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => scrollToSection(sub.id)}
                            className={cn(
                              "w-full text-left text-xs py-1 px-2 rounded-lg transition-colors",
                              activeSection === sub.id
                                ? "text-primary"
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
              <div className="mt-4 bg-secondary/50 border border-border/40 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Quick Facts
                </h3>
                <dl className="space-y-2">
                  {infobox.facts.map((fact, idx) => (
                    <div key={idx} className="text-sm">
                      <dt className="text-muted-foreground text-xs">{fact.label}</dt>
                      <dd className="font-medium">{fact.value}</dd>
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
            <div className="lg:hidden mb-6 bg-secondary/50 border border-border/40 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Quick Facts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {infobox.facts.map((fact, idx) => (
                  <div key={idx} className="text-sm">
                    <dt className="text-muted-foreground text-xs">{fact.label}</dt>
                    <dd className="font-medium">{fact.value}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article Sections */}
          <article className="prose prose-slate dark:prose-invert max-w-none">
            {sections.map((section, idx) => {
              // Check if section content is still loading (skeleton content)
              const isLoading = !section.content || section.content === 'Loading...' || section.content.startsWith('Loading:');
              
              return (
                <section 
                  key={section.id} 
                  id={`section-${section.id}`}
                  className="mb-10 scroll-mt-24"
                >
                  <h2 className="text-xl font-bold flex items-center gap-3 mb-4 pb-2 border-b border-border/30">
                    <span className="text-primary/60 text-sm font-mono">
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
                      <Markdown className="!bg-transparent !p-0">
                        {section.content}
                      </Markdown>
                    </div>
                  )}

                  {/* Subsections */}
                  {section.subsections && section.subsections.map((sub) => {
                    const subIsLoading = !sub.content || sub.content === 'Loading...';
                    
                    return (
                      <div 
                        key={sub.id}
                        id={`section-${sub.id}`}
                        className="mt-6 ml-4 pl-4 border-l-2 border-primary/20 scroll-mt-24"
                      >
                        <h3 className="text-lg font-semibold mb-2">{sub.heading}</h3>
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

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-full transition-colors flex items-center gap-1.5 group"
                  >
                    {topic}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {references.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                References
              </h3>
              <ol className="space-y-2 list-decimal list-inside">
                {references.map((ref, idx) => (
                  <li key={ref.id} className="text-sm text-muted-foreground">
                    <span className="text-foreground">{ref.title}</span>
                    {ref.url && (
                      <a 
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
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
          className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
});

export default WikiSurface;
