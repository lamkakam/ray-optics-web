"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createLensLayoutImageSlice, type LensLayoutImageState } from '@/features/analysis/stores/lensLayoutImageStore';

type ContextValue = StoreApi<LensLayoutImageState> | undefined;

export const LensLayoutImageStoreContext = createContext<ContextValue>(undefined);

export interface LensLayoutImageStoreProviderProps {
  children: ReactNode;
}

export const LensLayoutImageStoreProvider: React.FC<LensLayoutImageStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<LensLayoutImageState>(createLensLayoutImageSlice));
  }

  return (
    <LensLayoutImageStoreContext.Provider value={store}>
      {children}
    </LensLayoutImageStoreContext.Provider>
  );
};

export const useLensLayoutImageStore = (): StoreApi<LensLayoutImageState> => {
  const store = useContext(LensLayoutImageStoreContext);
  if (store === undefined) {
    throw new Error('`useLensLayoutImageStore` must be used within `LensLayoutImageStoreProvider`');
  }
  return store;
};
