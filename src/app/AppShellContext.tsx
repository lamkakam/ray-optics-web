"use client";
/** Client context connecting routed pages to runtime state owned by `AppShell`. */

import React, { createContext, useContext } from "react";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

interface AppShellContextValue {
  /** Shared worker proxy, or `undefined` during initialization. */
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Whether the shared Pyodide runtime is ready. */
  readonly isReady: boolean;
  /** Opens the shell-owned worker/setup error modal. */
  readonly openErrorModal: () => void;
}

/** Client-only context for app routes rendered inside the shared shell. Exposes shared Pyodide state and shell-level UI actions without prop drilling through every page. */
const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

interface AppShellProviderProps {
  readonly value: AppShellContextValue;
  readonly children: React.ReactNode;
}

/** Provides shell-owned runtime state and actions to routed client pages. */
export function AppShellProvider({ value, children }: AppShellProviderProps) {
  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

/**
 * Reads the shared shell context.
 *
 * @throws When used outside {@link AppShellProvider}.
 */
export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return context;
}
