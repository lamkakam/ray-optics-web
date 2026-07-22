/**
# `app/AppShellContext.tsx`
## Behaviour
- `proxy` and `isReady` come from `usePyodide()` owned by `app/AppShell.tsx`
- `openErrorModal()` lets child pages surface worker/setup errors through the shared shell modal
- `useAppShell()` throws if called outside `AppShellProvider`

## Consumers
- `app/page.tsx`
- `app/glass-map/page.tsx`
*/
"use client";

import React, { createContext, useContext } from "react";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

interface AppShellContextValue {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly openErrorModal: () => void;
}

/**
## Purpose
Client-only context for app routes rendered inside the shared shell. Exposes shared Pyodide state and shell-level UI actions without prop drilling through every page.
*/
const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

interface AppShellProviderProps {
  readonly value: AppShellContextValue;
  readonly children: React.ReactNode;
}

export function AppShellProvider({ value, children }: AppShellProviderProps) {
  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return context;
}
