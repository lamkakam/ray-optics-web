/**
# `features/analysis/providers/AnalysisDataStoreProvider.tsx`
*/
"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createAnalysisDataSlice, type AnalysisDataState } from '@/features/analysis/stores/analysisDataStore';

type ContextValue = StoreApi<AnalysisDataState> | undefined;

/**
### `AnalysisDataStoreContext`
```ts
const AnalysisDataStoreContext: React.Context<StoreApi<AnalysisDataState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<AnalysisDataStoreContext.Provider value={store}>`.
*/
export const AnalysisDataStoreContext = createContext<ContextValue>(undefined);

export interface AnalysisDataStoreProviderProps {
  children: ReactNode;
}

/**
## Purpose

Provides a single `StoreApi<AnalysisDataState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `AnalysisDataStoreProvider`
```tsx
<AnalysisDataStoreProvider>{children}</AnalysisDataStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

## Usage

In `app/layout.tsx` — mount the provider once:
```tsx
<ThemeProvider>
  <AnalysisDataStoreProvider>
    {children}
  </AnalysisDataStoreProvider>
</ThemeProvider>
```

Inside any analysis data related component — imperative access:
```tsx
import { useStore } from "zustand";
// ...
const store = useAnalysisDataStore();
const seidelData = useStore(store, (s) => s.seidelData);
store.getState().setFirstOrderData(firstOrderData);
```

In tests — inject a pre-built store:
```tsx
render(
  <AnalysisDataStoreContext.Provider value={store}>
    <MyComponent />
  </AnalysisDataStoreContext.Provider>
);
```
*/
export const AnalysisDataStoreProvider: React.FC<AnalysisDataStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<AnalysisDataState>(createAnalysisDataSlice));
  }

  return (
    <AnalysisDataStoreContext.Provider value={store}>
      {children}
    </AnalysisDataStoreContext.Provider>
  );
};

/**
### `useAnalysisDataStore`
```ts
const useAnalysisDataStore = (): StoreApi<AnalysisDataState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `AnalysisDataStoreProvider`.
*/
export const useAnalysisDataStore = (): StoreApi<AnalysisDataState> => {
  const store = useContext(AnalysisDataStoreContext);
  if (store === undefined) {
    throw new Error('`useAnalysisDataStore` must be used within `AnalysisDataStoreProvider`');
  }
  return store;
};
