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
  BookOpen, 
  ChevronRight, 
  ExternalLink, 
  Hash,
  ArrowUp,
  Lightbulb,
  Clock,
  FileText,
  Quote,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { ResearchProgress } from "./research-progress";
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
}

export const ResearchSurface = memo(function ResearchSurface({
  metadata,
  surfaceState,
  isGenerating = false,
  progress,
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

  // Show progress overlay if still generating
  if (isGenerating && (!sections || sections.length === 0 || sections[0]?.status === 'pending')) {
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
      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", colors[type] || colors.web)}>
        {type}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Hero Images */}
      {heroImages.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {heroImages.slice(0, 4).map((img, idx) => (
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

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Research Document</span>
          <span className="mx-1">•</span>
          <span>{totalSources} sources</span>
          <span className="mx-1">•</span>
          <Clock className="h-3.5 w-3.5" />
          <span>{estimatedReadTime} min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {title}
        </h1>
      </div>

      {/* Abstract Box */}
      {abstract && (
        <div className="mb-8 p-6 bg-secondary/30 border border-border/40 rounded-xl">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            Abstract
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            {abstract}
          </p>
        </div>
      )}

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Key Findings
          </h2>
          <ul className="space-y-2">
            {keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-foreground/90">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-8 relative">
        {/* Sticky Table of Contents */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <div className="border-border/40 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors flex items-center gap-2",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {section.status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : section.status === 'generating' ? (
                      <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                    )}
                    <span className="truncate">{section.heading}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Stats */}
            <div className="mt-4 p-4 bg-secondary/50 rounded-xl text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Words</span>
                <span className="font-medium">{totalWordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Sources</span>
                <span className="font-medium">{totalSources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium">{sections.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* Sections */}
          <article className="prose prose-slate dark:prose-invert max-w-none">
            {sections.map((section, idx) => (
              <section 
                key={section.id} 
                id={`research-section-${section.id}`}
                className="mb-10 scroll-mt-24"
              >
                <h2 className="text-xl font-bold flex items-center gap-3 mb-4 pb-2 border-b border-border/30">
                  <span className="text-primary/60 text-sm font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {section.heading}
                  {section.status === 'generating' && (
                    <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                      Generating...
                    </span>
                  )}
                </h2>
                
                {section.content ? (
                  <div className="text-foreground/90">
                    <Markdown className="!bg-transparent !p-0">
                      {section.content}
                    </Markdown>
                  </div>
                ) : section.status === 'pending' ? (
                  <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin mb-2" />
                    <span className="text-sm">Generating content...</span>
                  </div>
                ) : null}

                {/* Section citations */}
                {section.citations.length > 0 && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Sources: {section.citations.map(c => `[${c}]`).join(' ')}
                  </div>
                )}
              </section>
            ))}
          </article>

          {/* Methodology */}
          {methodology && (
            <div className="mt-12 pt-8 border-t border-border/30">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Methodology
              </h3>
              <p className="text-sm text-muted-foreground">
                {methodology}
              </p>
            </div>
          )}

          {/* Limitations */}
          {limitations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                Limitations
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {limitations.map((limit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    {limit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          {allCitations.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                References ({allCitations.length})
              </h3>
              <ol className="space-y-3">
                {allCitations.map((citation) => (
                  <li key={citation.id} className="text-sm flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded bg-secondary text-xs font-medium flex items-center justify-center">
                      {citation.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{citation.title}</span>
                        <SourceBadge type={citation.sourceType} />
                      </div>
                      {citation.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {citation.snippet}
                        </p>
                      )}
                      {citation.url && (
                        <a 
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
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
          className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
});

export default ResearchSurface;
