"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  PiSparkle, 
  PiCopy, 
  PiCheck, 
  PiUploadSimple, 
  PiFileText,
  PiX,
  PiArrowRight,
  PiWarning,
  PiInfinity
} from "react-icons/pi";
import Link from "next/link";

export default function HumanizerPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining?: number;
    resetAt?: string;
    unlimited?: boolean;
  } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRateLimitInfo();
  }, []);

  useEffect(() => {
    if (outputRef.current && isProcessing) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText, isProcessing]);

  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch("/api/humanizer");
      if (response.ok) {
        const data = await response.json() as { remaining?: number; resetAt?: string; unlimited?: boolean };
        setRateLimitInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch rate limit info:", error);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setInputText(text);
      setUploadedFile(file);
      toast.success(`Loaded ${file.name}`);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      toast.info("PDF support coming soon! Please paste text directly for now.");
    } else {
      toast.error("Unsupported file type. Please use .txt files.");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearFile = useCallback(() => {
    setUploadedFile(null);
    setInputText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleHumanize = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to humanize");
      return;
    }

    setIsProcessing(true);
    setOutputText("");
    setProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/humanizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string; error?: string; resetAt?: string };
        if (response.status === 429) {
          toast.error(errorData.message || "Rate limit exceeded");
          setRateLimitInfo({
            remaining: 0,
            resetAt: errorData.resetAt || new Date().toISOString(),
          });
        } else {
          toast.error(errorData.error || "Failed to humanize text");
        }
        setIsProcessing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "meta") {
              if (data.unlimited) {
                setRateLimitInfo({ unlimited: true });
              } else {
                setRateLimitInfo({
                  remaining: data.remaining,
                  resetAt: data.resetAt,
                });
              }
            } else if (data.type === "progress") {
              setCurrentChunk(data.chunkIndex + 1);
              setTotalChunks(data.totalChunks);
              setProgress(((data.chunkIndex + 1) / data.totalChunks) * 100);
            } else if (data.type === "chunk") {
              setOutputText((prev) => prev + data.data);
            } else if (data.type === "error") {
              toast.error(data.message);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      setProgress(100);
      toast.success("Humanization complete!");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error(error.message || "Failed to humanize text");
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    toast.info("Humanization cancelled");
  };

  const formatResetTime = (resetAt: string) => {
    const reset = new Date(resetAt);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    
    if (diffMins <= 0) return "now";
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.ceil(diffMins / 60)} hr`;
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const outputWordCount = outputText.trim() ? outputText.trim().split(/\s+/).length : 0;
  const isUnlimited = rateLimitInfo?.unlimited;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full">
      {/* Header */}
      <header className=" bg-background sticky top-0 z-50 w-full max-w-7xl mx-auto">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-tight">rynk</span>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-muted-foreground font-normal hidden sm:inline">humanizer</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {rateLimitInfo && (
              isUnlimited ? (
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-accent">
                  <PiInfinity className="h-4 w-4" />
                  <span className="hidden sm:inline">Unlimited</span>
                </span>
              ) : (
                <span className={cn(
                  "text-xs sm:text-sm",
                  rateLimitInfo.remaining === 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {rateLimitInfo.remaining === 0 
                    ? `Resets ${formatResetTime(rateLimitInfo.resetAt || "")}`
                    : `${rateLimitInfo.remaining} left`
                  }
                </span>
              )
            )}
            {!isUnlimited && (
              <Link href="/login?callbackUrl=/humanizer">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-3 sm:px-4 py-4 sm:py-6 w-full max-w-7xl mx-auto">
        {/* Hero - Compact on mobile */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
            AI Humanizer
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Transform AI-generated text into natural, human-written content
          </p>
        </div>

        {/* Editor - Full width, stacks on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {/* Input Panel */}
          <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2 text-sm">
                <PiFileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Original</span>
              </div>
              {uploadedFile && (
                <button
                  onClick={clearFile}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="max-w-[100px] truncate">{uploadedFile.name}</span>
                  <PiX className="h-3 w-3 flex-shrink-0" />
                </button>
              )}
            </div>

            {/* Text Area with Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className="relative flex-1"
            >
              {isDragOver && (
                <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent m-2 rounded-lg flex items-center justify-center z-10">
                  <div className="text-center">
                    <PiUploadSimple className="h-6 w-6 text-accent mx-auto mb-1" />
                    <span className="text-sm text-accent font-medium">Drop file here</span>
                  </div>
                </div>
              )}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your AI-generated text here..."
                className="w-full h-48 sm:h-64 lg:h-72 bg-transparent px-3 sm:px-4 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-sm leading-relaxed"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t border-border bg-secondary/30 gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-muted-foreground">{wordCount} words</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                >
                  <PiUploadSimple className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </div>
              <Button
                onClick={isProcessing ? handleCancel : handleHumanize}
                disabled={!inputText.trim() || (!isUnlimited && rateLimitInfo?.remaining === 0 && !isProcessing)}
                size="sm"
                className="gap-1.5 min-h-[36px] px-4"
              >
                {isProcessing ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <PiSparkle className="h-3.5 w-3.5" />
                    <span>Humanize</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2 text-sm">
                <PiSparkle className="h-4 w-4 text-accent" />
                <span className="font-medium">Humanized</span>
              </div>
              {outputText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                >
                  {copied ? (
                    <>
                      <PiCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                      <span className="text-green-600 dark:text-green-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <PiCopy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress */}
            {isProcessing && totalChunks > 0 && (
              <div className="px-3 sm:px-4 py-2 border-b border-border bg-secondary/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Chunk {currentChunk}/{totalChunks}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div 
              ref={outputRef}
              className="px-3 sm:px-4 py-3 overflow-y-auto h-48 sm:h-64 lg:h-72"
            >
              {outputText ? (
                <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {outputText}
                  {isProcessing && (
                    <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
                  )}
                </div>
              ) : isProcessing ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="h-4 w-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                    <span>Humanizing...</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm text-center px-4">
                    Humanized text will appear here
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            {outputText && (
              <div className="px-3 sm:px-4 py-2.5 border-t border-border bg-secondary/30">
                <span className="text-xs text-muted-foreground">{outputWordCount} words</span>
              </div>
            )}
          </div>
        </div>

        {/* Rate Limit Warning - only show for unauthenticated users */}
        {!isUnlimited && rateLimitInfo?.remaining === 0 && (
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border bg-secondary/30 mb-6">
            <PiWarning className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground">
                You&apos;ve used all 30 free requests. 
              </p>
              <p className="text-muted-foreground mt-0.5">
                <Link href="/login?callbackUrl=/humanizer" className="text-accent hover:underline">
                  Sign in for unlimited
                </Link>
                {" "}or wait {formatResetTime(rateLimitInfo.resetAt || "")}.
              </p>
            </div>
          </div>
        )}

        {/* Features - Horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0">
          {[
            { icon: PiSparkle, title: "Natural Writing", desc: "Removes robotic patterns" },
            { icon: PiFileText, title: "Preserves Facts", desc: "Meaning stays intact" },
            { icon: PiArrowRight, title: "Real-time", desc: "Streams as it processes" },
          ].map((feature, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-auto p-3 sm:p-4 rounded-lg border border-border">
              <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mb-1.5 sm:mb-2" />
              <h3 className="font-medium text-xs sm:text-sm mb-0.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto mt-auto">
        <div className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <span>{isUnlimited ? "Unlimited access" : "30 free / 2 hours"}</span>
          {!isUnlimited && (
            <Link href="/login?callbackUrl=/humanizer" className="text-accent hover:underline">
              Unlimited →
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
