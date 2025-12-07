"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useGuestSession } from "./use-guest-session";
import { useChatContext } from "./chat-context";

interface GuestChatContextType {
  isGuest: boolean;
  guestId: string | null;
  creditsRemaining: number | null;
  refreshGuestStatus: () => Promise<void>;
}

const GuestChatContext = createContext<GuestChatContextType>({
  isGuest: false,
  guestId: null,
  creditsRemaining: null,
  refreshGuestStatus: async () => {},
});

export function GuestChatProvider({ children }: { children: React.ReactNode }) {
  const { guestId, isGuest } = useGuestSession();
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const refreshGuestStatus = async () => {
    if (!isGuest || !guestId) return;

    try {
      const response = await fetch("/api/guest/status");
      if (response.ok) {
        const data = await response.json() as { creditsRemaining: number };
        setCreditsRemaining(data.creditsRemaining);
      }
    } catch (error) {
      console.error("Failed to refresh guest status:", error);
    }
  };

  useEffect(() => {
    if (isGuest) {
      refreshGuestStatus();
    }
  }, [isGuest, guestId]);

  return (
    <GuestChatContext.Provider
      value={{
        isGuest,
        guestId,
        creditsRemaining,
        refreshGuestStatus,
      }}
    >
      {children}
    </GuestChatContext.Provider>
  );
}

export function useGuestChatContext() {
  return useContext(GuestChatContext);
}

// Hook to get API endpoint based on mode
export function useApiEndpoint() {
  const { isGuest } = useGuestChatContext();

  const getApiEndpoint = useCallback((regularEndpoint: string) => {
    if (!isGuest) return regularEndpoint;

    // Map regular endpoints to guest endpoints
    const endpointMap: Record<string, string> = {
      "/api/chat": "/api/guest/chat",
      "/api/conversations": "/api/guest/conversations",
      "/api/folders": "/api/guest/folders",
      "/api/sub-chats": "/api/guest/sub-chats",
    };

    return endpointMap[regularEndpoint] || regularEndpoint;
  }, [isGuest]);

  return { getApiEndpoint, isGuest };
}
