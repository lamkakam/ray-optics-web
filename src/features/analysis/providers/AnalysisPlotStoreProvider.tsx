"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createAnalysisPlotSlice, type AnalysisPlotState } from '@/features/analysis/stores/analysisPlotStore';

type ContextValue = StoreApi<AnalysisPlotState> | undefined;

export const AnalysisPlotStoreContext = createContext<ContextValue>(undefined);

export interface AnalysisPlotStoreProviderProps {
  children: ReactNode;
}

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

export const useAnalysisPlotStore = (): StoreApi<AnalysisPlotState> => {
  const store = useContext(AnalysisPlotStoreContext);
  if (store === undefined) {
    throw new Error('`useAnalysisPlotStore` must be used within `AnalysisPlotStoreContext`');
  }
  return store;
};
