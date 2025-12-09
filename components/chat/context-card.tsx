"use client";

import { memo, useState } from "react";
import { MessageSquare, FolderOpen, FileText, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ContextCardData {
  source: string;
  snippet: string;
  score: number;
  conversationId?: string;
  conversationTitle?: string;
}

interface ContextCardProps {
  card: ContextCardData;
  className?: string;
}

// Parse source string to extract type and title
function parseSource(source: string): { type: 'conversation' | 'folder' | 'file' | 'project'; title: string } {
  if (source.startsWith('Referenced Chat:')) {
    return { type: 'conversation', title: source.replace('Referenced Chat:', '').trim().replace(/^"|"$/g, '') };
  }
  if (source.startsWith('Folder')) {
    return { type: 'folder', title: source.replace(/^Folder\s*"?|"?$/g, '').trim() };
  }
  if (source.startsWith('File in')) {
    return { type: 'file', title: source.replace('File in', '').trim().replace(/^"|"$/g, '') };
  }
  if (source.includes('Project')) {
    return { type: 'project', title: source };
  }
  if (source.startsWith('Current Conversation')) {
    return { type: 'conversation', title: 'Current Conversation' };
  }
  if (source.startsWith('In "')) {
    // Project memory format: In "Title" (time ago)
    const match = source.match(/In "([^"]+)"/);
    return { type: 'project', title: match ? match[1] : source };
  }
  return { type: 'conversation', title: source };
}

const SourceIcon = ({ type }: { type: 'conversation' | 'folder' | 'file' | 'project' }) => {
  switch (type) {
    case 'folder':
      return <FolderOpen className="h-3.5 w-3.5 text-blue-500" />;
    case 'file':
      return <FileText className="h-3.5 w-3.5 text-amber-500" />;
    case 'project':
      return <FolderOpen className="h-3.5 w-3.5 text-purple-500" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export const ContextCard = memo(function ContextCard({ card, className }: ContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { type, title } = parseSource(card.source);
  
  // Truncate snippet for collapsed view
  const truncatedSnippet = card.snippet.length > 100 
    ? card.snippet.substring(0, 100) + '...' 
    : card.snippet;
  
  return (
    <div 
      className={cn(
        "group bg-muted/30 border border-border/40 rounded-xl overflow-hidden transition-all duration-200",
        isExpanded && "bg-muted/50",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <SourceIcon type={type} />
        <span className="flex-1 text-xs font-medium text-foreground/90 truncate">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {Math.round(card.score * 100)}% match
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-1 duration-200">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {card.snippet}
          </p>
        </div>
      )}
      
      {!isExpanded && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-muted-foreground/70 truncate italic">
            "{truncatedSnippet}"
          </p>
        </div>
      )}
    </div>
  );
});

interface ContextCardListProps {
  cards: ContextCardData[];
  className?: string;
}

export const ContextCardList = memo(function ContextCardList({ cards, className }: ContextCardListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!cards || cards.length === 0) return null;
  
  return (
    <div className={cn("space-y-2 mb-3", className)}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Using {cards.length} context source{cards.length > 1 ? 's' : ''}</span>
        {isCollapsed ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {cards.map((card, index) => (
            <ContextCard key={`${card.source}-${index}`} card={card} />
          ))}
        </div>
      )}
    </div>
  );
});
