/**
# `features/analysis/providers/LensLayoutImageStoreProvider.tsx`
*/
"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createLensLayoutImageSlice, type LensLayoutImageState } from '@/features/analysis/stores/lensLayoutImageStore';

type ContextValue = StoreApi<LensLayoutImageState> | undefined;

/**
Raw context object. Use only in tests to supply a pre-built store directly via `<LensLayoutImageStoreContext.Provider value={store}>`.
*/
export const LensLayoutImageStoreContext = createContext<ContextValue>(undefined);

export interface LensLayoutImageStoreProviderProps {
  children: ReactNode;
}

/**
## Purpose

Provides a single `StoreApi<LensLayoutImageState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Usage

In `app/layout.tsx` — mount the provider once:
```tsx
<ThemeProvider>
  <LensLayoutImageStoreProvider>
    {children}
  </LensLayoutImageStoreProvider>
</ThemeProvider>
```

Inside any lens layout plot related related component — imperative access:
```tsx
import { useStore } from "zustand";
// ...
const store = useLensLayoutImageStore();
const layoutImage = useStore(store, (s) => s.layoutImage);
store.getState().setLayoutLoading(loading);
```

In tests — inject a pre-built store:
```tsx
render(
  <LensLayoutImageStoreContext.Provider value={store}>
    <MyComponent />
  </LensLayoutImageStoreContext.Provider>
);
```*/
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

/**
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `LensLayoutImageStoreProvider`.
*/
export const useLensLayoutImageStore = (): StoreApi<LensLayoutImageState> => {
  const store = useContext(LensLayoutImageStoreContext);
  if (store === undefined) {
    throw new Error('`useLensLayoutImageStore` must be used within `LensLayoutImageStoreProvider`');
  }
  return store;
};
