# `features/analysis/providers/AnalysisPlotStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<AnalysisPlotState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `AnalysisPlotStoreContext`
```ts
const AnalysisPlotStoreContext: React.Context<StoreApi<AnalysisPlotState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<AnalysisPlotStoreContext.Provider value={store}>`.

### `AnalysisPlotStoreProvider`
```tsx
<AnalysisPlotStoreProvider>{children}</AnalysisPlotStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

### `useAnalysisPlotStore`
```ts
const useAnalysisPlotStore = (): StoreApi<AnalysisPlotState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `AnalysisPlotStoreProvider`.

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
