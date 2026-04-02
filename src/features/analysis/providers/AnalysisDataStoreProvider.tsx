"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createAnalysisDataSlice, type AnalysisDataState } from '@/features/analysis/stores/analysisDataStore';

type ContextValue = StoreApi<AnalysisDataState> | undefined;

export const AnalysisDataStoreContext = createContext<ContextValue>(undefined);

export interface AnalysisDataStoreProviderProps {
  children: ReactNode;
}

export const AnalysisDataStoreProvider: React.FC<AnalysisDataStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<AnalysisDataState>(createAnalysisDataSlice));
  }

  return (
    <AnalysisDataStoreContext.Provider value={store}>
      {children}
    </AnalysisDataStoreContext.Provider>
  );
};

export const useAnalysisDataStore = (): StoreApi<AnalysisDataState> => {
  const store = useContext(AnalysisDataStoreContext);
  if (store === undefined) {
    throw new Error('`useAnalysisDataStore` must be used within `AnalysisDataStoreProvider`');
  }
  return store;
};
