# `features/import-custom-glass/providers/ImportCustomGlassStoreProvider.tsx`

## Purpose
Provides one `StoreApi<ImportCustomGlassStore>` instance through React context. The provider is mounted in `app/layout.tsx` so readonly custom-glass table sort and filter state persists while the app root remains mounted.

## Exports

### `ImportCustomGlassStoreContext`
Raw context object for tests that need to inject a pre-built store.

### `ImportCustomGlassStoreProvider`
Creates the store once per provider mount and supplies it to descendants.

### `useImportCustomGlassStore`
Returns the raw Zustand store API. Use with `useStore(store, selector)` for reactive reads, or `store.getState()` for imperative actions. Throws when called outside `ImportCustomGlassStoreProvider`.

## Usage
Mounted at the app root beside the other feature store providers:

```tsx
<GlassMapStoreProvider>
  <ImportCustomGlassStoreProvider>
    <OptimizationStoreProvider>
      <AppShell>{children}</AppShell>
    </OptimizationStoreProvider>
  </ImportCustomGlassStoreProvider>
</GlassMapStoreProvider>
```
