"use client";

import { useState, useCallback } from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PiGitBranch, PiCode, PiCpu } from "react-icons/pi";
import { RepoAnalysisResult } from "@/lib/services/tools/repo-visualizer";

export default function RepoVisualizerClient() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysisResult | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handleVisualize = async () => {
    if (!repoUrl.includes("github.com")) {
      toast.error("Please enter a valid GitHub URL");
      return;
    }

    setIsProcessing(true);
    setAnalysis(null);

    try {
      const response = await fetch("/api/tools/repo-visualizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json() as { result?: RepoAnalysisResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily limit reached.");
        } else {
          toast.error(data.error || "Visualization failed");
        }
        return;
      }

      const result = data.result;
      if (result) {
        setAnalysis(result);
        setNodes(result.nodes);
        setEdges(result.edges);
        toast.success("Repository visualized!");
      }
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout toolId="repo-visualizer">
      <div className="flex flex-col gap-6 h-[calc(100vh-140px)] max-h-[800px] max-w-7xl mx-auto w-full">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-2xl">
            <PiGitBranch className="text-muted-foreground w-5 h-5 shrink-0" />
            <Input 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="e.g. https://github.com/vercel/next.js"
              className="font-mono text-sm"
              disabled={isProcessing}
            />
          </div>
          <Button 
            onClick={handleVisualize} 
            disabled={isProcessing || !repoUrl}
            className="w-full sm:w-auto"
          >
            {isProcessing ? "Analyzing..." : "Visualize Architecture"}
          </Button>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* Graph Area */}
          <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-900 border rounded-xl overflow-hidden relative shadow-inner">
             {nodes.length > 0 ? (
               <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  className="bg-zinc-50 dark:bg-zinc-950"
                  attributionPosition="bottom-right"
               >
                 <Background gap={16} size={1} />
                 <Controls />
               </ReactFlow>
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                 <PiCode className="w-16 h-16 mb-4" />
                 <p>Enter a public GitHub URL to map its structure.</p>
               </div>
             )}
          </div>

          {/* Analysis Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1">
             {analysis ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                 
                 {/* Tech Stack Card */}
                 <div className="bg-card border rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <PiCode /> Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                       {analysis.techStack.length > 0 ? analysis.techStack.map((tech, i) => (
                         <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs font-mono font-medium rounded">
                           {tech}
                         </span>
                       )) : (
                         <span className="text-sm text-muted">No stack detected.</span>
                       )}
                    </div>
                 </div>

                 {/* Architecture Summary Card */}
                 <div className="bg-card border rounded-xl p-5 shadow-sm flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <PiCpu /> Architecture
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground font-sans">
                      {analysis.summary}
                    </p>
                 </div>

                 <ConversionBanner toolName="GitHub Visualizer" />
               </div>
             ) : (
               /* Empty State Sidebar */
               <div className="flex-1 bg-card/50 border border-dashed rounded-xl flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
                 Visualization insights will appear here.
               </div>
             )}
          </div>

        </div>
      </div>
    </ToolLayout>
  );
}
