"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { createStore, type StoreApi } from "zustand";
import {
  createImportCustomGlassSlice,
  type ImportCustomGlassStore,
} from "@/features/import-custom-glass/stores/importCustomGlassStore";

type ContextValue = StoreApi<ImportCustomGlassStore> | undefined;

export const ImportCustomGlassStoreContext = createContext<ContextValue>(undefined);

export interface ImportCustomGlassStoreProviderProps {
  readonly children: ReactNode;
}

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

export function useImportCustomGlassStore(): StoreApi<ImportCustomGlassStore> {
  const store = useContext(ImportCustomGlassStoreContext);
  if (store === undefined) {
    throw new Error("`useImportCustomGlassStore` must be used within `ImportCustomGlassStoreProvider`");
  }
  return store;
}
