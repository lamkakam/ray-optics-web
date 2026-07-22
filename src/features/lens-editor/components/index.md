# `features/lens-editor/components/`

All components (composite + container + domain cells) for the lens editor feature. Each component lives in its own directory with a source file, matching spec, `index.ts` barrel, and colocated tests when present.

## Domain Grid Cells

- [AsphericalCell](./AsphericalCell/AsphericalCell.tsx) — Compatibility export for the shared aspherical prescription cell
- [DecenterCell](./DecenterCell/DecenterCell.tsx) — Compatibility export for the shared decenter prescription cell
- [DiffractionGratingCell](./DiffractionGratingCell/DiffractionGratingCell.tsx) — Compatibility export for the shared diffraction grating prescription cell
- [MediumCell](./MediumCell/MediumCell.tsx) — Compatibility export for the shared medium prescription cell

## Lens Prescription Components

- [LensPrescriptionContainer](./LensPrescriptionContainer/LensPrescriptionContainer.tsx) — Manages lens prescription grid state, Python export, and surface updates
- [LensPrescriptionGrid](./LensPrescriptionContainer/LensPrescriptionGrid/LensPrescriptionGrid.tsx) — Internal AG Grid table for editing optical surfaces
- [GridRowButtons](./LensPrescriptionContainer/GridRowButtons/GridRowButtons.tsx) — Action buttons for row operations (insert, delete); exported through `LensPrescriptionContainer`
- [AsphericalModal](./LensPrescriptionContainer/AsphericalModal/AsphericalModal.tsx) — Modal for setting aspherical coefficients; exported through `LensPrescriptionContainer`
- [DecenterModal](./LensPrescriptionContainer/DecenterModal/DecenterModal.tsx) — Modal for setting decentering and tilting; exported through `LensPrescriptionContainer`
- [DiffractionGratingModal](./LensPrescriptionContainer/DiffractionGratingModal/DiffractionGratingModal.tsx) — Modal for setting diffraction grating parameters; exported through `LensPrescriptionContainer`
- [MediumSelectorModal](./LensPrescriptionContainer/MediumSelectorModal/MediumSelectorModal.tsx) — Modal for selecting optical media; exported through `LensPrescriptionContainer`
- [ConfirmImportModal](./LensPrescriptionContainer/ConfirmImportModal/ConfirmImportModal.tsx) — Internal confirmation dialog before importing a lens file
- [PythonScriptModal](./LensPrescriptionContainer/PythonScriptModal/PythonScriptModal.tsx) — Internal modal for viewing/editing Python scripts
- [FormattingModal](./LensPrescriptionContainer/FormattingModal/FormattingModal.tsx) — Internal modal for scaling or reversing selected prescription rows
- [AddReferenceSurfaceModal](./LensPrescriptionContainer/AddReferenceSurfaceModal/AddReferenceSurfaceModal.tsx) — Internal Reverse follow-up prompt for adding a flat air reference surface

## Specs & Configuration

- [SpecsConfiguratorPanel](./SpecsConfiguratorPanel/SpecsConfiguratorPanel.tsx) — UI for setting optical specs (pupil, field, wavelengths)
- [LensEditorConfigToolbar](./LensEditorConfigToolbar/LensEditorConfigToolbar.tsx) — Lens Editor-level Update/Load/Download config actions shown before analysis controls
- [FirstOrderChips](./FirstOrderChips/FirstOrderChips.tsx) — Chips showing first-order optical data (EFL, F#, BFL, etc.)
- [FocusingPanel](./FocusingPanel/FocusingPanel.tsx) — Controls for focusing algorithms and best-focus thickness
- [ImageReferencePanel](./ImageReferencePanel/ImageReferencePanel.tsx) — Selects the app-wide image reference convention from the Lens Editor drawer

## Visualisation

- [LensLayoutPanel](./LensLayoutPanel/LensLayoutPanel.tsx) — Shows 2D cross-section of the optical system

## Modals

- [FieldConfigModal](./FieldConfigModal/FieldConfigModal.tsx) — Modal for configuring field angles/heights
- [WavelengthConfigModal](./WavelengthConfigModal/WavelengthConfigModal.tsx) — Modal for setting wavelengths and weights
- [ZernikeTermsModal](./ZernikeTermsModal/ZernikeTermsModal.tsx) — Modal for displaying Zernike polynomial terms
- [SeidelAberrModal](./SeidelAberrModal/SeidelAberrModal.tsx) — Modal for displaying 3rd-order Seidel aberrations
- [ConfirmOverwriteModal](./ConfirmOverwriteModal/ConfirmOverwriteModal.tsx) — Compatibility re-export for the shared example-system overwrite confirmation modal

## Containers

- [SpecsConfiguratorContainer](./SpecsConfiguratorContainer/SpecsConfiguratorContainer.tsx) — Manages optical specs configuration state
- [FocusingContainer](./FocusingContainer/FocusingContainer.tsx) — Manages focusing algorithm execution
- [BottomDrawerContainer](./BottomDrawerContainer/BottomDrawerContainer.tsx) — Manages bottom drawer open/close state
