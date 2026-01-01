import type { CloudMessage as ChatMessage } from "@/lib/services/cloud-db";

/**
 * Filters messages to show only active versions (highest versionNumber per version group).
 * This prevents duplicate messages from appearing when message versioning is used.
 * 
 * @param messages - Array of messages that may contain multiple versions
 * @returns Filtered array with only the active version of each message, sorted by timestamp
 */
export function filterActiveVersions(messages: ChatMessage[]): ChatMessage[] {
  const activeMessages: ChatMessage[] = [];
  const versionGroups = new Map<string, ChatMessage[]>();

  // Group messages by their version root
  messages.forEach((msg) => {
    const rootId = msg.versionOf || msg.id;
    if (!versionGroups.has(rootId)) {
      versionGroups.set(rootId, []);
    }
    versionGroups.get(rootId)!.push(msg);
  });

  // For each version group, select the active version (highest versionNumber)
  versionGroups.forEach((versions) => {
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest;
    });
    activeMessages.push(activeVersion);
  });

  // Sort by timestamp to maintain conversation order
  return activeMessages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generic version for guest messages without full ChatMessage type.
 * Uses 'any' to support guest message types that may have different shapes.
 */
export function filterActiveVersionsGeneric<T extends { 
  id: string; 
  versionOf?: string | null; 
  versionNumber: number; 
  timestamp: number;
}>(messages: T[]): T[] {
  const activeMessages: T[] = [];
  const versionGroups = new Map<string, T[]>();

  messages.forEach((msg) => {
    const rootId = msg.versionOf || msg.id;
    if (!versionGroups.has(rootId)) {
      versionGroups.set(rootId, []);
    }
    versionGroups.get(rootId)!.push(msg);
  });

  versionGroups.forEach((versions) => {
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest;
    });
    activeMessages.push(activeVersion);
  });

  return activeMessages.sort((a, b) => a.timestamp - b.timestamp);
}
