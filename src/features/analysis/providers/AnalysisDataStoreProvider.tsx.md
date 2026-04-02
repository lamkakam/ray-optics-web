# `features/analysis/providers/AnalysisDataStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<AnalysisDataState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `AnalysisDataStoreContext`
```ts
const AnalysisDataStoreContext: React.Context<StoreApi<AnalysisDataState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<AnalysisDataStoreContext.Provider value={store}>`.

### `AnalysisDataStoreProvider`
```tsx
<AnalysisDataStoreProvider>{children}</AnalysisDataStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

### `useAnalysisDataStore`
```ts
const useAnalysisDataStore = (): StoreApi<AnalysisDataState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `AnalysisDataStoreProvider`.

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
