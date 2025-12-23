"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PiMagnifyingGlass, PiPlus, PiFolderOpen, PiFolderPlus, PiChatCircle, PiStar, PiCaretRight, PiStack, PiArrowRight } from "react-icons/pi";

// Types
export interface CommandItem {
  id: string;
  type: "conversation" | "project" | "folder" | "command" | "action";
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  shortcut?: string[];
  onSelect?: () => void;
  href?: string;
}

export interface CommandGroup {
  id: string;
  title: string;
  items: CommandItem[];
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Data sources
  conversations?: Array<{
    id: string;
    title: string;
    isPinned?: boolean;
    updatedAt?: number;
    projectId?: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    conversationIds: string[];
  }>;
  // Callbacks
  onSelectConversation?: (id: string) => void;
  onSelectProject?: (id: string) => void;
  onNewChat?: () => void;
  onNewProject?: () => void;
  onNewFolder?: () => void;
}

export function CommandBar({
  open,
  onOpenChange,
  conversations = [],
  projects = [],
  folders = [],
  onSelectConversation,
  onSelectProject,
  onNewChat,
  onNewProject,
  onNewFolder,
}: CommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Build command groups
  const groups = React.useMemo(() => {
    const result: CommandGroup[] = [];
    const lowerQuery = query.toLowerCase().trim();
    const isCommand = lowerQuery.startsWith("/");
    const searchQuery = isCommand ? lowerQuery.slice(1) : lowerQuery;

    // Commands (when / is typed or no query)
    if (isCommand || !lowerQuery) {
      const commands = ([
        {
          id: "new-chat",
          type: "command" as const,
          title: "New conversation",
          subtitle: "Start a new chat",
          icon: <PiPlus className="h-4 w-4" />,
          keywords: ["new", "chat", "create"],
          shortcut: ["N"],
          onSelect: () => {
            onNewChat?.();
            onOpenChange(false);
          },
        },
        {
          id: "new-project",
          type: "command" as const,
          title: "New project",
          subtitle: "Create a project to organize chats",
          icon: <PiStack className="h-4 w-4" />,
          keywords: ["project", "create", "new"],
          shortcut: ["P"],
          onSelect: () => {
            onNewProject?.();
            onOpenChange(false);
          },
        },
        {
          id: "new-folder",
          type: "command" as const,
          title: "New folder",
          subtitle: "Create a folder",
          icon: <PiFolderPlus className="h-4 w-4" />,
          keywords: ["folder", "create", "new"],
          shortcut: undefined,
          onSelect: () => {
            onNewFolder?.();
            onOpenChange(false);
          },
        },
      ] satisfies CommandItem[]).filter(
        (cmd) =>
          !searchQuery ||
          cmd.title.toLowerCase().includes(searchQuery) ||
          cmd.keywords?.some((k) => k.includes(searchQuery))
      );

      if (commands.length > 0) {
        result.push({
          id: "commands",
          title: "Commands",
          items: commands,
        });
      }
    }

    // Only show data items when not in command mode
    if (!isCommand) {
      // Pinned conversations
      const pinned = conversations
        .filter((c) => c.isPinned)
        .filter(
          (c) =>
            !lowerQuery || c.title.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
        .map((c) => ({
          id: c.id,
          type: "conversation" as const,
          title: c.title || "Untitled",
          icon: <PiStar className="h-4 w-4 text-amber-500" />,
          onSelect: () => {
            onSelectConversation?.(c.id);
            onOpenChange(false);
          },
        }));

      if (pinned.length > 0) {
        result.push({
          id: "pinned",
          title: "Pinned",
          items: pinned,
        });
      }

      // Recent conversations (not pinned)
      const recent = conversations
        .filter((c) => !c.isPinned)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .filter(
          (c) =>
            !lowerQuery || c.title.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          type: "conversation" as const,
          title: c.title || "Untitled",
          subtitle: formatRelativeTime(c.updatedAt),
          icon: <PiChatCircle className="h-4 w-4 text-muted-foreground" />,
          onSelect: () => {
            onSelectConversation?.(c.id);
            onOpenChange(false);
          },
        }));

      if (recent.length > 0) {
        result.push({
          id: "recent",
          title: "Recent",
          items: recent,
        });
      }

      // Projects
      if (projects.length > 0) {
        const filteredProjects = projects
          .filter(
            (p) =>
              !lowerQuery || p.name.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            type: "project" as const,
            title: p.name,
            icon: <PiStack className="h-4 w-4 text-purple-500" />,
            onSelect: () => {
              onSelectProject?.(p.id);
              onOpenChange(false);
            },
          }));

        if (filteredProjects.length > 0) {
          result.push({
            id: "projects",
            title: "Projects",
            items: filteredProjects,
          });
        }
      }

      // Folders
      if (folders.length > 0) {
        const filteredFolders = folders
          .filter(
            (f) =>
              !lowerQuery || f.name.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 4)
          .map((f) => ({
            id: f.id,
            type: "folder" as const,
            title: f.name,
            subtitle: `${f.conversationIds.length} chats`,
            icon: <PiFolderOpen className="h-4 w-4 text-blue-500" />,
            onSelect: () => {
              // Could open folder or expand in sidebar
              onOpenChange(false);
            },
          }));

        if (filteredFolders.length > 0) {
          result.push({
            id: "folders",
            title: "Folders",
            items: filteredFolders,
          });
        }
      }
    }

    return result;
  }, [
    query,
    conversations,
    projects,
    folders,
    onSelectConversation,
    onSelectProject,
    onNewChat,
    onNewProject,
    onNewFolder,
    onOpenChange,
  ]);

  // Flatten items for keyboard navigation
  const allItems = React.useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item?.onSelect) {
          item.onSelect();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [allItems, selectedIndex, onOpenChange]
  );

  // Scroll selected item into view
  React.useEffect(() => {
    const selected = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  let itemIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Bar */}
      <div className="fixed inset-x-4 top-[20vh] z-50 mx-auto max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
        <div
          className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl"
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px hsl(var(--command-border))",
          }}
        >
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-4">
            <PiMagnifyingGlass className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto overscroll-contain p-2"
          >
            {groups.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-2 last:mb-0">
                  <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    itemIndex++;
                    const isSelected = itemIndex === selectedIndex;
                    const currentIndex = itemIndex;

                    return (
                      <button
                        key={item.id}
                        data-index={currentIndex}
                        onClick={() => item.onSelect?.()}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-secondary/50"
                        )}
                      >
                        {item.icon && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
                            {item.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <div className="flex items-center gap-1">
                            {item.shortcut.map((key, i) => (
                              <kbd
                                key={i}
                                className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                        {isSelected && (
                          <PiCaretRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px]">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px]">/</kbd> Commands
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function
function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";

  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export default CommandBar;
