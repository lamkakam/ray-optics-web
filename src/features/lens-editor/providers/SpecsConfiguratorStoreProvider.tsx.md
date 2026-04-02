# `features/lens-editor/providers/SpecsConfiguratorStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<SpecsConfiguratorState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `SpecsConfiguratorStoreContext`
```ts
const SpecsConfiguratorStoreContext: React.Context<StoreApi<SpecsConfiguratorState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<SpecsConfiguratorStoreContext.Provider value={store}>`.

### `SpecsConfiguratorStoreProvider`
```tsx
<SpecsConfiguratorStoreProvider>{children}</SpecsConfiguratorStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

### `useSpecsConfiguratorStore`
```ts
const useSpecsConfiguratorStore = (): StoreApi<SpecsConfiguratorState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `SpecsConfiguratorStoreProvider`.

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
```
