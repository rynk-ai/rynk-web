"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PiEnvelopeOpen, PiCopy, PiCheck, PiSparkle } from "react-icons/pi";
import { SubjectLineResult } from "@/lib/services/tools/email-subject";

export default function EmailSubjectPage() {
  const [emailBody, setEmailBody] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SubjectLineResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!emailBody.trim()) {
      toast.error("Please enter your email content or topic.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/email-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailBody }),
      });

      const data = await response.json() as { result?: SubjectLineResult; error?: string };

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
    toast.success("Subject line copied!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ToolLayout toolId="email-subject">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-2">
            <PiEnvelopeOpen className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
            Email Subject Line Generator
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Boost your open rates with AI-crafted subject lines that scream "Click me".
          </p>
        </div>

        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Paste your email or describe the topic</label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="e.g. A newsletter about 5 productivity tips for remote workers..."
                className="min-h-[120px] text-base resize-none"
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isProcessing || !emailBody.trim()}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
          >
            {isProcessing ? "Generating Ideas..." : "Generate Subject Lines"}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PiSparkle className="text-blue-500" /> High-Converting Options
             </h3>
             <div className="flex flex-col gap-3">
                {result.subjects.map((subject, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 hover:border-blue-500/30 transition-colors group">
                     <span className="text-foreground/90 font-medium">{subject}</span>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => handleCopy(subject, idx)}
                       className={copiedIndex === idx ? "text-green-500" : "text-muted-foreground hover:text-foreground"}
                     >
                        {copiedIndex === idx ? <PiCheck /> : <PiCopy />}
                     </Button>
                  </div>
                ))}
             </div>
          </div>
        )}

        <ConversionBanner toolName="Email Subject Generator" />
      </div>
    </ToolLayout>
  );
}
