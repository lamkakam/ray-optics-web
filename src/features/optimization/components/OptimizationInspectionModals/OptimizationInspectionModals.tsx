"use client";

import {
  SurfacePropertyModalHost,
  type OpenSurfacePropertyModal,
} from "@/shared/lib/lens-prescription-grid/SurfacePropertyModalHost";

interface OptimizationInspectionModalsProps {
  /** Surface property being inspected with its row, or `undefined` when no inspection modal is open. */
  readonly inspected: OpenSurfacePropertyModal | undefined;
  readonly onClose: () => void;
}

/**
 * Read-only inspection of the modal-backed surface properties (medium, aperture, aspherical, tilt and decenter, diffraction grating) shown in the Optimization prescription grid.
 *
 * @remarks
 * - Renders the shared `SurfacePropertyModalHost` with `readOnly`, so every property's own modal adapter seeds its controls from the inspected row (including the surface `semiDiameter` that annular and Ronchi aperture controls need) and shows a Close-only footer.
 * - Each adapter remounts when the inspected row changes, so no draft from a previously inspected row is shown.
 * - Confirm and remove are unreachable in read-only mode, so the host's `onApply` is a no-op.
 */
export function OptimizationInspectionModals({
  inspected,
  onClose,
}: OptimizationInspectionModalsProps) {
  return (
    <SurfacePropertyModalHost
      open={inspected}
      readOnly
      onApply={() => undefined}
      onClose={onClose}
    />
  );
}
