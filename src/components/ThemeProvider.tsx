"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (newTheme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "ray-optics-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { readonly children: React.ReactNode }) {
  const [theme, _setTheme] = useState<Theme>(getInitialTheme);

  // Sync the `dark` class on <html> whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    switch (theme) {
      case "dark":
        root.classList.add("dark");
        break;
      case "light":
        root.classList.remove("dark");
        break;
      default:
        throw new Error("Invalid theme");
    }
  }, [theme]);


  const setTheme = useCallback((newTheme: Theme) => {
    // runtime check
    if (newTheme !== "dark" && newTheme !== "light") { return; }
    _setTheme(_ => newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);


  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
