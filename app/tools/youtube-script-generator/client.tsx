"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PiYoutubeLogo, PiCopy, PiCheck, PiVideoCamera, PiTimer } from "react-icons/pi";
import { ScriptDuration, YouTubeScriptResult, ScriptTone } from "@/lib/services/tools/youtube-script";

export default function YouTubeScriptClient() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ScriptTone>("engaging");
  const [duration, setDuration] = useState<ScriptDuration>("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<YouTubeScriptResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a video topic.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/youtube-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, duration }),
      });

      const data = await response.json() as { result?: YouTubeScriptResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily limit reached. Sign up for more.");
        } else {
          toast.error(data.error || "Generation failed");
        }
        return;
      }

      setResult(data.result || null);
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.script) {
      navigator.clipboard.writeText(result.script);
      setCopied(true);
      toast.success("Script copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ToolLayout toolId="youtube-script">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-2">
            <PiYoutubeLogo className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold">YouTube Script Generator</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Create viral video scripts with ease. Generate hooks, intros, and content outlines in seconds.
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Video Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to learn coding in 2024"
                className="h-12 text-lg"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                 <label className="text-sm font-medium mb-1.5 block">Tone</label>
                 <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engaging">Engaging</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="funny">Funny</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div>
                 <label className="text-sm font-medium mb-1.5 block">Target Duration</label>
                 <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (Under 60s)</SelectItem>
                      <SelectItem value="medium">Medium (3-5 min)</SelectItem>
                      <SelectItem value="long">Long (8-10 min)</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isProcessing || !topic.trim()}
            className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            {isProcessing ? "Generating Script..." : "Generate Script"}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
             <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                   <PiTimer className="w-4 h-4" /> Est. Duration: {result.estimatedDuration}
                </span>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
                   {copied ? <PiCheck /> : <PiCopy />}
                   {copied ? "Copied" : "Copy Script"}
                </Button>
             </div>

             <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                 <div className="p-5 bg-secondary/10">
                    <h3 className="font-bold text-red-500 text-sm uppercase tracking-wide mb-2">The Hook</h3>
                    <p className="text-lg font-medium leading-relaxed">{result.sections.hook}</p>
                 </div>
                 <div className="p-5">
                    <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wide mb-2">Intro</h3>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.sections.intro}</p>
                 </div>
                 <div className="p-5">
                    <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wide mb-2">Body Content</h3>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.sections.body}</p>
                 </div>
                 <div className="p-5 bg-primary/5">
                    <h3 className="font-bold text-primary text-xs uppercase tracking-wide mb-2">Outro / CTA</h3>
                    <p className="text-foreground/90 leading-relaxed font-medium">{result.sections.outro}</p>
                 </div>
             </div>
          </div>
        )}

        <ConversionBanner toolName="YouTube Script Generator" />
      </div>
    </ToolLayout>
  );
}
