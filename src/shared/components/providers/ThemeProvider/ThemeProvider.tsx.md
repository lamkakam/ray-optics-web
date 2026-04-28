# `shared/components/providers/ThemeProvider/ThemeProvider.tsx`

## Purpose

React context provider that manages the application theme (`"light"` | `"dark"`). Persists the selection to `localStorage`, syncs the `dark` CSS class on `<html>`, and respects the OS `prefers-color-scheme` media query on first visit.

## Exports

```ts
export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element
export function useTheme(): { theme: Theme; setTheme: (newTheme: Theme) => void }
```

## Internal State

- `theme: Theme` — the active theme, initialized by `getInitialTheme()` which reads `localStorage` then falls back to the OS preference.

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
