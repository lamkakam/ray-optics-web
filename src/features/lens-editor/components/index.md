# `features/lens-editor/components/`

All components (composite + container + domain cells) for the lens editor feature. Each component lives in its own directory with a source file, matching spec, `index.ts` barrel, and colocated tests when present.

## Domain Grid Cells

- [AsphericalCell](./AsphericalCell/AsphericalCell.tsx.md) — Compatibility export for the shared aspherical prescription cell
- [DecenterCell](./DecenterCell/DecenterCell.tsx.md) — Compatibility export for the shared decenter prescription cell
- [DiffractionGratingCell](./DiffractionGratingCell/DiffractionGratingCell.tsx.md) — Compatibility export for the shared diffraction grating prescription cell
- [MediumCell](./MediumCell/MediumCell.tsx.md) — Compatibility export for the shared medium prescription cell

## Core Components

- [LensPrescriptionGrid](./LensPrescriptionGrid/LensPrescriptionGrid.tsx.md) — AG Grid table for editing optical surfaces
- [GridRowButtons](./GridRowButtons/GridRowButtons.tsx.md) — Action buttons for row operations (insert, delete)

## Specs & Configuration

- [SpecsConfiguratorPanel](./SpecsConfiguratorPanel/SpecsConfiguratorPanel.tsx.md) — UI for setting optical specs (pupil, field, wavelengths)
- [FirstOrderChips](./FirstOrderChips/FirstOrderChips.tsx.md) — Chips showing first-order optical data (EFL, F#, BFL, etc.)
- [FocusingPanel](./FocusingPanel/FocusingPanel.tsx.md) — Controls for focusing algorithms and best-focus thickness

## Visualisation

- [LensLayoutPanel](./LensLayoutPanel/LensLayoutPanel.tsx.md) — Shows 2D cross-section of the optical system

## Modals

- [AsphericalModal](./AsphericalModal/AsphericalModal.tsx.md) — Modal for setting aspherical coefficients
- [DecenterModal](./DecenterModal/DecenterModal.tsx.md) — Modal for setting decentering and tilting
- [DiffractionGratingModal](./DiffractionGratingModal/DiffractionGratingModal.tsx.md) — Modal for setting diffraction grating parameters
- [MediumSelectorModal](./MediumSelectorModal/MediumSelectorModal.tsx.md) — Modal for selecting optical media
- [FieldConfigModal](./FieldConfigModal/FieldConfigModal.tsx.md) — Modal for configuring field angles/heights
- [WavelengthConfigModal](./WavelengthConfigModal/WavelengthConfigModal.tsx.md) — Modal for setting wavelengths and weights
- [ZernikeTermsModal](./ZernikeTermsModal/ZernikeTermsModal.tsx.md) — Modal for displaying Zernike polynomial terms
- [SeidelAberrModal](./SeidelAberrModal/SeidelAberrModal.tsx.md) — Modal for displaying 3rd-order Seidel aberrations
- [ConfirmImportModal](./ConfirmImportModal/ConfirmImportModal.tsx.md) — Confirmation dialog before importing a lens file
- [ConfirmOverwriteModal](./ConfirmOverwriteModal/ConfirmOverwriteModal.tsx.md) — Confirmation dialog before overwriting current model
- [PythonScriptModal](./PythonScriptModal/PythonScriptModal.tsx.md) — Modal for viewing/editing Python scripts

## Containers

- [LensPrescriptionContainer](./LensPrescriptionContainer/LensPrescriptionContainer.tsx.md) — Manages lens prescription grid state and surface updates
- [SpecsConfiguratorContainer](./SpecsConfiguratorContainer/SpecsConfiguratorContainer.tsx.md) — Manages optical specs configuration state
- [FocusingContainer](./FocusingContainer/FocusingContainer.tsx.md) — Manages focusing algorithm execution
- [BottomDrawerContainer](./BottomDrawerContainer/BottomDrawerContainer.tsx.md) — Manages bottom drawer open/close state
