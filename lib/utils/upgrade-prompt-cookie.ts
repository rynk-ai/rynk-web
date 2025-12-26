"use client";

const COOKIE_NAME = "rynk_upgrade_dismissed";
const DAYS_BETWEEN_PROMPTS = 7;

/**
 * Check if we should show the upgrade prompt based on cookie
 */
export function shouldShowUpgradePrompt(): boolean {
  if (typeof document === "undefined") return false;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${COOKIE_NAME}=`);
  
  if (parts.length === 2) {
    const dismissedAt = parts.pop()?.split(";").shift();
    if (dismissedAt) {
      const dismissedDate = parseInt(dismissedAt, 10);
      const daysSinceDismissed = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed >= DAYS_BETWEEN_PROMPTS;
    }
  }
  
  return true; // No cookie = show prompt
}

/**
 * Dismiss the upgrade prompt for 7 days
 */
export function dismissUpgradePrompt(): void {
  if (typeof document === "undefined") return;
  
  const expires = new Date();
  expires.setDate(expires.getDate() + 30); // Cookie valid for 30 days
  
  document.cookie = `${COOKIE_NAME}=${Date.now()}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}
