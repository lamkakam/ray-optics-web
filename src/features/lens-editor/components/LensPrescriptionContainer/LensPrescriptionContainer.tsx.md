# `features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionContainer.tsx`

## Purpose

Container that owns lens-prescription-specific controls (Export Python Script, Formatting, auto semi-diameter switch) and orchestrates all grid editing modals for the lens prescription editor. Bridges the `lensEditorStore` to its colocated `LensPrescriptionGrid`, modal components, and row buttons under `LensPrescriptionContainer/`. Lens config actions (`Update System`, `Load Config`, `Download Config`) live in `LensEditorConfigToolbar`.

## Injected Dependencies

Lens store state is consumed via `LensEditorStoreContext`:
- `useLensEditorStore()` — imperative access (callbacks use `store.getState().*`). For reactive reads (`rows`, `autoAperture`, modal states), use it with Zustand's `useStore`.

| Dependency | Type | Description |
|------------|------|-------------|
| `getOpticalModel` | `() => OpticalModel` | Returns the current optical model snapshot for Python script export |

## Internal State

- `pythonScriptOpen: boolean` — controls `PythonScriptModal`.
- `formattingOpen: boolean` — controls `FormattingModal`.
- `formattingError: string | undefined` — controls the shared `ErrorModal` shown when formatting validation fails.
- `pendingReferenceSurfaceRows: GridRow[] | undefined` — holds a successful Reverse result while the user chooses whether to insert a flat air reference surface.

## Key Behaviors

- All grid callbacks (`handleRowChange`, `handleOpenMediumModal`, etc.) are wrapped in `useCallback` with `[store]` dependency where `store = useLensEditorStore()` — accessing `store.getState()` directly prevents grid column def recreation.
- `MediumSelectorModal` is wired to `pendingMediumSelection` in the lens editor store so unconfirmed catalog-glass choices survive route changes and are only written to the object or surface row on confirm.
- When the medium modal targets the Object row, it seeds from the object row’s medium/manufacturer and disables reflective (`REFL`) selection.
- The `MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, `DiffractionGratingModal`, and `ApertureModal` each use a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
- `AsphericalModal` uses UI labels (`"Conic"`, `"EvenAspherical"`, `"RadialPolynomial"`, `"XToroid"`, `"YToroid"`), while this container maps them to the domain `Surface["aspherical"]` union.
- `getInitialAsphericalType`, `getInitialAsphericalCoefficients`, and `getInitialToricSweepRadiusOfCurvature` preload modal state from the selected row so toroidal and radial polynomial surfaces reopen with the correct draft values.
- `DiffractionGratingModal` only applies to `surface` rows and writes `surface.diffractionGrating` back into the row state on confirm.
- `ApertureModal` only applies to `surface` rows. The selected row's `semiDiameter` is passed so annular clear apertures can validate their central obstruction radius against the outer clear aperture radius. Confirm writes the selected circular, annular, or rectangular `clear_aperture`; it writes an explicit circular or rectangular `edge_aperture` when selected and clears `edge_aperture` when Edge Aperture follows Clear Aperture. Rectangular clear aperture confirm also stores `semiDiameter: 0` so the semi-diameter cell remains blank and non-editable while the rectangle owns the aperture size.
- `PythonScriptModal` receives an empty string for `script` when closed, generating the script only when open.
- The `Formatting` toolbar button opens `FormattingModal` beside `Export Python Script`. Successful Scale confirms call `store.getState().setRows(updatedRows)` immediately so the prescription revision and Optimization sync policy follow normal prescription mutation behavior.
- Successful Reverse confirms first check the resulting first physical surface. If it has nonzero tilt or decenter, the container closes `FormattingModal`, stores the reversed rows in `pendingReferenceSurfaceRows`, and opens `AddReferenceSurfaceModal` without mutating the store.
- In `AddReferenceSurfaceModal`, `No` applies the reversed rows unchanged, while `Yes` inserts a flat zero-thickness air reference surface immediately after Object and then applies rows.
- `FormattingModal` is rendered only while `formattingOpen` is true. Closing it via Cancel or successful Confirm unmounts its local draft controls, so reopening starts from defaults derived from the current prescription rows.
- Scale and Reverse formatting ranges are local to one open modal session, so switching modes during that session restores the last range used for each mode.
- Formatting errors are surfaced through the shared `ErrorModal`; failed formatting leaves the existing store rows unchanged.
- The visible `Set auto semi-diameter:` label is paired with an Auto/Manual switch that updates `autoAperture` in the store and passes `semiDiameterReadonly` to the grid.
- `LensPrescriptionGrid`, `PythonScriptModal`, `FormattingModal`, and `AddReferenceSurfaceModal` are internal to this directory; the nested barrel only exports components used outside `LensPrescriptionContainer/` (`MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, `DiffractionGratingModal`, and `GridRowButtons`). `ConfirmImportModal` remains colocated here but is used by `LensEditorConfigToolbar`.

## Usages

- Mounted once in the main page inside the `BottomDrawer` tabs.
