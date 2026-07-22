"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import {
  createGlassMapSlice,
  type GlassMapStore,
} from '@/features/glass-map/stores/glassMapStore';

type ContextValue = StoreApi<GlassMapStore> | undefined;

/**
Raw context object. Use only in tests to supply a pre-built store directly via `<GlassMapStoreContext.Provider value={store}>`.
*/
export const GlassMapStoreContext = createContext<ContextValue>(undefined);

export interface GlassMapStoreProviderProps {
  readonly children: ReactNode;
}

/**
Provides a single `StoreApi<GlassMapStore>` instance to the app tree via React context. The provider creates the store once per mount so glass-map state persists across route switches.
*/
export const GlassMapStoreProvider: React.FC<GlassMapStoreProviderProps> = ({
  children,
}) => {
  const [store] = useState(() =>
    createStore<GlassMapStore>(createGlassMapSlice)
  );

  return (
    <GlassMapStoreContext.Provider value={store}>
      {children}
    </GlassMapStoreContext.Provider>
  );
};

/**
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `GlassMapStoreProvider`.
*/
export const useGlassMapStore = (): StoreApi<GlassMapStore> => {
  const store = useContext(GlassMapStoreContext);
  if (store === undefined) {
    throw new Error('`useGlassMapStore` must be used within `GlassMapStoreProvider`');
  }
  return store;
};
