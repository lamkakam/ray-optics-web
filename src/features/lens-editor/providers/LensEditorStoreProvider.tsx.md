# `features/lens-editor/providers/LensEditorStoreProvider.tsx`

## Purpose

Provides a single `StoreApi<LensEditorState>` instance to the entire component tree via React context. Mounted once in `app/layout.tsx` so the store persists across all routes.

## Exports

### `LensEditorStoreContext`
```ts
const LensEditorStoreContext: React.Context<StoreApi<LensEditorState> | undefined>
```
Raw context object. Use only in tests to supply a pre-built store directly via `<LensEditorStoreContext.Provider value={store}>`.

### `LensEditorStoreProvider`
```tsx
<LensEditorStoreProvider>{children}</LensEditorStoreProvider>
```
Creates the store once (singleton) and supplies it to all descendants.

### `useLensEditorStore`
```ts
const useLensEditorStore = (): StoreApi<LensEditorState>
```
Returns the raw `store` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. For reactive values, use it with Zustand's `useStore`. Must be called inside `LensEditorStoreProvider`.

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
