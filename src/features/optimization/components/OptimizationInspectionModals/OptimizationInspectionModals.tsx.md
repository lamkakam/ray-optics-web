# `features/optimization/components/OptimizationInspectionModals/OptimizationInspectionModals.tsx`

Wraps the read-only medium, aspherical, decenter, and diffraction grating modals reused from the lens editor.

- Imports the reused modals from the `LensPrescriptionContainer` barrel, which is the public export boundary for lens prescription inspection components.
- Remounts each reused modal with a row-based `key` so the modal-local draft state is reset whenever the selected optimization row changes.
- Mirrors the lens editor container's reset behavior for read-only inspection flows, preventing stale values from a previously opened row.
