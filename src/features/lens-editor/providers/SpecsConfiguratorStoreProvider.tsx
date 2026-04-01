"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from '@/features/lens-editor/stores/specsConfiguratorStore';

type ContextValue = StoreApi<SpecsConfiguratorState> | undefined;

export const SpecsConfiguratorStoreContext = createContext<ContextValue>(undefined);

export interface SpecsConfiguratorStoreProviderProps {
  children: ReactNode;
}

export const SpecsConfiguratorStoreProvider: React.FC<SpecsConfiguratorStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice));
  }

  return (
    <SpecsConfiguratorStoreContext.Provider value={store}>
      {children}
    </SpecsConfiguratorStoreContext.Provider>
  );
};

export const useSpecsConfiguratorStore = (): StoreApi<SpecsConfiguratorState> => {
  const store = useContext(SpecsConfiguratorStoreContext);
  if (store === undefined) {
    throw new Error('`useSpecsConfiguratorStore` must be used within `SpecsConfiguratorStoreProvider`');
  }
  return store;
};
