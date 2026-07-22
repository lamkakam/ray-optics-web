/**
# `shared/components/providers/ThemeProvider/ThemeProvider.tsx`

## Exports

```ts
export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element
export function useTheme(): { theme: Theme; setTheme: (newTheme: Theme) => void }
```

## Internal State

- `theme: Theme` — the active theme, initialized by `getInitialTheme()` which reads `localStorage` then falls back to the OS preference.
*/
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Theme } from "@/shared/tokens/theme";

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

/**
## Purpose

React context provider that manages the application theme (`"light"` | `"dark"`). Persists the selection to `localStorage`, syncs the `dark` CSS class on `<html>`, and respects the OS `prefers-color-scheme` media query on first visit.

## Key Behaviors

- `setTheme` persists the new value to `localStorage` under key `"ray-optics-theme"` and updates the `dark` class on `document.documentElement`.
- `useTheme` throws if called outside a `ThemeProvider` tree.
- SSR-safe: `getInitialTheme` returns `"light"` when `window` is `undefined`.

## Usages

**1. Wrap the root layout:**

```tsx
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <html>
        <body>{children}</body>
      </html>
    </ThemeProvider>
  );
}
```

**2. Consume theme in a component:**

```tsx
"use client";

import { useTheme } from "@/shared/components/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme: {theme}
    </button>
  );
}
```
*/
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
