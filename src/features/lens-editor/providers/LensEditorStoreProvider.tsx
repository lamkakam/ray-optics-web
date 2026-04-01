"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi, useStore as useZustandStore } from 'zustand';
import { createLensEditorSlice, type LensEditorState } from '@/features/lens-editor/stores/lensEditorStore';

type ContextValue = StoreApi<LensEditorState> | undefined;

export const LensEditorStoreContext = createContext<ContextValue>(undefined);

export interface LensEditorStoreProviderProps {
  children: ReactNode;
}

export const LensEditorStoreProvider: React.FC<LensEditorStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<LensEditorState>(createLensEditorSlice));
  }

  return (
    <LensEditorStoreContext.Provider value={store}>
      {children}
    </LensEditorStoreContext.Provider>
  );
};

export const useLensEditorStore = <T,>(selector: (state: LensEditorState) => T): T => {
  const store = useContext(LensEditorStoreContext);
  if (store === undefined) {
    throw new Error('`useLensEditorStore` must be used within `LensEditorStoreProvider`');
  }
  return useZustandStore(store, selector);
};

export const useLensEditorStoreApi = (): StoreApi<LensEditorState> => {
  const store = useContext(LensEditorStoreContext);
  if (store === undefined) {
    throw new Error('`useLensEditorStoreApi` must be used within `LensEditorStoreProvider`');
  }
  return store;
};
