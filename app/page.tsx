"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import { useKeyboardAwarePosition } from "@/lib/hooks/use-keyboard-aware-position";
import { LogIn, MessageSquare } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const keyboardHeight = useKeyboardAwarePosition();

  useEffect(() => {
    // Check if user is authenticated
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/session");
        const session = (await response.json()) as { user?: unknown };
        setIsAuthenticated(!!session?.user);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const handleSubmit = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    console.log('[HomePage] Submitting query:', text);

    // Store the query and files info in localStorage
    localStorage.setItem("pendingChatQuery", text);
    console.log('[HomePage] Stored in localStorage:', localStorage.getItem('pendingChatQuery'));
    
    // Store file references (we'll handle actual files on chat page)
    if (files.length > 0) {
      // Note: Can't store File objects directly in localStorage
      // We'll just store the count for now, files will need to be re-uploaded
      localStorage.setItem("pendingChatFilesCount", files.length.toString());
    }

    // Redirect based on auth status
    if (isAuthenticated) {
      console.log('[HomePage] Redirecting to /chat (authenticated)');
      router.push("/chat");
    } else {
      console.log('[HomePage] Redirecting to /login (not authenticated)');
      router.push("/login");
    }
  };

  return (
    <main className="relative flex min-h-screen w-full overflow-hidden bg-background selection:bg-primary/10 selection:text-primary">
      {/* Background layer with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Auth Button - Prominent and Clear */}
      {isAuthenticated !== null && (
        <button
          onClick={() => router.push(isAuthenticated ? "/chat" : "/login")}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-muted/50 transition-all duration-200 border border-border/40 hover:border-border/80 bg-background/50 backdrop-blur-md shadow-sm hover:shadow-md group animate-in-down"
        >
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {isAuthenticated ? "Go to Chat" : "Sign In"}
          </span>
          {isAuthenticated ? (
            <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <LogIn className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
      )}
      
      {/* Theme Toggle - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-20 hidden md:block animate-in-up">
        <ThemeToggle />
      </div>

      {/* Content layer */}
      <div 
        className="relative z-10 flex h-screen w-full flex-col items-center justify-center px-4 transition-transform duration-200 ease-out"
        style={{ transform: `translateY(-${keyboardHeight / 2}px)` }}
      >
        {/* Branding */}
        <div className="mb-10 flex flex-col items-center animate-in-up" style={{ animationDelay: '0.1s' }}>
          <TextShimmer
            spread={3}
            duration={4}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-4"
          >
            rynk.
          </TextShimmer>
          <p className="text-muted-foreground text-sm md:text-base max-w-md text-center opacity-0 animate-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            Chat with AI that remembers and adapts.
          </p>
        </div>

        {/* Input Field */}
        <div className="w-full max-w-2xl lg:max-w-3xl flex flex-col items-center gap-6 opacity-0 animate-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          <div className="w-full glass rounded-3xl p-1.5 shadow-xl shadow-black/5 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-black/10">
            <PromptInputWithFiles
              onSubmit={handleSubmit}
              placeholder="Ask anything..."
              className="w-full bg-transparent border-none shadow-none focus-within:ring-0"
              isLoading={false}
              hideActions={true}
            />
          </div>
          
          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 px-4">
            {[
              "Explain quantum computing",
              "Write a poem about AI",
              "Help me debug my code",
              "Plan a weekend trip"
            ].map((suggestion, i) => (
              <button
                key={suggestion}
                onClick={() => handleSubmit(suggestion, [])}
                className="px-4 py-2 text-xs md:text-sm rounded-full border border-border/40 bg-background/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 hover:border-border/80"
                style={{ animationDelay: `${0.4 + (i * 0.05)}s` }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
