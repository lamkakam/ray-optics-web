# `features/analysis/providers/LensLayoutImageStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<LensLayoutImageState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `LensLayoutImageStoreContext`
```ts
const LensLayoutImageStoreContext: React.Context<StoreApi<LensLayoutImageState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<LensLayoutImageStoreContext.Provider value={store}>`.

### `LensLayoutImageStoreProvider`
```tsx
<LensLayoutImageStoreProvider>{children}</LensLayoutImageStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

### `useLensLayoutImageStore`
```ts
const useLensLayoutImageStore = (): StoreApi<LensLayoutImageState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `LensLayoutImageStoreProvider`.

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
```
