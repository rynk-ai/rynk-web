"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PiFileText, PiWarningCircle, PiCheckCircle, PiXCircle, PiLightning, PiFilePdf, PiArrowRight } from "react-icons/pi";
import { ResumeRoastResult } from "@/lib/services/tools/resume-roaster";
import { cn } from "@/lib/utils";

export default function ResumeRoasterClient() {
  const [resumeText, setResumeText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [result, setResult] = useState<ResumeRoastResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }

    setIsExtracting(true);
    try {
      const { extractText } = await import("unpdf");
      const arrayBuffer = await file.arrayBuffer();
      const { text } = await extractText(arrayBuffer, { mergePages: true });
      
      // Basic sanitization
      const cleanText = text
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();

      if (cleanText.length < 50) {
        toast.error("Could not extract enough text. Is this a scanned PDF?");
      } else {
        setResumeText(cleanText.slice(0, 12000)); // Max 12k chars
        toast.success("PDF analyzed. Text extracted.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse PDF.");
    } finally {
      setIsExtracting(false);
      // Reset input
      if (fileName) e.target.value = ''; 
    }
  };

  const clearFile = () => {
    setResumeText("");
    setFileName(null);
    setResult(null);
  };

  const handleRoast = async () => {
    if (resumeText.length < 100) {
      toast.error("Please paste more content (at least 100 characters).");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/resume-roaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });

      const data = await response.json() as { result?: ResumeRoastResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily roast limit reached.");
        } else {
          toast.error(data.error || "Roast failed");
        }
        return;
      }

      setResult(data.result || null);
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const verdictColors: Record<string, string> = {
    "Hired": "text-green-600 bg-green-500/10 border-green-500/30",
    "Maybe": "text-amber-600 bg-amber-500/10 border-amber-500/30",
    "Pass": "text-red-600 bg-red-500/10 border-red-500/30",
  };

  return (
    <ToolLayout toolId="resume-roaster">
      <div className="flex flex-col gap-12 max-w-4xl mx-auto w-full px-4">
        {/* Minimal Header */}
        <div className="space-y-4 pt-8 pb-4 border-b">
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-3">
            <PiFileText className="h-8 w-8 text-violet-600" />
            Resume Roaster
          </h1>
          <p className="text-muted-foreground font-light max-w-xl">
            A brutal, 6-second screening by an AI FAANG recruiter. Warning: Not for the sensitive.
          </p>
        </div>

        {/* Input Area */}
        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="space-y-6">
             {/* PDF Upload Button */}
             {!result && (
                 <div className="relative group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isExtracting || isProcessing}
                    />
                    <div className="flex items-center justify-between p-6 bg-card border-2 border-dashed border-muted hover:border-violet-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-muted rounded-full">
                                <PiFilePdf className="w-6 h-6 text-foreground" />
                            </div>
                            <div className="space-y-1">
                                <span className="block font-medium text-foreground">
                                    {isExtracting ? "Extracting Text..." : "Upload PDF Resume"}
                                </span>
                                <span className="block text-xs text-muted-foreground font-mono">
                                    Max 5MB • Text extraction happens locally
                                </span>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                            <span className="text-xs">⌘</span>
                            <span>O</span>
                        </div>
                    </div>
                 </div>
             )}

             <div className="relative">
               {!fileName ? (
                 !result && (
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs uppercase tracking-widest text-muted-foreground font-bold">
                            <span>Or paste extraction</span>
                            <span>{resumeText.length}/12000</span>
                        </div>
                        <Textarea 
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="PASTE TEXT CONTENT HERE..."
                            className="min-h-[300px] font-mono text-sm leading-relaxed p-6 bg-muted/20 border-muted focus:border-violet-500 rounded-none resize-y"
                            disabled={isProcessing}
                        />
                     </div>
                 )
               ) : (
                 <div className="bg-card border rounded-none p-6 flex flex-row items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-500/10 rounded-full">
                            <PiCheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground font-mono text-lg">{fileName}</p>
                            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{resumeText.length.toLocaleString()} chars analyzed</p>
                        </div>
                    </div>
                    {!result && (
                        <Button variant="ghost" size="sm" onClick={clearFile} disabled={isProcessing} className="text-muted-foreground hover:text-destructive">
                            Change
                        </Button>
                    )}
                 </div>
               )}
               
               {!result && (
                   <Button 
                    onClick={handleRoast} 
                    disabled={isProcessing || resumeText.length < 100}
                    className="w-full h-14 mt-6 text-lg font-bold bg-foreground text-background hover:bg-zinc-800 rounded-none shadow-sm transition-all font-mono tracking-tight"
                >
                    {isProcessing ? "ANALYZING..." : "ROAST IT"}
                    {!isProcessing && <PiArrowRight className="ml-2 w-5 h-5" />}
                </Button>
               )}
           </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12 pb-12">
                
                {/* 1. The Verdict - Industrial Ticket Style */}
                <div className="border-y-2 border-foreground/10 py-8 flex flex-col md:flex-row items-baseline justify-between gap-6">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-2">Verdict</span>
                        <div className={cn(
                            "text-6xl font-black tracking-tighter uppercase",
                            result.verdict === "Hired" ? "text-green-600" :
                            result.verdict === "Pass" ? "text-red-600" : "text-amber-600"
                        )}>
                            {result.verdict}
                        </div>
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-2">Score</span>
                        <span className={cn(
                            "text-8xl font-mono font-bold leading-none tracking-tighter",
                            result.score > 75 ? "text-foreground" : (result.score > 50 ? "text-foreground/80" : "text-foreground/60")
                        )}>
                            {result.score}
                            <span className="text-2xl text-muted-foreground align-top ml-1">/100</span>
                        </span>
                    </div>
                </div>

                {/* 2. Brutal Truth - Terminal Style */}
                <div className="bg-zinc-950 text-zinc-50 p-8 shadow-2xl relative overflow-hidden group">
                    <p className="text-lg md:text-xl font-mono leading-relaxed text-zinc-300 border-l-2 border-zinc-800 pl-6">
                        "{result.brutalTruth}"
                    </p>
                </div>

                {/* 3. Red Flags & Fixes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Red Flags */}
                    {result.redFlags.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-red-600 flex items-center gap-2 border-b pb-2 border-red-200 dark:border-red-900/30">
                                <PiWarningCircle className="w-5 h-5" /> Fatal Flaws
                            </h3>
                            <ul className="space-y-3">
                                {result.redFlags.map((flag, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-foreground/80 group">
                                        <span className="text-red-500 font-mono mt-0.5 select-none">0{idx + 1}</span>
                                        <span className="group-hover:text-red-600 transition-colors">{flag}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actionable Fixes */}
                    {result.fixes.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2 border-b pb-2 border-violet-200 dark:border-violet-900/30">
                                <PiLightning className="w-5 h-5" /> Quick Fixes
                            </h3>
                            <div className="space-y-4">
                                {result.fixes.map((fix, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                                                {fix.section}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground">{fix.issue}</p>
                                        <p className="text-sm text-muted-foreground flex items-baseline gap-2 pl-2 border-l-2 border-green-500/30">
                                            <span className="text-green-600 font-mono text-xs">Correction &gt;</span> 
                                            {fix.fix}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-8">
                    <Button variant="outline" onClick={clearFile} className="font-mono text-xs uppercase tracking-widest">
                        Run Another Analysis
                    </Button>
                </div>

                <ConversionBanner toolName="Resume Roaster" />
              </div>
            )}
          </div>
        </div>

      </div>
    </ToolLayout>
  );
}
