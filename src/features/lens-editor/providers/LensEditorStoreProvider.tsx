"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createLensEditorSlice, type LensEditorState } from '@/features/lens-editor/stores/lensEditorStore';

type ContextValue = StoreApi<LensEditorState> | undefined;

/** Raw context object. Use only in tests to supply a pre-built store directly via `<LensEditorStoreContext.Provider value={store}>`. */
export const LensEditorStoreContext = createContext<ContextValue>(undefined);

export interface LensEditorStoreProviderProps {
  children: ReactNode;
}

/** Provides a single `StoreApi<LensEditorState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes. */
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

/** Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `LensEditorStoreProvider`. */
export const useLensEditorStore = (): StoreApi<LensEditorState> => {
  const store = useContext(LensEditorStoreContext);
  if (store === undefined) {
    throw new Error('`useLensEditorStore` must be used within `LensEditorStoreProvider`');
  }
  return store;
};
