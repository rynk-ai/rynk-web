"use client";

import { useState, useEffect } from "react";
import { generateGuestId } from "@/lib/guest";

export function useGuestSession() {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const session = await response.json() as { user?: any };

        if (session?.user) {
          // User is authenticated
          setIsGuest(false);
          setGuestId(null);
          return;
        }

        // User is not authenticated, check for guest ID
        initializeGuestSession();
      } catch (error) {
        console.error("Failed to check auth:", error);
        // Assume guest mode on error
        initializeGuestSession();
      }
    };

    checkAuth();
  }, []);

  const initializeGuestSession = async () => {
    // Check if guest ID already exists in cookies or localStorage
    const existingGuestId =
      getCookie("guest_id") || localStorage.getItem("guest_id");

    if (existingGuestId?.startsWith("guest_")) {
      setGuestId(existingGuestId);
      setIsGuest(true);
      return;
    }

    // Generate new guest ID
    const newGuestId = generateGuestId();

    // Store in localStorage
    localStorage.setItem("guest_id", newGuestId);

    // Set cookie (expires in 30 days)
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `guest_id=${newGuestId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    setGuestId(newGuestId);
    setIsGuest(true);
  };

  return {
    guestId,
    isGuest,
  };
}

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}
