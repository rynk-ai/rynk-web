
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Tool, ToolCategory, ALL_TOOLS } from "./data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";

const CATEGORIES: ToolCategory[] = ["All", "Writing", "Marketing", "Analysis", "Developer", "Social"];

export default function ToolsBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>("All");

  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/50 text-secondary-foreground hover:bg-secondary"
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool) => (
            <motion.div
              layout
              key={tool.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={tool.href}
                className="group h-full relative flex flex-col p-5 bg-card border border-border rounded-xl hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${tool.bg} ${tool.color}`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  {tool.badge && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full">
                      {tool.badge}
                    </Badge>
                  )}
                  {!tool.badge && (
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
                
                 {/* Keywords Tag (Optional, helps visual scanning) */}
                 <div className="mt-auto pt-4 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs text-muted-foreground/50">{tool.category}</span>
                 </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="inline-flex items-center justify-center p-4 bg-muted/50 rounded-full mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No tools found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            We couldn't find any tools matching "{searchQuery}". Try a different keyword or category.
          </p>
          <Button 
            variant="link" 
            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
            className="mt-4"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
