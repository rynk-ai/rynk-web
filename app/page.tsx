"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
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
    <main className="relative flex min-h-screen w-full overflow-hidden">
      {/* Background layer with inner rounded corners */}
      {/* Background layer */}
      <div className="absolute inset-0 bg-background" />
      
      
      {/* Auth Button - Prominent and Clear */}
      {isAuthenticated !== null && (
        <button
          onClick={() => router.push(isAuthenticated ? "/chat" : "/login")}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-muted/80 transition-all duration-200 border border-border/50 hover:border-border bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md group"
        >
          <span className="text-sm font-medium text-foreground">
            {isAuthenticated ? "Go to Chat" : "Sign In"}
          </span>
          {isAuthenticated ? (
            <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <LogIn className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
      )}
      
      {/* Content layer */}
      <div 
        className="relative z-10 flex h-screen w-full flex-col items-center justify-center px-4 bg-muted transition-transform duration-200 ease-out"
        style={{ transform: `translateY(-${keyboardHeight / 2}px)` }}
      >
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center">
          <TextShimmer
            spread={3}
            duration={4}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-4"
          >
            rynk.
          </TextShimmer>
        </div>

        {/* Input Field */}
        <div className="w-full max-w-2xl lg:max-w-3xl flex flex-col items-center gap-3">
          <PromptInputWithFiles
            onSubmit={handleSubmit}
            placeholder="Message..."
            className="glass relative z-10 w-full rounded-3xl shadow-lg transition-all duration-500"
            isLoading={false}
            hideActions={true}
          />
          
          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 px-4">
            {[
              "Explain quantum computing",
              "Write a poem about AI",
              "Help me debug my code",
              "Plan a weekend trip"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSubmit(suggestion, [])}
                className="px-3 py-1.5 text-xs rounded-full border border-border/50 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
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
