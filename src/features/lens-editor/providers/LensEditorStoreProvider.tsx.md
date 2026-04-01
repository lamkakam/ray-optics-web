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
Creates the store once (via `useState`) and supplies it to all descendants.

### `useLensEditorStore`
```ts
const useLensEditorStore = <T,>(selector: (state: LensEditorState) => T): T
```
Reactive selector hook. Re-renders the calling component whenever the selected slice changes. Must be called inside `LensEditorStoreProvider`.

### `useLensEditorStoreApi`
```ts
const useLensEditorStoreApi = (): StoreApi<LensEditorState>
```
Returns the raw `StoreApi` for imperative access (`store.getState().*`) without subscribing to state changes. Use inside callbacks and effects where you need stable, non-reactive access. Must be called inside `LensEditorStoreProvider`.

## Usage

```tsx
// app/layout.tsx — mount the provider once
<ThemeProvider>
  <LensEditorStoreProvider>
    {children}
  </LensEditorStoreProvider>
</ThemeProvider>

// Inside any lens-editor component — reactive read
const rows = useLensEditorStore((s) => s.rows);

// Inside any lens-editor component — imperative access
const lensStoreApi = useLensEditorStoreApi();
lensStoreApi.getState().updateRow(id, patch);

// In tests — inject a pre-built store
render(
  <LensEditorStoreContext.Provider value={store}>
    <MyComponent />
  </LensEditorStoreContext.Provider>
);
```
