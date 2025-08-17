"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("light");

  // Read initial preference from localStorage or system
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      let initial: Theme = "light";
      if (stored === "light" || stored === "dark") {
        initial = stored;
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        initial = "dark";
      }
      setThemeState(initial);
      applyDocumentClass(initial);
    } catch (e) {
      // ignore
    }
  }, []);

  const applyDocumentClass = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyDocumentClass(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev: Theme) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      applyDocumentClass(next);
      return next;
    });
  }, []);

  const value: ThemeContextValue = { theme, toggleTheme, setTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
