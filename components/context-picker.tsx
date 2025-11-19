import { useState, useEffect } from "react";
import { Search, Check, X, MessageSquare, Loader2, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { dbService, Conversation, Folder, Embedding } from "@/lib/services/indexeddb";
import { getOpenRouter } from "@/lib/services/openrouter";

export interface ContextItem {
  type: 'conversation' | 'folder';
  id: string;
  title: string;
}

interface ContextPickerProps {
  selectedItems: ContextItem[];
  onSelectionChange: (items: ContextItem[]) => void;
  trigger?: React.ReactNode;
  currentConversationId?: string | null;
  tooltip?: string;
}

export function ContextPicker({ selectedItems, onSelectionChange, trigger, currentConversationId, tooltip }: ContextPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ conversation: Conversation; matchScore: number; matchedContent?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({ current: 0, total: 0 });

  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [recentFolders, setRecentFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [convs, folders] = await Promise.all([
        dbService.getAllConversations(),
        dbService.getAllFolders()
      ]);
      
      setAllFolders(folders);

      // Filter out current conversation and sort by updatedAt desc
      const sortedConvs = convs
        .filter(c => c.id !== currentConversationId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20);
      setRecentConversations(sortedConvs);

      // Sort folders by updatedAt desc
      const sortedFolders = folders
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10);
      setRecentFolders(sortedFolders);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const openRouter = getOpenRouter();
      const embedding = await openRouter.getEmbeddings(query);
      const searchResults = await dbService.searchEmbeddings(embedding, 20, 0.3);
      
      // Group by conversation and find best match
      const convMap = new Map<string, { score: number; content: string }>();
      
      searchResults.forEach(r => {
        // Skip current conversation
        if (r.embedding.conversationId === currentConversationId) return;

        const existing = convMap.get(r.embedding.conversationId);
        if (!existing || r.score > existing.score) {
          convMap.set(r.embedding.conversationId, { score: r.score, content: r.embedding.content });
        }
      });

      // Fetch conversation details
      const convs = await Promise.all(
        Array.from(convMap.keys()).map(id => dbService.getConversation(id))
      );

      const formattedResults = convs
        .filter((c): c is Conversation => !!c)
        .map(c => ({
          conversation: c,
          matchScore: convMap.get(c.id)?.score || 0,
          matchedContent: convMap.get(c.id)?.content
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      setResults(formattedResults);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexHistory = async () => {
    if (!confirm("This will generate embeddings for all your chat history. It may take some time and incur API costs. Continue?")) return;
    
    setIsIndexing(true);
    try {
      const messages = await dbService.getAllMessages();
      // Filter for user messages or assistant messages with content
      const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);
      
      setIndexingProgress({ current: 0, total: validMessages.length });
      
      let indexed = 0;
      const openRouter = getOpenRouter();

      for (const message of validMessages) {
        try {
          // Skip if already indexed
          const existing = await dbService.getEmbeddingByMessageId(message.id);
          if (existing) {
            indexed++;
            setIndexingProgress(prev => ({ ...prev, current: indexed }));
            continue;
          }
          
          // Generate embedding
          const embedding = await openRouter.getEmbeddings(message.content);
          await dbService.addEmbedding({
            messageId: message.id,
            conversationId: message.conversationId,
            content: message.content,
            vector: embedding
          });
          
          indexed++;
          setIndexingProgress(prev => ({ ...prev, current: indexed }));
        } catch (err) {
          console.error(`Failed to index message ${message.id}:`, err);
        }
      }
      
      alert("Indexing complete!");
      loadData(); // Reload to ensure everything is fresh
    } catch (error) {
      console.error("Indexing failed:", error);
      alert("Indexing failed. Check console for details.");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (item: ContextItem) => {
    const isSelected = selectedItems.some(i => i.id === item.id);
    
    if (isSelected) {
      // Deselect
      onSelectionChange(selectedItems.filter(i => i.id !== item.id));
    } else {
      // Select
      if (item.type === 'folder') {
        // If selecting a folder, remove any individual conversations that are in this folder
        const folder = allFolders.find(f => f.id === item.id);
        if (folder) {
          const newSelection = selectedItems.filter(i => !folder.conversationIds.includes(i.id));
          onSelectionChange([...newSelection, item]);
        } else {
          onSelectionChange([...selectedItems, item]);
        }
      } else {
        // If selecting a conversation, just add it (UI prevents selecting if already covered)
        onSelectionChange([...selectedItems, item]);
      }
    }
  };

  // Calculate which conversations are covered by selected folders
  const coveredConversationIds = new Set<string>();
  selectedItems.forEach(item => {
    if (item.type === 'folder') {
      const folder = allFolders.find(f => f.id === item.id);
      if (folder) {
        folder.conversationIds.forEach(id => coveredConversationIds.add(id));
      }
    }
  });

  // Determine what to show
  const showSearchResults = query.trim().length > 0;
  const itemsToShow = showSearchResults 
    ? results.map(r => ({ type: 'conversation' as const, data: r.conversation, matchScore: r.matchScore, matchedContent: r.matchedContent }))
    : [
        ...recentFolders.map(f => ({ type: 'folder' as const, data: f, matchScore: 0, matchedContent: undefined })),
        ...recentConversations.map(c => ({ type: 'conversation' as const, data: c, matchScore: 0, matchedContent: undefined }))
      ];

  const triggerContent = (
    <DialogTrigger asChild>
      {trigger || (
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Add Context
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
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>{showSearchResults ? "Search Results" : "Recent Items"}</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground"
                onClick={handleIndexHistory}
                disabled={isIndexing}
              >
                {isIndexing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {indexingProgress.current}/{indexingProgress.total}
                  </span>
                ) : (
                  "Index History"
                )}
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-10 bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading} className="h-10 px-4">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-3 pb-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/50" />
                <p className="text-sm">Searching your history...</p>
              </div>
            ) : itemsToShow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg bg-muted/20">
                <Search className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs opacity-70 mt-1">Try a different search term</p>
              </div>
            ) : (
              itemsToShow.map((item) => {
                const isFolder = item.type === 'folder';
                const data = item.data as (Conversation | Folder);
                const title = isFolder ? (data as Folder).name : (data as Conversation).title;
                const id = data.id;
                const isSelected = selectedItems.some(i => i.id === id);
                const isCovered = !isFolder && coveredConversationIds.has(id);
                
                return (
                  <div
                    key={id}
                    className={cn(
                      "group p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.99]",
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
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={cn("p-1 rounded-md", isFolder ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary")}>
                            {isFolder ? <FolderIcon className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          </div>
                          <span>{isFolder ? 'Folder' : new Date(data.updatedAt).toLocaleDateString()}</span>
                          {item.matchScore > 0 && (
                            <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {Math.round(item.matchScore * 100)}% match
                            </span>
                          )}
                          {isCovered && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] italic">
                              Included in folder
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {title}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {item.matchedContent && (
                      <div className="relative mt-2 bg-muted/30 p-2.5 rounded-lg text-xs text-muted-foreground border border-border/30">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/20 rounded-l-lg" />
                        <p className="line-clamp-2 italic">"...{item.matchedContent}..."</p>
                      </div>
                    )}
                    {/* Show details for recent items */}
                    {!showSearchResults && (
                       <p className="text-xs text-muted-foreground/70 mt-1 pl-7">
                         {isFolder 
                           ? `${(data as Folder).conversationIds.length} conversations` 
                           : `${(data as Conversation).path.length} messages`
                         }
                       </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
