"use client";

import { useState, useMemo } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { PiTextAUnderline, PiCopy, PiCheck } from "react-icons/pi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CaseType = 'lower' | 'upper' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab';

const CASES: { id: CaseType; label: string; example: string }[] = [
  { id: 'lower', label: 'lowercase', example: 'hello world' },
  { id: 'upper', label: 'UPPERCASE', example: 'HELLO WORLD' },
  { id: 'title', label: 'Title Case', example: 'Hello World' },
  { id: 'sentence', label: 'Sentence case', example: 'Hello world' },
  { id: 'camel', label: 'camelCase', example: 'helloWorld' },
  { id: 'pascal', label: 'PascalCase', example: 'HelloWorld' },
  { id: 'snake', label: 'snake_case', example: 'hello_world' },
  { id: 'kebab', label: 'kebab-case', example: 'hello-world' },
];

function convertCase(text: string, caseType: CaseType): string {
  const words = text.trim().split(/[\s_-]+/).filter(Boolean);
  
  switch (caseType) {
    case 'lower':
      return text.toLowerCase();
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'camel':
      return words.map((w, i) => 
        i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join('');
    case 'pascal':
      return words.map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join('');
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_');
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-');
    default:
      return text;
  }
}

export default function CaseConverterClient() {
  const [text, setText] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseType>('lower');
  const [copied, setCopied] = useState(false);

  const convertedText = useMemo(() => {
    return text ? convertCase(text, selectedCase) : '';
  }, [text, selectedCase]);

  const handleCopy = () => {
    if (convertedText) {
      navigator.clipboard.writeText(convertedText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ToolLayout toolId="case-converter">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-pink-500/10 rounded-full mb-2">
            <PiTextAUnderline className="h-8 w-8 text-pink-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Case Converter
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Convert text between different cases instantly.
          </p>
        </div>

        {/* Case Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCase(c.id)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-0.5",
                selectedCase === c.id
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                  : "bg-card border border-border hover:border-pink-500/50 text-foreground/70 hover:text-foreground"
              )}
            >
              <span>{c.label}</span>
              <span className="text-[10px] opacity-70">{c.example}</span>
            </button>
          ))}
        </div>

        {/* Input/Output Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
              <span className="text-sm font-medium text-muted-foreground">
                Original Text
              </span>
              <span className="text-xs text-muted-foreground">
                {text.length} chars
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste text to convert..."
              className="w-full min-h-[200px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
            />
          </div>

          {/* Output */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
              <span className="text-sm font-medium text-muted-foreground">
                Converted ({CASES.find(c => c.id === selectedCase)?.label})
              </span>
              <button
                onClick={handleCopy}
                disabled={!convertedText}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {copied ? <PiCheck className="h-3.5 w-3.5" /> : <PiCopy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="w-full min-h-[200px] px-4 py-3">
              {convertedText ? (
                <p className="text-foreground leading-relaxed whitespace-pre-wrap break-all">
                  {convertedText}
                </p>
              ) : (
                <p className="text-muted-foreground/50 italic">
                  Converted text will appear here...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
