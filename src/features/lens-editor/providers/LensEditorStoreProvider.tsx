/**
# `features/lens-editor/providers/LensEditorStoreProvider.tsx`
*/
"use client";

import { createContext, type ReactNode, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { createLensEditorSlice, type LensEditorState } from '@/features/lens-editor/stores/lensEditorStore';

type ContextValue = StoreApi<LensEditorState> | undefined;

/**
### `LensEditorStoreContext`
```ts
const LensEditorStoreContext: React.Context<StoreApi<LensEditorState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<LensEditorStoreContext.Provider value={store}>`.
*/
export const LensEditorStoreContext = createContext<ContextValue>(undefined);

export interface LensEditorStoreProviderProps {
  children: ReactNode;
}

/**
## Purpose

Provides a single `StoreApi<LensEditorState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `LensEditorStoreProvider`
```tsx
<LensEditorStoreProvider>{children}</LensEditorStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

## Usage

In `app/layout.tsx` — mount the provider once:
```tsx
<ThemeProvider>
  <LensEditorStoreProvider>
    {children}
  </LensEditorStoreProvider>
</ThemeProvider>
```

Inside any lens-editor component — imperative access:
```tsx
import { useStore } from "zustand";
// ...
const lensStore = useLensEditorStore();
const rows = useStore(lenStore, (s) => s.rows);
lensStore.getState().updateRow(id, patch);
```

In tests — inject a pre-built store:
```tsx
render(
  <LensEditorStoreContext.Provider value={store}>
    <MyComponent />
  </LensEditorStoreContext.Provider>
);
```
*/
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

/**
### `useLensEditorStore`
```ts
const useLensEditorStore = (): StoreApi<LensEditorState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `LensEditorStoreProvider`.
*/
export const useLensEditorStore = (): StoreApi<LensEditorState> => {
  const store = useContext(LensEditorStoreContext);
  if (store === undefined) {
    throw new Error('`useLensEditorStore` must be used within `LensEditorStoreProvider`');
  }
  return store;
};
