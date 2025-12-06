"use client";

import * as React from "react";
import { FontProvider, useFont } from "@/components/providers/font-provider";

function FontLoader() {
  const { font } = useFont();

  // Always call useEffect - it will handle the mounting check
  React.useEffect(() => {
    // Only apply font on the client side
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--font-sans", `var(--font-${font})`);
    }
  }, [font]);

  return null;
}

export function FontProviderWrapper({
  children,
  defaultFont = "geist",
}: {
  children: React.ReactNode;
  defaultFont?: string;
}) {
  return (
    <FontProvider defaultFont={defaultFont}>
      <FontLoader />
      {children}
    </FontProvider>
  );
}
