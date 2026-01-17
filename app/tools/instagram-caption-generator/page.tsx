"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PiInstagramLogo, PiCopy, PiCheck, PiCamera, PiSparkle } from "react-icons/pi";
import { CaptionVibe, InstagramCaptionResult } from "@/lib/services/tools/instagram-caption";

export default function InstagramCaptionPage() {
  const [context, setContext] = useState("");
  const [vibe, setVibe] = useState<CaptionVibe>("funny");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<InstagramCaptionResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast.error("Please describe your photo or post.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/instagram-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, vibe }),
      });

      const data = await response.json() as { result?: InstagramCaptionResult; error?: string };

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

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Caption copied!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ToolLayout toolId="instagram-caption">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-fuchsia-500/10 rounded-full mb-2">
            <PiInstagramLogo className="h-8 w-8 text-fuchsia-600" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
            Instagram Caption Generator
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Get more engagement with the perfect caption. AI-generated, hashtag-ready.
          </p>
        </div>

        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">What&apos;s your photo about?</label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. A peaceful sunset at the beach with coffee."
                className="min-h-[100px] text-base resize-none"
              />
            </div>
            
            <div>
               <label className="text-sm font-medium mb-1.5 block">Vibe</label>
               <Select value={vibe} onValueChange={(v: any) => setVibe(v)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funny">Funny & Witty</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="question">Question / Engaging</SelectItem>
                  </SelectContent>
               </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isProcessing || !context.trim()}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
          >
            {isProcessing ? "Generating Captions..." : "Generate Captions"}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PiSparkle className="text-fuchsia-500" /> Generated Options
             </h3>
             <div className="grid grid-cols-1 gap-4">
                {result.captions.map((caption, idx) => (
                  <div key={idx} className="bg-card border border-border rounded-xl p-4 hover:border-fuchsia-500/30 transition-colors group">
                     <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{caption}</p>
                     <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCopy(caption, idx)}
                          className={copiedIndex === idx ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-foreground"}
                        >
                           {copiedIndex === idx ? <PiCheck className="mr-2" /> : <PiCopy className="mr-2" />}
                           {copiedIndex === idx ? "Copied" : "Copy"}
                        </Button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        <ConversionBanner toolName="Instagram Caption Generator" />
      </div>
    </ToolLayout>
  );
}
