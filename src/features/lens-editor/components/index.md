# `features/lens-editor/components/`

All components (composite + container + domain cells) for the lens editor feature.

## Domain Grid Cells

- [AsphericalCell.tsx](./AsphericalCell.tsx.md) — Compatibility export for the shared aspherical prescription cell
- [DecenterCell.tsx](./DecenterCell.tsx.md) — Compatibility export for the shared decenter prescription cell
- [DiffractionGratingCell.tsx](./DiffractionGratingCell.tsx.md) — Compatibility export for the shared diffraction grating prescription cell
- [MediumCell.tsx](./MediumCell.tsx.md) — Compatibility export for the shared medium prescription cell

## Core Components

- [LensPrescriptionGrid.tsx](./LensPrescriptionGrid.tsx.md) — AG Grid table for editing optical surfaces
- [GridRowButtons.tsx](./GridRowButtons.tsx.md) — Action buttons for row operations (insert, delete)

## Specs & Configuration

- [SpecsConfiguratorPanel.tsx](./SpecsConfiguratorPanel.tsx.md) — UI for setting optical specs (pupil, field, wavelengths)
- [FirstOrderChips.tsx](./FirstOrderChips.tsx.md) — Chips showing first-order optical data (EFL, F#, BFL, etc.)
- [FocusingPanel.tsx](./FocusingPanel.tsx.md) — Controls for focusing algorithms and best-focus thickness

## Visualisation

- [LensLayoutPanel.tsx](./LensLayoutPanel.tsx.md) — Shows 2D cross-section of the optical system

## Modals

- [AsphericalModal.tsx](./AsphericalModal.tsx.md) — Modal for setting aspherical coefficients
- [DecenterModal.tsx](./DecenterModal.tsx.md) — Modal for setting decentering and tilting
- [DiffractionGratingModal.tsx](./DiffractionGratingModal.tsx.md) — Modal for setting diffraction grating parameters
- [MediumSelectorModal.tsx](./MediumSelectorModal.tsx.md) — Modal for selecting optical media
- [FieldConfigModal.tsx](./FieldConfigModal.tsx.md) — Modal for configuring field angles/heights
- [WavelengthConfigModal.tsx](./WavelengthConfigModal.tsx.md) — Modal for setting wavelengths and weights
- [ZernikeTermsModal.tsx](./ZernikeTermsModal.tsx.md) — Modal for displaying Zernike polynomial terms
- [SeidelAberrModal.tsx](./SeidelAberrModal.tsx.md) — Modal for displaying 3rd-order Seidel aberrations
- [ConfirmImportModal.tsx](./ConfirmImportModal.tsx.md) — Confirmation dialog before importing a lens file
- [ConfirmOverwriteModal.tsx](./ConfirmOverwriteModal.tsx.md) — Confirmation dialog before overwriting current model
- [PythonScriptModal.tsx](./PythonScriptModal.tsx.md) — Modal for viewing/editing Python scripts

## Containers

- [LensPrescriptionContainer.tsx](./LensPrescriptionContainer.tsx.md) — Manages lens prescription grid state and surface updates
- [SpecsConfiguratorContainer.tsx](./SpecsConfiguratorContainer.tsx.md) — Manages optical specs configuration state
- [FocusingContainer.tsx](./FocusingContainer.tsx.md) — Manages focusing algorithm execution
- [BottomDrawerContainer.tsx](./BottomDrawerContainer.tsx.md) — Manages bottom drawer open/close state
