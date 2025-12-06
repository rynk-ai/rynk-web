"use client";

import * as React from "react";

export type FontOption = {
  name: string;
  label: string;
  className: string;
  cssVar: string;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    name: "geist",
    label: "Geist",
    className: "font-geist",
    cssVar: "--font-geist",
  },
  {
    name: "inter",
    label: "Inter",
    className: "font-inter",
    cssVar: "--font-inter",
  },
  {
    name: "system",
    label: "System UI",
    className: "font-system",
    cssVar: "--font-system",
  },
  {
    name: "serif",
    label: "Serif",
    className: "font-serif",
    cssVar: "--font-serif",
  },
];

type FontContextType = {
  font: string;
  setFont: (font: string) => void;
  options: FontOption[];
};

const FontContext = React.createContext<FontContextType | undefined>(undefined);

export function FontProvider({
  children,
  defaultFont = "geist",
}: {
  children: React.ReactNode;
  defaultFont?: string;
}) {
  const [font, setFontState] = React.useState<string>(defaultFont);

  React.useEffect(() => {
    // Load font from localStorage on mount
    if (typeof window !== "undefined") {
      const savedFont = localStorage.getItem("font");
      if (savedFont) {
        setFontState(savedFont);
      }
    }
  }, []);

  const setFont = React.useCallback(
    (newFont: string) => {
      setFontState(newFont);
      if (typeof window !== "undefined") {
        localStorage.setItem("font", newFont);
      }
    },
    []
  );

  const value = React.useMemo(
    () => ({
      font,
      setFont,
      options: FONT_OPTIONS,
    }),
    [font, setFont]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont() {
  const context = React.useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
}
