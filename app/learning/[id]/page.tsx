"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  PiGraduationCap, 
  PiArrowLeft,
  PiCaretRight,
  PiCaretDown,
  PiClock,
  PiBookOpenText,
  PiCheckCircle,
  PiLock,
  PiPlay,
  PiFire,
  PiSpinner,
  PiList,
  PiX
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/prompt-kit/markdown";
import { SelectableContent } from "@/components/selectable-content";
import { SubChatSheet } from "@/components/chat/sub-chat-sheet";
import { useSurfaceSubChats } from "@/lib/hooks/use-surface-sub-chats";
import { cn } from "@/lib/utils";
import { StreakDisplay } from "@/components/learning/streak-display";
import { XPProgress } from "@/components/learning/xp-progress";
import { SectionComplete } from "@/components/learning/section-complete";
import { AssessmentPanel, type Assessment } from "@/components/learning/assessment-panel";
import { QuickCheckSection, type QuickCheckQuestion } from "@/components/learning/quick-check";
import type { CourseMetadata, CourseUnit, CourseChapter, CourseSection, CourseProgress } from "@/lib/services/domain-types";

/**
 * Course View Page
 * 
 * The main learning experience with:
 * - Collapsible ToC sidebar
 * - Progressive section loading
 * - Progress tracking
 * - Streak display
 */

// Section content skeleton
function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-secondary rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-secondary rounded w-full" />
        <div className="h-4 bg-secondary rounded w-5/6" />
        <div className="h-4 bg-secondary rounded w-4/5" />
      </div>
      <div className="h-4 bg-secondary rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-4 bg-secondary rounded w-full" />
        <div className="h-4 bg-secondary rounded w-3/4" />
      </div>
    </div>
  );
}

