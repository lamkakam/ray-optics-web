"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createAnalysisPlotSlice, type AnalysisPlotState } from '@/features/analysis/stores/analysisPlotStore';

type ContextValue = StoreApi<AnalysisPlotState> | undefined;

/** Raw context object. Use only in tests to supply a pre-built store directly via `<AnalysisPlotStoreContext.Provider value={store}>`. */
export const AnalysisPlotStoreContext = createContext<ContextValue>(undefined);

/** Initial state and child tree for an isolated analysis-plot store. */
export interface AnalysisPlotStoreProviderProps {
  children: ReactNode;
}

/** Provides a single `StoreApi<AnalysisPlotState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes. */
export const AnalysisPlotStoreProvider: React.FC<AnalysisPlotStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<AnalysisPlotState>(createAnalysisPlotSlice));
  }

  return (
    <AnalysisPlotStoreContext.Provider value={store}>
      {children}
    </AnalysisPlotStoreContext.Provider>
  );
};

/** Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `AnalysisPlotStoreProvider`. */
export const useAnalysisPlotStore = (): StoreApi<AnalysisPlotState> => {
  const store = useContext(AnalysisPlotStoreContext);
  if (store === undefined) {
    throw new Error('`useAnalysisPlotStore` must be used within `AnalysisPlotStoreContext`');
  }
  return store;
};
