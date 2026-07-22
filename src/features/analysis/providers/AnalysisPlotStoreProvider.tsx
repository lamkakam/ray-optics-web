/**
# `features/analysis/providers/AnalysisPlotStoreProvider.tsx`
*/
"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createAnalysisPlotSlice, type AnalysisPlotState } from '@/features/analysis/stores/analysisPlotStore';

type ContextValue = StoreApi<AnalysisPlotState> | undefined;

/**
### `AnalysisPlotStoreContext`
```ts
const AnalysisPlotStoreContext: React.Context<StoreApi<AnalysisPlotState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<AnalysisPlotStoreContext.Provider value={store}>`.
*/
export const AnalysisPlotStoreContext = createContext<ContextValue>(undefined);

export interface AnalysisPlotStoreProviderProps {
  children: ReactNode;
}

/**
## Purpose

Provides a single `StoreApi<AnalysisPlotState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `AnalysisPlotStoreProvider`
```tsx
<AnalysisPlotStoreProvider>{children}</AnalysisPlotStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

## Usage

In `app/layout.tsx` — mount the provider once:
```tsx
<ThemeProvider>
  <AnalysisPlotStoreProvider>
    {children}
  </AnalysisPlotStoreProvider>
</ThemeProvider>
```

Inside any analysis plot component — imperative access:
```tsx
import { useStore } from "zustand";
// ...
const store = useAnalysisPlotStore();
const selectedPlotType = useStore(store, (s) => s.selectedPlotType);
store.getState().setSelectedPlotType(plotType);
```

In tests — inject a pre-built store:
```tsx
render(
  <AnalysisPlotStoreContext.Provider value={store}>
    <MyComponent />
  </AnalysisPlotStoreContext.Provider>
);
```
*/
export const AnalysisPlotStoreProvider: React.FC<AnalysisPlotStoreProviderProps> = ({ children }) => {
  const [store, setStore] = useState<ContextValue>(undefined);

  if (store === undefined) {
    setStore(createStore<AnalysisPlotState>(createAnalysisPlotSlice));
  }

  return (
    <AnalysisPlotStoreContext.Provider value={store}>
      {children}
    </AnalysisPlotStoreContext.Provider>
  );
};

/**
### `useAnalysisPlotStore`
```ts
const useAnalysisPlotStore = (): StoreApi<AnalysisPlotState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `AnalysisPlotStoreProvider`.
*/
export const useAnalysisPlotStore = (): StoreApi<AnalysisPlotState> => {
  const store = useContext(AnalysisPlotStoreContext);
  if (store === undefined) {
    throw new Error('`useAnalysisPlotStore` must be used within `AnalysisPlotStoreContext`');
  }
  return store;
};
