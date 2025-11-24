"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptInputWithFiles } from "@/components/prompt-input-with-files";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
    <main className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      {/* Branding */}
      <div className="-mb-2 lg:mb-10 flex flex-col items-center ">
        <TextShimmer
          spread={7}
          duration={6}
          className="text-[200px] md:text-[200px]  font-bold tracking-tighter text-foreground/70 leading-tight"
        >
          rynk.
        </TextShimmer>
      </div>

      {/* Input Field */}
      <div className="w-full max-w-3xl lg:max-w-4xl">
        <PromptInputWithFiles
          onSubmit={handleSubmit}
          placeholder="Message..."
          className="glass relative z-10 w-full rounded-2xl md:rounded-3xl 0 p-0 shadow-lg transition-all duration-500 "
          isLoading={false}
        />
      </div>
    </main>
  );
}
