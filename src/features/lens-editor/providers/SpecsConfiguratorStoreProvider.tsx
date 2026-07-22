/**
# `features/lens-editor/providers/SpecsConfiguratorStoreProvider.tsx`
*/
"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from '@/features/lens-editor/stores/specsConfiguratorStore';

type ContextValue = StoreApi<SpecsConfiguratorState> | undefined;

/**
Raw context object. Use only in tests to supply a pre-built store directly via `<SpecsConfiguratorStoreContext.Provider value={store}>`.
*/
export const SpecsConfiguratorStoreContext = createContext<ContextValue>(undefined);

export interface SpecsConfiguratorStoreProviderProps {
  children: ReactNode;
}

/**
## Purpose

Provides a single `StoreApi<SpecsConfiguratorState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Usage

In `app/layout.tsx` — mount the provider once:
```tsx
<ThemeProvider>
  <SpecsConfiguratorStoreProvider>
    {children}
  </SpecsConfiguratorStoreProvider>
</ThemeProvider>
```

Inside any Specs Configurator component — imperative access:
```tsx
import { useStore } from "zustand";
// ...
const specsConfiguratorStore = useSpecsConfiguratorStore();
const fieldSpace = useStore(specsConfiguratorStore, (s) => s.fieldSpace);
specsConfiguratorStore.getState().setField(field);
```

In tests — inject a pre-built store:
```tsx
render(
  <SpecsConfiguratorStoreContext.Provider value={store}>
    <MyComponent />
  </SpecsConfiguratorStoreContext.Provider>
);
```*/
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

/**
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `SpecsConfiguratorStoreProvider`.
*/
export const useSpecsConfiguratorStore = (): StoreApi<SpecsConfiguratorState> => {
  const store = useContext(SpecsConfiguratorStoreContext);
  if (store === undefined) {
    throw new Error('`useSpecsConfiguratorStore` must be used within `SpecsConfiguratorStoreProvider`');
  }
  return store;
};
