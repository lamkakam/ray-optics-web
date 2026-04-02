"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createGlassMapSlice, type GlassMapStore } from '@/features/glass-map/stores/glassMapStore';

type ContextValue = StoreApi<GlassMapStore> | undefined;

export const GlassMapStoreContext = createContext<ContextValue>(undefined);

export interface GlassMapStoreProviderProps {
  children: ReactNode;
}

export const GlassMapStoreProvider: React.FC<GlassMapStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<GlassMapStore>(createGlassMapSlice));
  }

  return (
    <GlassMapStoreContext.Provider value={store}>
      {children}
    </GlassMapStoreContext.Provider>
  );
};

export const useGlassMapStore = (): StoreApi<GlassMapStore> => {
  const store = useContext(GlassMapStoreContext);
  if (store === undefined) {
    throw new Error('`useGlassMapStore` must be used within `GlassMapStoreProvider`');
  }
  return store;
};
