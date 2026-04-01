"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from '@/features/lens-editor/stores/specsConfigurerStore';

type ContextValue = StoreApi<SpecsConfigurerState> | undefined;

export const SpecsConfiguratorStoreContext = createContext<ContextValue>(undefined);

export interface SpecsConfiguratorStoreProviderProps {
  children: ReactNode;
}

export const SpecsConfiguratorStoreProvider: React.FC<SpecsConfiguratorStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<SpecsConfigurerState>(createSpecsConfigurerSlice));
  }

  return (
    <SpecsConfiguratorStoreContext.Provider value={store}>
      {children}
    </SpecsConfiguratorStoreContext.Provider>
  );
};

export const useSpecsConfiguratorStore = (): StoreApi<SpecsConfigurerState> => {
  const store = useContext(SpecsConfiguratorStoreContext);
  if (store === undefined) {
    throw new Error('`useSpecsConfiguratorStore` must be used within `SpecsConfiguratorStoreProvider`');
  }
  return store;
};
