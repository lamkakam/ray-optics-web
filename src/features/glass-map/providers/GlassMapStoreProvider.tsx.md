# `features/glass-map/providers/GlassMapStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<GlassMapStore>` instance to the glass-map subtree via React context. The provider creates the store once per mount and can seed it with an initial route intent.

## Exports

### `GlassMapStoreContext`
```ts
const GlassMapStoreContext: React.Context<StoreApi<GlassMapStore> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<GlassMapStoreContext.Provider value={store}>`.

### `GlassMapStoreProvider`
```tsx
<GlassMapStoreProvider initialRouteIntent={routeIntent}>{children}</GlassMapStoreProvider>
```
Creates the store once per provider mount and supplies it to descendants.

### `useGlassMapStore`
```ts
const useGlassMapStore = (): StoreApi<GlassMapStore>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `GlassMapStoreProvider`.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Provider subtree |
| `initialRouteIntent` | `GlassMapRouteIntent \| undefined` | Optional one-time route intent passed into `createGlassMapSlice(initialRouteIntent)` |

## Usage

In `app/glass-map/page.tsx` — mount the provider around the page view:
```tsx
<GlassMapStoreProvider key={storeKey} initialRouteIntent={routeIntent}>
  <GlassMapView proxy={proxy} isReady={isReady} routeIntent={routeIntent} />
</GlassMapStoreProvider>
```

Inside `GlassMapView` — access the store:
```tsx
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { useStore } from "zustand";
// ...
const store = useGlassMapStore();
const catalogsData = useStore(store, (s) => s.catalogsData);
store.getState().setCatalogsData(data);
```

In tests — inject a pre-built store:
```tsx
render(
  <GlassMapStoreContext.Provider value={store}>
    <GlassMapView proxy={...} isReady={...} />
  </GlassMapStoreContext.Provider>
);
```
