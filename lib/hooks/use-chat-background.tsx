"use client";

import { useState, useEffect, useCallback, useMemo, createContext, useContext, type ReactNode } from "react";

// Available background images
export const CHAT_BACKGROUNDS = [
  { id: "1", src: "/chat-background/1.jpg", name: "Blue & Red Gradient" },
  { id: "2", src: "/chat-background/2.jpg", name: "Ocean Blue" },
  { id: "3", src: "/chat-background/3.jpg", name: "Sunset Swirl" },
  { id: "4", src: "/chat-background/4.jpg", name: "Purple Haze" },
] as const;

export type BackgroundPreference = "auto" | "none" | string; // "auto", "none", or background id

const STORAGE_KEY = "chat-background-preference";
const LAST_AUTO_CHANGE_KEY = "chat-background-last-auto-change";
const CURRENT_AUTO_INDEX_KEY = "chat-background-auto-index";

// MS in 24 hours
const DAY_MS = 24 * 60 * 60 * 1000;

type ChatBackgroundContextType = {
  preference: BackgroundPreference;
  setPreference: (pref: BackgroundPreference) => void;
  currentBackground: (typeof CHAT_BACKGROUNDS)[number] | null;
  backgrounds: typeof CHAT_BACKGROUNDS;
  isLoaded: boolean;
};

const ChatBackgroundContext = createContext<ChatBackgroundContextType | null>(null);

/**
 * Provider component for chat background state.
 * Wrap your app or chat pages with this to enable background features.
 */
export function ChatBackgroundProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<BackgroundPreference>("auto");
  const [autoIndex, setAutoIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPref = localStorage.getItem(STORAGE_KEY) as BackgroundPreference | null;
    if (storedPref) {
      setPreferenceState(storedPref);
    }

    // Handle auto-rotation
    const lastChange = localStorage.getItem(LAST_AUTO_CHANGE_KEY);
    const storedIndex = localStorage.getItem(CURRENT_AUTO_INDEX_KEY);
    const now = Date.now();

    let currentIndex = storedIndex ? parseInt(storedIndex, 10) : 0;

    // Check if 24 hours have passed
    if (!lastChange || now - parseInt(lastChange, 10) > DAY_MS) {
      // Rotate to next image
      currentIndex = (currentIndex + 1) % CHAT_BACKGROUNDS.length;
      localStorage.setItem(LAST_AUTO_CHANGE_KEY, now.toString());
      localStorage.setItem(CURRENT_AUTO_INDEX_KEY, currentIndex.toString());
    }

    setAutoIndex(currentIndex);
    setIsLoaded(true);
  }, []);

  // Set preference and persist
  const setPreference = useCallback((newPref: BackgroundPreference) => {
    setPreferenceState(newPref);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newPref);
    }
  }, []);

  // Get current background based on preference
  const currentBackground = useMemo(() => {
    if (!isLoaded) return null;
    
    if (preference === "none") {
      return null;
    }

    if (preference === "auto") {
      return CHAT_BACKGROUNDS[autoIndex] || CHAT_BACKGROUNDS[0];
    }

    // Find specific background by id
    return CHAT_BACKGROUNDS.find((bg) => bg.id === preference) || CHAT_BACKGROUNDS[0];
  }, [preference, autoIndex, isLoaded]);

  const value = useMemo(() => ({
    preference,
    setPreference,
    currentBackground,
    backgrounds: CHAT_BACKGROUNDS,
    isLoaded,
  }), [preference, setPreference, currentBackground, isLoaded]);

  return (
    <ChatBackgroundContext.Provider value={value}>
      {children}
    </ChatBackgroundContext.Provider>
  );
}

/**
 * Hook to access chat background state.
 * Must be used within a ChatBackgroundProvider.
 * Falls back to localStorage-only behavior if used outside provider.
 */
export function useChatBackground(): ChatBackgroundContextType {
  const context = useContext(ChatBackgroundContext);
  
  // Fallback for components outside the provider (e.g., during SSR or in isolated contexts)
  const [fallbackPreference, setFallbackPreferenceState] = useState<BackgroundPreference>("auto");
  const [fallbackAutoIndex, setFallbackAutoIndex] = useState<number>(0);
  const [fallbackIsLoaded, setFallbackIsLoaded] = useState(false);

  useEffect(() => {
    if (context) return; // Don't run fallback if context exists
    if (typeof window === "undefined") return;

    const storedPref = localStorage.getItem(STORAGE_KEY) as BackgroundPreference | null;
    if (storedPref) {
      setFallbackPreferenceState(storedPref);
    }

    const storedIndex = localStorage.getItem(CURRENT_AUTO_INDEX_KEY);
    if (storedIndex) {
      setFallbackAutoIndex(parseInt(storedIndex, 10));
    }

    setFallbackIsLoaded(true);
  }, [context]);

  const setFallbackPreference = useCallback((newPref: BackgroundPreference) => {
    setFallbackPreferenceState(newPref);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newPref);
    }
  }, []);

  const fallbackCurrentBackground = useMemo(() => {
    if (!fallbackIsLoaded) return null;
    if (fallbackPreference === "none") return null;
    if (fallbackPreference === "auto") {
      return CHAT_BACKGROUNDS[fallbackAutoIndex] || CHAT_BACKGROUNDS[0];
    }
    return CHAT_BACKGROUNDS.find((bg) => bg.id === fallbackPreference) || CHAT_BACKGROUNDS[0];
  }, [fallbackPreference, fallbackAutoIndex, fallbackIsLoaded]);

  // Return context if available, otherwise return fallback
  if (context) {
    return context;
  }

  return {
    preference: fallbackPreference,
    setPreference: setFallbackPreference,
    currentBackground: fallbackCurrentBackground,
    backgrounds: CHAT_BACKGROUNDS,
    isLoaded: fallbackIsLoaded,
  };
}
