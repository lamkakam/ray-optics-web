# LensEditor.tsx

## Purpose
Page-level component (`"use client"`). Owns the home-view lens editor workflow: example system selection, submit/compute, Seidel/Zernike modal state, and layout for LG and SM breakpoints. Calls `useScreenBreakpoint()` internally to derive `isLG`. Delegates the error modal to `page.tsx` via `onError`.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `specsStore` | `StoreApi<SpecsConfigurerState>` | Zustand store for optical specs |
| `lensStore` | `StoreApi<LensEditorState>` | Zustand store for lens prescription |
| `analysisPlotStore` | `StoreApi<AnalysisPlotState>` | Zustand store for analysis plot |
| `lensLayoutImageStore` | `StoreApi<LensLayoutImageState>` | Zustand store for lens layout image/loading |
| `proxy` | `PyodideWorkerAPI \| undefined` | Pyodide worker proxy (undefined until ready) |
| `isReady` | `boolean` | Whether Pyodide is initialised |
| `onError` | `() => void` | Called on submit error; opens page-level error modal |

## State
| State | Type | Description |
|-------|------|-------------|
| `computing` | `boolean` | Submit in-progress flag |
| `seidelData` | `SeidelData \| undefined` | 3rd-order Seidel data (populated after submit) |
| `seidelModalOpen` | `boolean` | Seidel modal visibility |
| `zernikeModalOpen` | `boolean` | Zernike modal visibility |
| `pendingExample` | `string \| undefined` | Name of example system pending confirmation |

## Derived Store State
Read reactively via `useStore`:
- From `analysisPlotStore`: `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`
- From `lensLayoutImageStore`: `layoutImage`, `layoutLoading`
- From `lensStore`: `firstOrderData`

## Callbacks
- `handleExampleChange` — sets `pendingExample` when a dropdown option is selected
- `handleExampleCancel` — clears `pendingExample`, resets dropdown
- `handleExampleConfirm` — loads example into stores, calls `handleSubmit`
- `handleSubmit` — builds OpticalModel, calls proxy, updates all state; calls `onError()` on failure
- `handleFetchZernikeData` — fetches Zernike coefficients for ZernikeTermsModal
- `getOpticalModel` — builds current OpticalModel from stores (for BottomDrawerContainer)
- `handleImportJson` — loads imported OpticalModel into stores

## Layout

### LG (`isLG === true`)
- Controls row: example dropdown + Seidel/Zernike buttons
- First-order chips row (border-bottom)
- Split row: LensLayoutPanel (65%) | AnalysisPlotContainer (35%)
- BottomDrawerContainer (`draggable={true}`)
- ConfirmOverwriteModal, SeidelAberrModal, ZernikeTermsModal

### SM (`isLG === false`)
- Controls section: dropdown + Seidel/Zernike buttons + first-order chips
- `data-testid="lens-layout-container"` wrapping LensLayoutPanel
- `data-testid="analysis-plot-container"` wrapping AnalysisPlotContainer
- BottomDrawerContainer (`draggable={false}`)
- ConfirmOverwriteModal, SeidelAberrModal, ZernikeTermsModal

## Notes
- `onError` delegates to `page.tsx`'s `ErrorModal` — the error modal itself is NOT rendered here
- `zernikeModal` renders `specsStore.getState().getFieldOptions()` as a snapshot (non-reactive) — intentional