// ToC Sidebar Component
function TocSidebar({
  metadata,
  progress,
  onSelectSection,
  currentSection,
  isOpen,
  onClose
}: {
  metadata: CourseMetadata;
  progress: CourseProgress;
  onSelectSection: (unitId: string, chapterId: string, sectionId: string) => void;
  currentSection: { unitId: string; chapterId: string; sectionId: string } | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // Initialize with first unit expanded, and first chapter of first unit
  const firstUnitId = metadata.units[0]?.id || '';
  const firstChapterId = metadata.units[0]?.chapters[0]?.id || '';
  
  const [expandedUnits, setExpandedUnits] = useState<string[]>([firstUnitId]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([firstChapterId]);

  // Auto-expand current section's unit and chapter when navigation changes
  useEffect(() => {
    if (currentSection) {
      setExpandedUnits(prev => 
        prev.includes(currentSection.unitId) ? prev : [...prev, currentSection.unitId]
      );
      setExpandedChapters(prev => 
        prev.includes(currentSection.chapterId) ? prev : [...prev, currentSection.chapterId]
      );
    }
  }, [currentSection]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => 
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]
    );
  };

  const isSectionCompleted = (sectionId: string) => 
    progress.completedSections.includes(sectionId);

  const isChapterCompleted = (chapter: CourseChapter) =>
    chapter.sections.every(s => progress.completedSections.includes(s.id));

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border/40 flex flex-col",
      "transform transition-transform duration-300",
      "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Mobile close button */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary z-10"
      >
        <PiX className="h-5 w-5" />
      </button>
      
      {/* Course header - fixed at top */}
      <div className="p-4 border-b border-border/40 shrink-0">
        <h2 className="font-semibold line-clamp-2">{metadata.title}</h2>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <PiClock className="h-3.5 w-3.5" />
          <span>{metadata.totalEstimatedTime} min total</span>
          <span className="mx-1">•</span>
          <span>{metadata.totalChapters} chapters</span>
        </div>
        
        {/* Overall progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{Math.round((progress.completedSections.length / metadata.totalSections) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(progress.completedSections.length / metadata.totalSections) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* ToC list */}
      <div className="flex-1 overflow-auto p-2">
        {metadata.units.map((unit) => (
          <div key={unit.id} className="mb-2">
            {/* Unit header */}
            <button
              onClick={() => toggleUnit(unit.id)}
              className="w-full flex items-center gap-2 p-2 text-left rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <PiCaretRight className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expandedUnits.includes(unit.id) && "rotate-90"
              )} />
              <span className="font-medium text-sm line-clamp-1">{unit.title}</span>
            </button>
            
            {/* Chapters */}
            {expandedUnits.includes(unit.id) && (
              <div className="ml-4 mt-1 space-y-1">
                {unit.chapters.map((chapter) => (
                  <div key={chapter.id}>
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 text-left rounded-lg text-sm transition-colors",
                        isChapterCompleted(chapter) 
                          ? "text-green-600 dark:text-green-400" 
                          : "hover:bg-secondary/50"
                      )}
                    >
                      {isChapterCompleted(chapter) ? (
                        <PiCheckCircle className="h-4 w-4 shrink-0" />
                      ) : chapter.status === 'locked' ? (
                        <PiLock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <PiCaretRight className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          expandedChapters.includes(chapter.id) && "rotate-90"
                        )} />
                      )}
                      <span className="line-clamp-1">{chapter.title}</span>
                    </button>
                    
                    {/* Sections */}
                    {expandedChapters.includes(chapter.id) && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {chapter.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => onSelectSection(unit.id, chapter.id, section.id)}
                            className={cn(
                              "w-full flex items-center gap-2 p-1.5 text-left rounded-md text-xs transition-colors",
                              currentSection?.sectionId === section.id
                                ? "bg-primary/10 text-primary"
                                : isSectionCompleted(section.id)
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )}
                          >
                            {isSectionCompleted(section.id) ? (
                              <PiCheckCircle className="h-3 w-3 shrink-0" />
                            ) : currentSection?.sectionId === section.id ? (
                              <PiPlay className="h-3 w-3 shrink-0" />
                            ) : (
                              <div className="h-3 w-3 rounded-full border border-current shrink-0" />
                            )}
                            <span className="line-clamp-1">{section.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function CourseViewPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, status } = useSession();
  
  const [metadata, setMetadata] = useState<CourseMetadata | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [currentSection, setCurrentSection] = useState<{
    unitId: string;
    chapterId: string;
    sectionId: string;
  } | null>(null);
  const [sectionContent, setSectionContent] = useState<string>("");
  const [quickChecks, setQuickChecks] = useState<QuickCheckQuestion[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  
  // Surface sub-chat hook for deep dive functionality in learning content
  const {
    activeSubChat,
    subChatSheetOpen,
    setSubChatSheetOpen,
    subChatLoading,
    subChatStreamingContent,
    subChatSearchResults,
    handleOpenSubChat,
    handleSubChatSendMessage,
  } = useSurfaceSubChats(
    courseId ? { type: 'learning', id: courseId } : null
  );
  
  // Load course data
  useEffect(() => {
    async function loadCourse() {
      if (!courseId || !session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/learning/course/${courseId}`);
        if (response.ok) {
          const data = await response.json() as { 
            metadata: CourseMetadata; 
            progress: CourseProgress;
          };
          setMetadata(data.metadata);
          setProgress(data.progress);
          
          // Set initial section - validate lastPosition exists in metadata
          let initialSectionSet = false;
          
          if (data.progress.lastPosition?.sectionId) {
            const lp = data.progress.lastPosition;
            const unit = data.metadata.units.find(u => u.id === lp.unitId);
            const chapter = unit?.chapters.find(c => c.id === lp.chapterId);
            const section = chapter?.sections.find(s => s.id === lp.sectionId);
            
            if (section) {
              setCurrentSection(lp);
              initialSectionSet = true;
            }
          }
          
          // Fall back to first section if lastPosition invalid
          if (!initialSectionSet && data.metadata.units.length > 0) {
            const firstUnit = data.metadata.units[0];
            const firstChapter = firstUnit.chapters?.[0];
            const firstSection = firstChapter?.sections?.[0];
            if (firstSection) {
              setCurrentSection({
                unitId: firstUnit.id,
                chapterId: firstChapter.id,
                sectionId: firstSection.id
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load course:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (session?.user?.id) {
      loadCourse();
    }
  }, [courseId, session?.user?.id]);
  
  // Load section content - use ref to avoid rerun when updating progress
  const progressRef = useRef(progress);
  progressRef.current = progress;
  
  useEffect(() => {
    async function loadSectionContent() {
      if (!currentSection || !metadata) return;
      
      const currentProgress = progressRef.current;
      
      // Check if content is already cached
      if (currentProgress?.sectionContent?.[currentSection.sectionId]) {
        setSectionContent(currentProgress.sectionContent[currentSection.sectionId]);
        setQuickChecks(currentProgress.sectionQuickChecks?.[currentSection.sectionId] || []);
        return;
      }
      
      // Find the section info to send proper context
      const unit = metadata.units.find(u => u.id === currentSection.unitId);
      const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
      const section = chapter?.sections.find(s => s.id === currentSection.sectionId);
      
      if (!section) {
        console.error("Section not found in metadata:", {
          currentSection,
          availableUnits: metadata.units.map(u => u.id),
          unitFound: !!unit,
          chapterFound: !!chapter
        });
        return;
      }
      
      setIsLoadingContent(true);
      setSectionContent("");
      setQuickChecks([]);
      
      try {
        const response = await fetch("/api/learning/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            unitId: currentSection.unitId,
            chapterId: currentSection.chapterId,
            sectionId: currentSection.sectionId,
            // Pass actual content for generation
            courseTitle: metadata.title,
            unitTitle: unit?.title || '',
            chapterTitle: chapter?.title || '',
            sectionTitle: section.title,
            sectionDescription: section.description || '',
            chapterObjectives: chapter?.learningObjectives || []
          })
        });
        
        if (response.ok) {
          const data = await response.json() as { content: string; quickChecks?: QuickCheckQuestion[] };
          setSectionContent(data.content);
          setQuickChecks(data.quickChecks || []);
          
          // Update local progress cache
          setProgress(prev => prev ? {
            ...prev,
            sectionContent: {
              ...prev.sectionContent,
              [currentSection.sectionId]: data.content
            },
            sectionQuickChecks: {
              ...prev.sectionQuickChecks,
              [currentSection.sectionId]: data.quickChecks || []
            }
          } : null);
        }
      } catch (error) {
        console.error("Failed to load section:", error);
      } finally {
        setIsLoadingContent(false);
      }
    }
    
    loadSectionContent();
  }, [currentSection, metadata, courseId]); // Removed progress from deps
  
  // Handle section selection
  const handleSelectSection = useCallback((unitId: string, chapterId: string, sectionId: string) => {
    setCurrentSection({ unitId, chapterId, sectionId });
    setIsSidebarOpen(false); // Close sidebar on mobile
  }, []);
  
  // Get current section info
  const getCurrentSectionInfo = () => {
    if (!metadata || !currentSection) return null;
    
    const unit = metadata.units.find(u => u.id === currentSection.unitId);
    const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
    const section = chapter?.sections.find(s => s.id === currentSection.sectionId);
    
    return { unit, chapter, section };
  };
  
  // Check if current chapter is complete
  const isChapterComplete = useCallback(() => {
    if (!metadata || !currentSection || !progress) return false;
    
    const unit = metadata.units.find(u => u.id === currentSection.unitId);
    const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
    if (!chapter) return false;
    
    return chapter.sections.every(s => progress.completedSections.includes(s.id));
  }, [metadata, currentSection, progress]);
  
  // Load assessment for current chapter
  const loadAssessment = useCallback(async () => {
    if (!metadata || !currentSection) return;
    
    const unit = metadata.units.find(u => u.id === currentSection.unitId);
    const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
    if (!chapter) return;
    
    setIsLoadingAssessment(true);
    
    try {
      const response = await fetch("/api/learning/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          sectionTitles: chapter.sections.map(s => s.title),
          assessmentType: "quiz"
        })
      });
      
      if (response.ok) {
        const data = await response.json() as { assessment: Assessment };
        setAssessment(data.assessment);
        setShowAssessment(true);
      }
    } catch (error) {
      console.error("Failed to load assessment:", error);
    } finally {
      setIsLoadingAssessment(false);
    }
  }, [metadata, currentSection, courseId]);
  
  // Handle assessment completion
  const handleAssessmentComplete = (score: number, passed: boolean) => {
    if (passed && progress) {
      setProgress(prev => prev ? {
        ...prev,
        xp: (prev.xp || 0) + 100,
        assessmentResults: [
          ...(prev.assessmentResults || []),
          {
            chapterId: currentSection?.chapterId || '',
            assessmentType: 'quiz',
            score,
            passed,
            completedAt: Date.now()
          }
        ]
      } : null);
    }
    setShowAssessment(false);
    setAssessment(null);
  };
  const sectionInfo = getCurrentSectionInfo();
  
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <PiSpinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!metadata || !progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full">
        <p className="text-muted-foreground mb-4">Course not found</p>
        <Button onClick={() => router.push("/learning")}>
          Back to Learning
        </Button>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full bg-background flex overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* ToC Sidebar */}
      <TocSidebar
        metadata={metadata}
        progress={progress}
        onSelectSection={handleSelectSection}
        currentSection={currentSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <PiList className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => router.push("/learning")}
              className="gap-2 hidden lg:flex"
            >
              <PiArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex-1 min-w-0">
              {sectionInfo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{sectionInfo.unit?.title}</span>
                  <PiCaretRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">{sectionInfo.chapter?.title}</span>
                </div>
              )}
            </div>
            
            {/* Streak display */}
            {progress.streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <PiFire className="h-5 w-5" />
                <span className="font-medium">{progress.streak.currentStreak}</span>
              </div>
            )}
          </div>
        </header>
        
        {/* Content area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {sectionInfo?.section && (
              <>
                <h1 className="text-2xl font-bold mb-2">{sectionInfo.section.title}</h1>
                <p className="text-muted-foreground mb-8">{sectionInfo.section.description}</p>
              </>
            )}
            
            {isLoadingContent ? (
              <SectionSkeleton />
            ) : sectionContent ? (
              <>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <SelectableContent
                    sectionId={currentSection?.sectionId}
                    onSelect={handleOpenSubChat}
                  >
                    <Markdown>{sectionContent}</Markdown>
                  </SelectableContent>
                </div>

                {/* Inline Quick Checks */}
                {quickChecks.length > 0 && (
                  <QuickCheckSection 
                    questions={quickChecks}
                    onComplete={(results) => {
                      if (results.correct === results.total && progress) {
                        // Small XP reward for completing quick check perfectly
                        setProgress(prev => prev ? {
                          ...prev,
                          xp: (prev.xp || 0) + 10
                        } : null);
                      }
                    }}
                  />
                )}
                
                {/* Assessment Panel */}
                {showAssessment && assessment ? (
                  <div className="mt-12">
                    <AssessmentPanel
                      assessment={assessment}
                      onComplete={handleAssessmentComplete}
                      onSkip={() => {
                        setShowAssessment(false);
                        setAssessment(null);
                      }}
                    />
                  </div>
                ) : (
                  /* Section Complete Button */
                  currentSection && (
                    <div className="mt-12">
                      <SectionComplete
                        sectionId={currentSection.sectionId}
                        isCompleted={progress.completedSections.includes(currentSection.sectionId)}
                        onComplete={(sectionId) => {
                          const newCompletedSections = [...progress.completedSections, sectionId];
                          setProgress(prev => prev ? {
                            ...prev,
                            completedSections: newCompletedSections,
                            xp: (prev.xp || 0) + 10
                          } : null);
                          
                          // Check if this was the last section in chapter
                          const unit = metadata?.units.find(u => u.id === currentSection.unitId);
                          const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
                          if (chapter) {
                            const allDone = chapter.sections.every(s => 
                              newCompletedSections.includes(s.id)
                            );
                            if (allDone) {
                              // Trigger assessment after short delay
                              setTimeout(() => loadAssessment(), 500);
                            }
                          }
                        }}
                        xpReward={10}
                        hasNextSection={(() => {
                          const unit = metadata?.units.find(u => u.id === currentSection.unitId);
                          const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
                          if (!chapter) return false;
                          const currentIdx = chapter.sections.findIndex(s => s.id === currentSection.sectionId);
                          return currentIdx < chapter.sections.length - 1;
                        })()}
                        onNextSection={() => {
                          if (!metadata || !currentSection) return;
                          const unit = metadata.units.find(u => u.id === currentSection.unitId);
                          const chapter = unit?.chapters.find(c => c.id === currentSection.chapterId);
                          if (!chapter) return;
                          
                          const currentIdx = chapter.sections.findIndex(s => s.id === currentSection.sectionId);
                          if (currentIdx < chapter.sections.length - 1) {
                            setCurrentSection({
                              unitId: currentSection.unitId,
                              chapterId: currentSection.chapterId,
                              sectionId: chapter.sections[currentIdx + 1].id
                            });
                          }
                        }}
                      />
                      
                      {/* Take Assessment button for completed chapters */}
                      {isChapterComplete() && !isLoadingAssessment && (
                        <Button 
                          onClick={loadAssessment}
                          className="w-full mt-4 gap-2"
                          variant="outline"
                        >
                          📝 Take Chapter Assessment (+100 XP)
                        </Button>
                      )}
                      
                      {isLoadingAssessment && (
                        <div className="mt-4 text-center text-muted-foreground">
                          <PiSpinner className="h-5 w-5 animate-spin mx-auto mb-2" />
                          <span>Generating assessment...</span>
                        </div>
                      )}
                    </div>
                  )
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PiBookOpenText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a section to start learning</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Learning Sub-Chat Sheet */}
      <SubChatSheet
        open={subChatSheetOpen}
        onOpenChange={setSubChatSheetOpen}
        subChat={activeSubChat ? {
          id: activeSubChat.id,
          conversationId: activeSubChat.sourceId,
          sourceMessageId: activeSubChat.sectionId || 'learning',
          quotedText: activeSubChat.quotedText,
          fullMessageContent: activeSubChat.sourceContent || '',
          messages: activeSubChat.messages,
          createdAt: activeSubChat.createdAt,
          updatedAt: activeSubChat.updatedAt,
        } : null}
        onSendMessage={handleSubChatSendMessage}
        isLoading={subChatLoading}
        streamingContent={subChatStreamingContent}
        searchResults={subChatSearchResults}
      />
    </div>
  );
}
