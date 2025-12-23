import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PiMagnifyingGlass, PiCheck, PiChatCircle, PiFolder as FolderIcon } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CloudConversation, Folder } from "@/lib/services/cloud-db";
import { useChatContext } from "@/lib/hooks/chat-context";

export interface ContextItem {
  type: 'conversation' | 'folder';
  id: string;
  title: string;
}

interface ContextPickerProps {
  selectedItems: ContextItem[];
  onSelectionChange: (items: ContextItem[]) => void;
  conversations: CloudConversation[];
  folders: Folder[];
  trigger?: React.ReactNode;
  currentConversationId?: string | null;
  tooltip?: string;
}

export function ContextPicker({
  selectedItems,
  onSelectionChange,
  conversations,
  folders,
  trigger,
  currentConversationId,
  tooltip
}: ContextPickerProps) {
  const { searchConversations } = useChatContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchResults, setSearchResults] = useState<CloudConversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults([]);
      setPage(0);
      setHasMore(true);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const lowerQuery = query.toLowerCase().trim();

    // If no query, use initial conversations
    if (!lowerQuery) {
      setSearchResults([]);
      setPage(0);
      setHasMore(true);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setPage(0);
      setHasMore(true);
      try {
        const results = await searchConversations(lowerQuery, 20, 0);
        setSearchResults(results);
        setHasMore(results.length === 20);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchConversations]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !query.trim()) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const results = await searchConversations(query, 20, nextPage * 20);
      setSearchResults(prev => [...prev, ...results]);
      setPage(nextPage);
      setHasMore(results.length === 20);
    } catch (error) {
      console.error("Load more failed:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, query, page, searchConversations]);

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

  // Filter and sort data based on search query
  const filteredData = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    // If searching, use search results. Otherwise use initial conversations
    const sourceConversations = lowerQuery ? searchResults : conversations;

    // Filter conversations (exclude current conversation)
    const filteredConvs = sourceConversations
      .filter(c => c.id !== currentConversationId)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    // Filter folders
    const filteredFolders = folders
      .filter(f => !lowerQuery || f.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { conversations: filteredConvs, folders: filteredFolders };
  }, [conversations, folders, currentConversationId, query, searchResults]);

  const handleSelect = (item: ContextItem) => {
    const isSelected = selectedItems.some(i => i.id === item.id);
    
    if (isSelected) {
      // Deselect
      onSelectionChange(selectedItems.filter(i => i.id !== item.id));
    } else {
      // Select
      if (item.type === 'folder') {
        // If selecting a folder, remove any individual conversations that are in this folder
        const folder = folders.find(f => f.id === item.id);
        if (folder) {
          const newSelection = selectedItems.filter(i => !folder.conversationIds.includes(i.id));
          onSelectionChange([...newSelection, item]);
        } else {
          onSelectionChange([...selectedItems, item]);
        }
      } else {
        // If selecting a conversation, just add it
        onSelectionChange([...selectedItems, item]);
      }
    }
  };

  // Calculate which conversations are covered by selected folders
  const coveredConversationIds = useMemo(() => {
    const covered = new Set<string>();
    selectedItems.forEach(item => {
      if (item.type === 'folder') {
        const folder = folders.find(f => f.id === item.id);
        if (folder) {
          folder.conversationIds.forEach(id => covered.add(id));
        }
      }
    });
    return covered;
  }, [selectedItems, folders]);

  // Combine folders and conversations for display, with selected items at top
  const itemsToShow = useMemo(() => {
    const allItems = [
      ...filteredData.folders.map(f => ({
        type: 'folder' as const,
        data: f
      })),
      ...filteredData.conversations.map(c => ({
        type: 'conversation' as const,
        data: c
      }))
    ];

    // Separate selected and unselected items
    const selected = allItems.filter(item => {
      const id = item.data.id;
      return selectedItems.some(selected => selected.id === id);
    });

    const unselected = allItems.filter(item => {
      const id = item.data.id;
      return !selectedItems.some(selected => selected.id === id);
    });

    // Return selected items first, then unselected
    return [...selected, ...unselected];
  }, [filteredData, selectedItems]);

  const triggerContent = (
    <DialogTrigger asChild>
      {trigger || (
        <Button variant="outline" size="sm" className="gap-2">
          <PiMagnifyingGlass className="h-4 w-4" />
          Add your chats
        </Button>
      )}
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {triggerContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        triggerContent
      )}
      
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col border border-border/40 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Select chats</span>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations and folders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 bg-secondary/50 border-border/40 focus:bg-card transition-colors"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-1 pb-4">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader variant="classic" size="lg" />
                <p className="text-sm mt-4">Searching...</p>
              </div>
            ) : itemsToShow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg bg-muted/20">
                <PiMagnifyingGlass className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs opacity-70 mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                {itemsToShow.map((item) => {
                  const isFolder = item.type === 'folder';
                  const data = item.data;
                  const title = isFolder ? (data as Folder).name : (data as CloudConversation).title;
                  const id = data.id;
                  const isSelected = selectedItems.some(i => i.id === id);
                  const isCovered = !isFolder && coveredConversationIds.has(id);

                  return (
                    <div
                      key={id}
                      className={cn(
                        "group p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm active:scale-[0.99]",
                        isSelected
                          ? "bg-primary/5 border-primary/50"
                          : isCovered
                            ? "opacity-50 cursor-not-allowed bg-muted/30 border-border/30"
                            : "border-border/50 hover:bg-muted/50 hover:border-primary/20"
                      )}
                      onClick={() => {
                        if (!isCovered) {
                          handleSelect({ type: item.type, id, title });
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isFolder && (
                              <div className="p-0.5 rounded bg-blue-500/10 text-blue-500 flex-shrink-0">
                                <FolderIcon className="h-3 w-3" />
                              </div>
                            )}
                            <span>
                              {isFolder
                                ? 'Folder'
                                : new Date(data.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              }
                            </span>
                            {isCovered && (
                              <span className="bg-muted px-1 py-0.5 rounded text-[10px] italic">
                                In folder
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mt-0.5 truncate">
                            {title}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                            <PiCheck className="h-3 w-3" />
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 flex items-center h-full">
                          {isFolder
                            ? `${(data as Folder).conversationIds.length}`
                            : `${(data as CloudConversation).path.length}`
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Infinite Scroll Loader */}
                {query.trim() && hasMore && (
                  <div ref={observerTarget} className="flex justify-center py-4">
                    {isLoadingMore && <Loader variant="classic" size="md" />}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
