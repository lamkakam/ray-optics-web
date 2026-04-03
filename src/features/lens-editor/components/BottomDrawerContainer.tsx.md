# `features/lens-editor/components/BottomDrawerContainer.tsx`

## Purpose

Container component that composes the three drawer tabs (System Specs, Prescription, Focusing) and renders them inside `BottomDrawer`. Extracts `drawerTabs` construction from `page.tsx` to encapsulate bottom-drawer concerns.

## Props

```ts
interface BottomDrawerContainerProps {
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

`SpecsConfiguratorContainer`, `LensPrescriptionContainer`, and `FocusingContainer` read their stores through the provider hooks, so this container only forwards the callbacks and worker state they still need.

| Prop | Type | Required | Description |
|---|---|---|---|
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
1. **System Specs** — `<SpecsConfiguratorContainer />`
2. **Prescription** — `<LensPrescriptionContainer .../>` with `isUpdateSystemDisabled={!isReady || computing}`
3. **Focusing** — `<FocusingContainer .../>`

Reads `activeBottomDrawerTabId` from the lens editor Zustand store and passes it to `BottomDrawer` as a controlled tab value. On tab change, writes the selected tab id back into `setActiveBottomDrawerTabId`, allowing Lens Editor to restore the previously selected drawer tab after navigation.

Reads `bottomDrawerHeight` from the lens editor store via `lensStore.getState()` and forwards it to `BottomDrawer` as `initialHeight`. This is a persistence snapshot rather than a reactive subscription, so drag-resize updates do not cause the container to re-render while the drawer is mounted.

Passes `onHeightCommit={(height) => lensStore.getState().setBottomDrawerHeight(height)}` so the most recent settled drawer height is restored after the Lens Editor route remounts.

Renders `<BottomDrawer tabs={tabs} draggable={draggable} activeTabId={...} onTabChange={...} initialHeight={...} onHeightCommit={...} />`.

## Usages

Used in `LensEditor.tsx` for both LG and SM layouts, with `draggable` toggled by breakpoint.
