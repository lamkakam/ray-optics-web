# LensEditor.tsx

## Purpose
Page-level component (`"use client"`). Owns the home-view lens editor workflow: example system selection, submit/compute, Seidel/Zernike modal state, and layout for LG and SM breakpoints. Calls `useScreenBreakpoint()` internally to derive `isLG`. Delegates the error modal to `page.tsx` via `onError`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `proxy` | `PyodideWorkerAPI \| undefined` | Pyodide worker proxy (undefined until ready) |
| `isReady` | `boolean` | Whether Pyodide is initialised |
| `onError` | `() => void` | Called on submit error; opens page-level error modal |

## State
| State | Type | Description |
|-------|------|-------------|
| `computing` | `boolean` | Submit in-progress flag |
| `seidelModalOpen` | `boolean` | Seidel modal visibility |
| `zernikeModalOpen` | `boolean` | Zernike modal visibility |
| `pendingExample` | `string \| undefined` | Name of example system pending confirmation |

## Derived Store State
Read reactively via `useStore` / `useLensEditorStore`:
- From `useAnalysisPlotStore()`: `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`
- From `useLensLayoutImageStore()`: `layoutImage`, `layoutLoading`
- From `useAnalysisDataStore()`: `firstOrderData`, `seidelData`
- From `useLensEditorStore()`: `committedOpticalModel`

Imperative access to actions is via the provider hooks (`useLensEditorStore`, `useSpecsConfiguratorStore`, `useAnalysisPlotStore`, `useAnalysisDataStore`, `useLensLayoutImageStore`) and then `store.getState()`.

## Callbacks
- `handleExampleChange` — sets `pendingExample` when a dropdown option is selected
- `handleExampleCancel` — clears `pendingExample`, resets dropdown
- `handleExampleConfirm` — loads example into stores, calls `handleSubmit`
- `handleSubmit` — builds OpticalModel, calls proxy, updates all state; calls `onError()` on failure
- `handleFetchZernikeData` — fetches Zernike coefficients for `ZernikeTermsModal` from the committed optical model
- `getOpticalModel` — builds the current `OpticalModel` snapshot from the provider-backed stores
- `handleImportJson` — loads an imported `OpticalModel` into the specs and lens-editor stores

## Layout

### LG (`isLG === true`)
- Controls row: example dropdown + Seidel/Zernike buttons; `border-b` applied here when `firstOrderData` is undefined. `seidelButton` is guarded by `seidelData`; `zernikeButton` is guarded by `committedOpticalModel` (not `seidelData`)
- First-order chips row (border-bottom) — only rendered when `firstOrderData` is defined
- Split row: LensLayoutPanel (65%) | AnalysisPlotContainer (35%); the analysis panel wrapper has `overflow-hidden` (`data-testid="lg-analysis-plot-panel"`) to prevent content from bleeding over the BottomDrawer when viewport height is small
- BottomDrawerContainer (`draggable={true}`)
- ConfirmOverwriteModal, SeidelAberrModal, ZernikeTermsModal

### SM (`isLG === false`)
- Outer scroll wrapper: `data-testid="sm-scroll-container"` with `flex-1 min-h-0 overflow-y-auto flex flex-col` — makes all content scrollable on small screens
- Controls section: dropdown + Seidel/Zernike buttons + first-order chips (chips wrapper only renders when `firstOrderData` is defined; dropdown `mb-2` only applied when `seidelData` or `firstOrderData` is present)
- `data-testid="lens-layout-container"` wrapping LensLayoutPanel
- `data-testid="analysis-plot-container"` wrapping AnalysisPlotContainer
- BottomDrawerContainer (`draggable={false}`)
- ConfirmOverwriteModal, SeidelAberrModal, ZernikeTermsModal

## Notes
- `onError` delegates to `app/(app-shell)/layout.tsx`, which owns the shared `ErrorModal`
- `ZernikeTermsModal` receives `specsStore.getState().getFieldOptions()` / `getWavelengthOptions()` as snapshots — intentional

## Usages

```tsx
// In app/(app-shell)/page.tsx
const lensEditor = (
  <LensEditor
    proxy={proxy}
    isReady={isReady}
    onError={() => setErrorModalOpen(true)}
  />
);
```
