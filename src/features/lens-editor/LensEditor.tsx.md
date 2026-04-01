# LensEditor.tsx

## Purpose
Page-level component (`"use client"`). Owns the home-view lens editor workflow: example system selection, submit/compute, Seidel/Zernike modal state, and layout for LG and SM breakpoints. Calls `useScreenBreakpoint()` internally to derive `isLG`. Delegates the error modal to `page.tsx` via `onError`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `specsStore` | `StoreApi<SpecsConfigurerState>` | Zustand store for optical specs |
| `analysisPlotStore` | `StoreApi<AnalysisPlotState>` | Zustand store for analysis plot |
| `lensLayoutImageStore` | `StoreApi<LensLayoutImageState>` | Zustand store for lens layout image/loading |
| `analysisDataStore` | `StoreApi<AnalysisDataState>` | Zustand store for seidel and first-order data |
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
- From `analysisPlotStore`: `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`
- From `lensLayoutImageStore`: `layoutImage`, `layoutLoading`
- From `analysisDataStore`: `firstOrderData`, `seidelData`
- From `LensEditorStoreContext` (via `useLensEditorStore`): `committedOpticalModel`

Imperative access to lens state is via `const lensStoreApi = useLensEditorStoreApi()` (stable, non-reactive).

## Callbacks
- `handleExampleChange` — sets `pendingExample` when a dropdown option is selected
- `handleExampleCancel` — clears `pendingExample`, resets dropdown
- `handleExampleConfirm` — loads example into stores, calls `handleSubmit`
- `handleSubmit` — builds OpticalModel, calls proxy, updates all state; calls `onError()` on failure
- `handleFetchZernikeData` — fetches Zernike coefficients for ZernikeTermsModal; uses `lensStoreApi.getState()` for non-reactive access
- `getOpticalModel` — builds current OpticalModel from stores (for BottomDrawerContainer); uses `lensStoreApi.getState()`
- `handleImportJson` — loads imported OpticalModel into stores via `lensStoreApi.getState()`

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
- `onError` delegates to `page.tsx`'s `ErrorModal` — the error modal itself is NOT rendered here
- `zernikeModal` renders `specsStore.getState().getFieldOptions()` as a snapshot (non-reactive) — intentional

## Usages

```tsx
// In app/page.tsx (lensStore comes from LensEditorStoreProvider in layout.tsx)
const lensEditor = (
  <LensEditor
    specsStore={specsStore}
    analysisPlotStore={analysisPlotStore}
    lensLayoutImageStore={lensLayoutImageStore}
    analysisDataStore={analysisDataStore}
    proxy={proxy}
    isReady={isReady}
    onError={() => setErrorModalOpen(true)}
  />
);

// Then rendered conditionally:
{currentView === "home" && lensEditor}
```
