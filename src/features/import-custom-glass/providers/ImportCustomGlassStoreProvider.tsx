"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { createStore, type StoreApi } from "zustand";
import {
  createImportCustomGlassSlice,
  type ImportCustomGlassStore,
} from "@/features/import-custom-glass/stores/importCustomGlassStore";

type ContextValue = StoreApi<ImportCustomGlassStore> | undefined;

/**
 * Describes the Import Custom Glass Store Provider module.
 *
 * @remarks
 * ### `ImportCustomGlassStoreContext`
 * Raw context object for tests that need to inject a pre-built store.
 */
export const ImportCustomGlassStoreContext = createContext<ContextValue>(undefined);

export interface ImportCustomGlassStoreProviderProps {
  readonly children: ReactNode;
}

/** Provides one `StoreApi<ImportCustomGlassStore>` instance through React context. The provider is mounted in `app/layout.tsx` so readonly custom-glass table sort and filter state persists while the app root remains mounted. */
export function ImportCustomGlassStoreProvider({
  children,
}: ImportCustomGlassStoreProviderProps) {
  const [store] = useState(() =>
    createStore<ImportCustomGlassStore>(createImportCustomGlassSlice),
  );

  return (
    <ImportCustomGlassStoreContext.Provider value={store}>
      {children}
    </ImportCustomGlassStoreContext.Provider>
  );
}

/**
 * Describes the Import Custom Glass Store Provider module.
 *
 * @remarks
 * ### `useImportCustomGlassStore`
 * Returns the raw Zustand store API. Use with `useStore(store, selector)` for reactive reads, or `store.getState()` for imperative actions. Throws when called outside `ImportCustomGlassStoreProvider`.
 */
export function useImportCustomGlassStore(): StoreApi<ImportCustomGlassStore> {
  const store = useContext(ImportCustomGlassStoreContext);
  if (store === undefined) {
    throw new Error("`useImportCustomGlassStore` must be used within `ImportCustomGlassStoreProvider`");
  }
  return store;
}
