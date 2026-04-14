"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { createStore, type StoreApi } from "zustand";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";

type ContextValue = StoreApi<OptimizationState> | undefined;

export const OptimizationStoreContext = createContext<ContextValue>(undefined);

export interface OptimizationStoreProviderProps {
  readonly children: ReactNode;
}

export function OptimizationStoreProvider({
  children,
}: OptimizationStoreProviderProps) {
  const [store] = useState(() =>
    createStore<OptimizationState>(createOptimizationSlice),
  );

  return (
    <OptimizationStoreContext.Provider value={store}>
      {children}
    </OptimizationStoreContext.Provider>
  );
}

export function useOptimizationStore(): StoreApi<OptimizationState> {
  const store = useContext(OptimizationStoreContext);
  if (store === undefined) {
    throw new Error("`useOptimizationStore` must be used within `OptimizationStoreProvider`");
  }
  return store;
}
