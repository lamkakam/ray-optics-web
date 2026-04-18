# `features/optimization/components/OptimizationInspectionModals.tsx`

Wraps the read-only medium, aspherical, decenter, and diffraction grating modals reused from the lens editor.

- Remounts each reused modal with a row-based `key` so the modal-local draft state is reset whenever the selected optimization row changes.
- Mirrors the lens editor container's reset behavior for read-only inspection flows, preventing stale values from a previously opened row.
