"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  GraduationCap, 
  ArrowLeft,
  ArrowRight,
  Clock,
  Users,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
  Code,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubjectInterpretation } from "@/lib/services/domain-types";

// Prompt analysis type
interface PromptAnalysis {
  domain: string;
  recommendedApproach: 'reading' | 'hands-on' | 'hybrid';
  modalityMix: { reading: number; practice: number };
  suggestedDuration: string;
  requiresProjects: boolean;
  practiceTypes: string[];
  reasoning: string;
}

/**
 * New Course Page - Interpretation Selection
 * 
 * User selects from 5 subject interpretations before generating ToC.
 */

// Approach icons and colors
const approachConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  conceptual: { icon: <BookOpen className="h-5 w-5" />, color: "text-blue-500", label: "Conceptual" },
  practical: { icon: <Sparkles className="h-5 w-5" />, color: "text-green-500", label: "Practical" },
  theoretical: { icon: <BookOpen className="h-5 w-5" />, color: "text-purple-500", label: "Theoretical" },
  applied: { icon: <Sparkles className="h-5 w-5" />, color: "text-emerald-500", label: "Applied" },
  historical: { icon: <Clock className="h-5 w-5" />, color: "text-amber-500", label: "Historical" },
};

function InterpretationCard({
  interpretation,
  isSelected,
  onClick
}: {
  interpretation: SubjectInterpretation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const approach = approachConfig[interpretation.approach] || approachConfig.conceptual;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-xl border-2 transition-all duration-200",
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-border/40 hover:border-primary/30 hover:bg-secondary/30"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
          isSelected ? "bg-primary/10" : "bg-secondary"
        )}>
          <span className={approach.color}>{approach.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg line-clamp-1">{interpretation.title}</h3>
            {isSelected && (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {interpretation.description}
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className={cn("px-2 py-1 rounded-full bg-secondary", approach.color)}>
              {approach.label}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
              <Clock className="h-3 w-3" />
              {interpretation.estimatedDuration}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
              <Users className="h-3 w-3" />
              {interpretation.targetAudience?.split(' ').slice(0, 3).join(' ')}...
            </span>
          </div>
          
          {interpretation.keyTopics && interpretation.keyTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {interpretation.keyTopics.slice(0, 4).map((topic, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-secondary/50 rounded-md"
                >
                  {topic}
                </span>
              ))}
              {interpretation.keyTopics.length > 4 && (
                <span className="px-2 py-0.5 text-xs text-muted-foreground">
                  +{interpretation.keyTopics.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function NewCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [interpretations, setInterpretations] = useState<SubjectInterpretation[]>([]);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  
  // Parse interpretations from URL
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    const interpretationsParam = searchParams.get("interpretations");
    
    if (promptParam) {
      setPrompt(promptParam);
    }
    
    if (interpretationsParam) {
      try {
        const parsed = JSON.parse(interpretationsParam) as SubjectInterpretation[];
        setInterpretations(parsed);
      } catch (e) {
        console.error("Failed to parse interpretations:", e);
      }
    }
    
    // Parse analysis
    const analysisParam = searchParams.get("analysis");
    if (analysisParam) {
      try {
        const parsed = JSON.parse(analysisParam) as PromptAnalysis;
        setAnalysis(parsed);
      } catch (e) {
        console.error("Failed to parse analysis:", e);
      }
    }
  }, [searchParams]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/learning");
    }
  }, [status, router]);
  
  // Handle continue to course generation
  const handleContinue = async () => {
    if (!selectedId) return;
    
    const selected = interpretations.find(i => i.id === selectedId);
    if (!selected) return;
    
    setIsGenerating(true);
    
    try {
      // Call ToC generation API (enhanced v1)
      const response = await fetch("/api/learning/generate-toc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          interpretation: selected
        })
      });
      
      if (response.ok) {
        const data = await response.json() as { courseId?: string };
        if (data.courseId) {
          router.push(`/learning/${data.courseId}`);
        }
      } else {
        const error = await response.json();
        console.error("Failed to generate course:", error);
      }
    } catch (error) {
      console.error("Error generating course:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (status === "loading" || interpretations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/learning")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium">New Course</span>
          </div>
          
          <Button
            onClick={handleContinue}
            disabled={!selectedId || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Choose Your Learning Path</h1>
          <p className="text-muted-foreground">
            Select the approach that best matches how you want to learn{" "}
            <span className="font-medium text-foreground">&ldquo;{prompt}&rdquo;</span>
          </p>
          
          {/* Analysis Badge */}
          {analysis && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/40">
              {analysis.recommendedApproach === 'hands-on' ? (
                <>
                  <Code className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">Hands-on recommended</span>
                    <span className="text-muted-foreground"> · {analysis.modalityMix.practice}% practice</span>
                  </span>
                </>
              ) : analysis.recommendedApproach === 'reading' ? (
                <>
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Reading-focused</span>
                    <span className="text-muted-foreground"> · {analysis.modalityMix.reading}% content</span>
                  </span>
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Hybrid approach</span>
                    <span className="text-muted-foreground"> · {analysis.modalityMix.reading}% reading, {analysis.modalityMix.practice}% practice</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {interpretations.map((interpretation) => (
            <InterpretationCard
              key={interpretation.id}
              interpretation={interpretation}
              isSelected={selectedId === interpretation.id}
              onClick={() => setSelectedId(interpretation.id)}
            />
          ))}
        </div>
        
        {selectedId && (
          <div className="mt-8 text-center">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Course Structure...
                </>
              ) : (
                <>
                  Generate Course
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll create a detailed table of contents with academic sources
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewCoursePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <NewCourseContent />
    </Suspense>
  );
}
