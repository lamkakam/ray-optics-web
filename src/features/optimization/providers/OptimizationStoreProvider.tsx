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

/**
 * Creates the optimization store once and exposes it through React context so `/optimization` state persists across route switches.
 *
 * @remarks
 * ## Behavior
 *
 * - The provider creates the store once per mount with `useState(() => createStore(...))`.
 * - `useOptimizationStore()` throws when called outside the provider.
 * - Tests may inject a pre-built store directly with `<OptimizationStoreContext.Provider value={store}>`.
 */
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
