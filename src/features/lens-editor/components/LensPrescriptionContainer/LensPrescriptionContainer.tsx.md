# `features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionContainer.tsx`

## Purpose

Container that owns lens-prescription-specific controls (Export Python Script, auto semi-diameter switch) and orchestrates all grid editing modals for the lens prescription editor. Bridges the `lensEditorStore` to its colocated `LensPrescriptionGrid`, modal components, and row buttons under `LensPrescriptionContainer/`. Lens config actions (`Update System`, `Load Config`, `Download Config`) live in `LensEditorConfigToolbar`.

## Injected Dependencies

Lens store state is consumed via `LensEditorStoreContext`:
- `useLensEditorStore()` — imperative access (callbacks use `store.getState().*`). For reactive reads (`rows`, `autoAperture`, modal states), use it with Zustand's `useStore`.

| Dependency | Type | Description |
|------------|------|-------------|
| `getOpticalModel` | `() => OpticalModel` | Returns the current optical model snapshot for Python script export |

## Internal State

- `pythonScriptOpen: boolean` — controls `PythonScriptModal`.

## Key Behaviors

- All grid callbacks (`handleRowChange`, `handleOpenMediumModal`, etc.) are wrapped in `useCallback` with `[store]` dependency where `store = useLensEditorStore()` — accessing `store.getState()` directly prevents grid column def recreation.
- `MediumSelectorModal` is wired to `pendingMediumSelection` in the lens editor store so unconfirmed catalog-glass choices survive route changes and are only written to the object or surface row on confirm.
- When the medium modal targets the Object row, it seeds from the object row’s medium/manufacturer and disables reflective (`REFL`) selection.
- The `MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, and `DiffractionGratingModal` each use a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
- `AsphericalModal` uses UI labels (`"Conic"`, `"EvenAspherical"`, `"RadialPolynomial"`, `"XToroid"`, `"YToroid"`), while this container maps them to the domain `Surface["aspherical"]` union.
- `getInitialAsphericalType`, `getInitialAsphericalCoefficients`, and `getInitialToricSweepRadiusOfCurvature` preload modal state from the selected row so toroidal and radial polynomial surfaces reopen with the correct draft values.
- `DiffractionGratingModal` only applies to `surface` rows and writes `surface.diffractionGrating` back into the row state on confirm.
- `PythonScriptModal` receives an empty string for `script` when closed, generating the script only when open.
- The visible `Set auto semi-diameter:` label is paired with an Auto/Manual switch that updates `autoAperture` in the store and passes `semiDiameterReadonly` to the grid.
- `LensPrescriptionGrid` and `PythonScriptModal` are internal to this directory; the nested barrel only exports components used outside `LensPrescriptionContainer/` (`MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, `DiffractionGratingModal`, and `GridRowButtons`). `ConfirmImportModal` remains colocated here but is used by `LensEditorConfigToolbar`.

## Usages

- Mounted once in the main page inside the `BottomDrawer` tabs.
