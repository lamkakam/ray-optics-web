# `features/lens-editor/components/BottomDrawerContainer.tsx`

## Purpose

Container component that composes the three drawer tabs (System Specs, Prescription, Focusing) and renders them inside `BottomDrawer`. Extracts `drawerTabs` construction from `page.tsx` to encapsulate bottom-drawer concerns.

## Props

```ts
interface BottomDrawerContainerProps {
  specsStore: StoreApi<SpecsConfigurerState>;
  getOpticalModel: () => OpticalModel;
  onImportJson: (data: OpticalModel) => void;
  onUpdateSystem: () => Promise<void>;
  isReady: boolean;
  computing: boolean;
  proxy: PyodideWorkerAPI | undefined;
  onError: () => void;
  draggable: boolean;
}
```

`LensPrescriptionContainer` and `FocusingContainer` access the lens store via `LensEditorStoreContext` (no prop needed).

| Prop | Type | Required | Description |
|---|---|---|---|
| `specsStore` | `StoreApi<SpecsConfigurerState>` | Yes | Passed to `SpecsConfigurerContainer` and `FocusingContainer` |
| `getOpticalModel` | `() => OpticalModel` | Yes | Callback to build the current optical model from store state |
| `onImportJson` | `(data: OpticalModel) => void` | Yes | Called when user imports a JSON lens file |
| `onUpdateSystem` | `() => Promise<void>` | Yes | Triggers a full system update (submit) |
| `isReady` | `boolean` | Yes | Whether Pyodide is initialized |
| `computing` | `boolean` | Yes | Whether a computation is in progress |
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy |
| `onError` | `() => void` | Yes | Called when an async operation throws |
| `draggable` | `boolean` | Yes | Whether the drawer is draggable (true for LG layout, false for SM) |

## Internal Logic

Builds a `tabs` array via `useMemo` containing:
1. **System Specs** — `<SpecsConfigurerContainer store={specsStore} />`
2. **Prescription** — `<LensPrescriptionContainer .../>` with `isUpdateSystemDisabled={!isReady || computing}`
3. **Focusing** — `<FocusingContainer .../>`

Renders `<BottomDrawer tabs={tabs} draggable={draggable} />`.

## Usages

Used in `app/page.tsx` (twice: once with `draggable={true}` for LG layout, once with `draggable={false}` for SM layout) replacing the inlined `drawerTabs` useMemo and `<BottomDrawer>` calls.
