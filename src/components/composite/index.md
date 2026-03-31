# `components/composite/`

Feature-level components built by composing micro-components. Handle logic and interaction patterns.

## Core Features

- [LensPrescriptionGrid.tsx](./LensPrescriptionGrid.tsx.md) — AG Grid table for editing optical surfaces (curvature, thickness, medium, aspherical, decenter)
- [GridRowButtons.tsx](./GridRowButtons.tsx.md) — Action buttons for row operations (insert, delete) in lens grid

## Specs & Configuration

- [SpecsConfigurerPanel.tsx](./SpecsConfigurerPanel.tsx.md) — UI for setting optical specs (pupil, field, wavelengths)
- [FirstOrderChips.tsx](./FirstOrderChips.tsx.md) — Display chips showing first-order optical data (EFL, F#, back focal length, etc.)
- [FocusingPanel.tsx](./FocusingPanel.tsx.md) — Controls for focusing algorithms and showing best-focus thickness

## Analysis & Visualization

- [AnalysisPlotView.tsx](./AnalysisPlotView.tsx.md) — Renders analysis plots (spot diagram, wavefront, transverse aberration, Zernike, Seidel, glass scatter)
- [LensLayoutPanel.tsx](./LensLayoutPanel.tsx.md) — Shows 2D cross-section of optical system
- [GlassDetailPanel.tsx](./GlassDetailPanel.tsx.md) — Displays glass material properties (refractive index, V-number, etc.)
- [GlassScatterPlot.tsx](./GlassScatterPlot.tsx.md) — Abbe diagram with glass selections

## Navigation & Layout

- [SideNav.tsx](./SideNav.tsx.md) — Left sidebar navigation menu
- [BottomDrawer.tsx](./BottomDrawer.tsx.md) — Collapsible bottom panel for auxiliary views
- [GlassMapControls.tsx](./GlassMapControls.tsx.md) — Controls for the glass map view

## Modals

- [AsphericalModal.tsx](./AsphericalModal.tsx.md) — Modal for setting aspherical coefficients
- [DecenterModal.tsx](./DecenterModal.tsx.md) — Modal for setting decentering and tilting
- [MediumSelectorModal.tsx](./MediumSelectorModal.tsx.md) — Modal for selecting optical media
- [FieldConfigModal.tsx](./FieldConfigModal.tsx.md) — Modal for configuring field angles/heights
- [WavelengthConfigModal.tsx](./WavelengthConfigModal.tsx.md) — Modal for setting wavelengths and weights
- [ZernikeTermsModal.tsx](./ZernikeTermsModal.tsx.md) — Modal for displaying Zernike polynomial terms
- [SeidelAberrModal.tsx](./SeidelAberrModal.tsx.md) — Modal for displaying 3rd-order Seidel aberrations
- [ConfirmImportModal.tsx](./ConfirmImportModal.tsx.md) — Confirmation dialog before importing lens file
- [ConfirmOverwriteModal.tsx](./ConfirmOverwriteModal.tsx.md) — Confirmation dialog before overwriting current model
- [PythonScriptModal.tsx](./PythonScriptModal.tsx.md) — Modal for viewing/editing Python scripts
