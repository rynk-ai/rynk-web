import { useState, useEffect, useCallback } from "react";
import { dbService, Conversation, Folder } from "@/lib/services/indexeddb";
import { getEmbeddingsAction } from "@/app/actions";

export interface ContextItem {
  type: 'conversation' | 'folder';
  id: string;
  title: string;
}

export interface SearchResultItem {
  type: 'conversation' | 'folder';
  data: Conversation | Folder;
  matchScore: number;
  matchedContent?: string;
}

export function useContextSearch(currentConversationId?: string | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [recentFolders, setRecentFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);

  const loadRecentData = useCallback(async () => {
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
  }, [currentConversationId]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const embedding = await getEmbeddingsAction(searchQuery);
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

      const formattedResults: SearchResultItem[] = convs
        .filter((c): c is Conversation => !!c)
        .map(c => ({
          type: 'conversation' as const,
          data: c,
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
  }, [currentConversationId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Initial load
  useEffect(() => {
    loadRecentData();
  }, [loadRecentData]);

  const itemsToShow = query.trim().length > 0
    ? results
    : [
        ...recentFolders.map(f => ({ type: 'folder' as const, data: f, matchScore: 0, matchedContent: undefined })),
        ...recentConversations.map(c => ({ type: 'conversation' as const, data: c, matchScore: 0, matchedContent: undefined }))
      ];

  return {
    query,
    setQuery,
    results: itemsToShow,
    isLoading,
    allFolders,
    reload: loadRecentData
  };
}
