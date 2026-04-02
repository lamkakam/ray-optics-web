"use client";

import React, { createContext, useContext } from "react";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

interface AppShellContextValue {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly openErrorModal: () => void;
}

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
