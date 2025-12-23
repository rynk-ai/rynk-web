"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Loader } from "@/components/ui/loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiMagnifyingGlass, PiTag, PiX } from "react-icons/pi";
import { type CloudConversation as Conversation } from "@/lib/services/cloud-db";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/lib/hooks/chat-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  allTags: string[];
  onSelectConversation: (id: string, conversation: Conversation) => void;
}

export function SearchDialog({
  open,
  onOpenChange,
  conversations: initialConversations,
  allTags,
  onSelectConversation,
}: SearchDialogProps) {
  const { searchConversations } = useChatContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedTags([]);
      setSearchResults([]);
      setPage(0);
      setHasMore(true);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setPage(0);
      setHasMore(true);
      try {
        const results = await searchConversations(query, 20, 0);
        setSearchResults(results);
        setHasMore(results.length === 20);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchConversations]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !searchQuery.trim()) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const results = await searchConversations(searchQuery, 20, nextPage * 20);
      setSearchResults(prev => [...prev, ...results]);
      setPage(nextPage);
      setHasMore(results.length === 20);
    } catch (error) {
      console.error("Load more failed:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, searchQuery, page, searchConversations]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const filteredConversations = useMemo(() => {
    // If searching, use search results. Otherwise use initial conversations (recent)
    const source = searchQuery.trim() ? searchResults : initialConversations;

    return source.filter((conversation) => {
      // Client-side tag filtering
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => conversation.tags?.includes(tag));

      return matchesTags;
    });
  }, [searchResults, initialConversations, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle></DialogTitle>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-card border border-border/40 shadow-2xl overflow-hidden">
        <div className="flex flex-col h-[60vh]">
          <div className="flex items-center border-b border-border/40 px-4 py-4">
            <PiMagnifyingGlass className="mr-3 h-5 w-5 text-muted-foreground" />
            <input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />

          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-secondary/30 border-b border-border/40">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                        : "bg-background hover:bg-muted-foreground/10 text-muted-foreground border-transparent hover:border-border"
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {isSelected && <PiX className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Results List */}
          <ScrollArea className="flex-1">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <Loader variant="classic" size="lg" />
                <p className="text-sm mt-4">Searching...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <PiMagnifyingGlass className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">
                  {searchQuery.trim() ? "No results found" : "No conversations"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className="group w-full flex flex-col items-start gap-1.5 p-3 rounded-md hover:bg-accent/50 transition-colors text-left relative"
                    onClick={() => {
                      onSelectConversation(conversation.id, conversation);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm group-hover:text-accent-foreground transition-colors">
                        {conversation.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {conversation.tags && conversation.tags.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-wrap gap-1">
                              {conversation.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="inline-flex items-center rounded-sm bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-primary/10">
                                  {tag}
                                </span>
                              ))}
                              {conversation.tags.length > 3 && (
                                <span className="inline-flex items-center rounded-sm bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-primary/10">
                                  +{conversation.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground px-1">Tags</span>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {conversation.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </button>
                ))}
                
                {/* Infinite Scroll Loader */}
                {searchQuery.trim() && hasMore && (
                  <div ref={observerTarget} className="flex justify-center py-4">
                    {isLoadingMore && <Loader variant="classic" size="md" />}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t border-border/40 bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground flex justify-between items-center">
            <span>{filteredConversations.length} results</span>
            <div className="flex gap-4">
               <span className="flex items-center gap-1.5">
                 <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px]">↑↓</kbd> navigate
               </span>
               <span className="flex items-center gap-1.5">
                 <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px]">↵</kbd> select
               </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
