"use client";

import { useState, useEffect } from "react";
import { 
  PiSparkle, 
  PiChatCircle, 
  PiBrain, 
  PiArrowRight, 
  PiX,
  PiBookOpen,
  PiScales,
  PiTarget,
  PiMagnifyingGlass
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_STORAGE_KEY = "rynk_onboarding_complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
  examples?: { icon: React.ReactNode; label: string }[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "surfaces",
    title: "Choose Your Format",
    description: "Get answers in 10+ formats. Not just text — but quizzes, courses, comparisons, timelines, and more.",
    icon: <PiSparkle className="h-8 w-8" />,
    examples: [
      { icon: <PiBookOpen className="h-4 w-4" />, label: "Courses" },
      { icon: <PiScales className="h-4 w-4" />, label: "Compare" },
      { icon: <PiTarget className="h-4 w-4" />, label: "Quiz" },
      { icon: <PiMagnifyingGlass className="h-4 w-4" />, label: "Research" },
    ]
  },
  {
    id: "memory",
    title: "Build Your Knowledge Base",
    description: "Reference past conversations, attach files, and add folders. Your AI remembers context across sessions.",
    icon: <PiBrain className="h-8 w-8" />,
    highlight: "Click [+] to add context from files or previous chats"
  },
  {
    id: "subchats",
    title: "Deep Dive Anywhere",
    description: "Select any text in a response to start a focused sub-conversation. Explore tangents without losing your main thread.",
    icon: <PiChatCircle className="h-8 w-8" />,
    highlight: "Select text → Click \"Start sub-chat\" to explore deeper"
  }
];

interface OnboardingTourProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function OnboardingTour({ onComplete, forceShow }: OnboardingTourProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    // Check if onboarding was already completed
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);
  
  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleSkip = () => {
    handleComplete();
  };
  
  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };
  
  if (!isVisible) return null;
  
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors z-10"
          aria-label="Skip onboarding"
        >
          <PiX className="h-5 w-5" />
        </button>
        
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentStep 
                  ? "w-8 bg-primary" 
                  : idx < currentStep 
                    ? "w-3 bg-primary/50" 
                    : "w-3 bg-muted"
              )}
            />
          ))}
        </div>
        
        {/* Content */}
        <div key={step.id} className="p-8 pt-4 animate-in slide-in-from-right-4 duration-300">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              {step.icon}
            </div>
          </div>
          
          {/* Title & Description */}
          <h2 className="text-xl font-bold text-center mb-3">{step.title}</h2>
          <p className="text-muted-foreground text-center text-sm leading-relaxed mb-6">
            {step.description}
          </p>
          
          {/* Examples (for surfaces step) */}
          {step.examples && (
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              {step.examples.map((example, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm"
                >
                  {example.icon}
                  <span>{example.label}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Highlight tip */}
          {step.highlight && (
            <div className="text-xs text-center text-muted-foreground bg-secondary/50 rounded-lg px-4 py-2.5 mb-6">
              💡 {step.highlight}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            
            <Button onClick={handleNext} className="gap-2">
              {isLastStep ? "Get Started" : "Next"}
              <PiArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check if onboarding is complete
export function useOnboardingComplete() {
  const [isComplete, setIsComplete] = useState(true); // Default true to avoid flash
  
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    setIsComplete(!!completed);
  }, []);
  
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setIsComplete(false);
  };
  
  return { isComplete, resetOnboarding };
}
