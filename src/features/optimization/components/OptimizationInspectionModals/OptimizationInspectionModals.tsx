"use client";

import {
  AsphericalModal,
  ApertureModal,
  DecenterModal,
  DiffractionGratingModal,
  MediumSelectorModal,
} from "@/features/lens-editor/components/LensPrescriptionContainer";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

interface OptimizationInspectionModalsProps {
  readonly mediumModalRow: GridRow | undefined;
  readonly asphericalModalRow: GridRow | undefined;
  readonly apertureModalRow: GridRow | undefined;
  readonly decenterModalRow: GridRow | undefined;
  readonly diffractionGratingModalRow: GridRow | undefined;
  readonly onCloseMediumModal: () => void;
  readonly onCloseAsphericalModal: () => void;
  readonly onCloseApertureModal: () => void;
  readonly onCloseDecenterModal: () => void;
  readonly onCloseDiffractionGratingModal: () => void;
}

/**
 * Wraps the read-only medium, aperture, aspherical, decenter, and diffraction grating modals reused from the lens editor.
 *
 * @remarks
 * - Imports the reused modals from the `LensPrescriptionContainer` barrel, which is the public export boundary for lens prescription inspection components.
 * - Remounts each reused modal with a row-based `key` so the modal-local draft state is reset whenever the selected optimization row changes.
 * - Mirrors the lens editor container's reset behavior for read-only inspection flows, preventing stale values from a previously opened row.
 * - Passes the inspected surface `semiDiameter` into the reused aperture modal so read-only annular clear aperture controls render with the same radius context as the lens editor.
 */
export function OptimizationInspectionModals({
  mediumModalRow,
  asphericalModalRow,
  apertureModalRow,
  decenterModalRow,
  diffractionGratingModalRow,
  onCloseMediumModal,
  onCloseAsphericalModal,
  onCloseApertureModal,
  onCloseDecenterModal,
  onCloseDiffractionGratingModal,
}: OptimizationInspectionModalsProps) {
  return (
    <>
      <MediumSelectorModal
        key={mediumModalRow?.id ?? "medium-closed"}
        isOpen={mediumModalRow !== undefined}
        initialMedium={mediumModalRow?.kind === "surface" || mediumModalRow?.kind === "object" ? mediumModalRow.medium : "air"}
        initialManufacturer={mediumModalRow?.kind === "surface" || mediumModalRow?.kind === "object" ? mediumModalRow.manufacturer : ""}
        allowReflective={mediumModalRow?.kind !== "object"}
        readOnly
        onConfirm={() => undefined}
        onClose={onCloseMediumModal}
      />

      <AsphericalModal
        key={asphericalModalRow?.id ?? "aspherical-closed"}
        isOpen={asphericalModalRow?.kind === "surface"}
        readOnly
        initialConicConstant={asphericalModalRow?.kind === "surface" ? (asphericalModalRow.aspherical?.conicConstant ?? 0) : 0}
        initialType={asphericalModalRow?.kind === "surface" ? (asphericalModalRow.aspherical?.kind ?? "Conic") : "Conic"}
        initialCoefficients={
          asphericalModalRow?.kind === "surface" && asphericalModalRow.aspherical !== undefined && "polynomialCoefficients" in asphericalModalRow.aspherical
            ? asphericalModalRow.aspherical.polynomialCoefficients
            : []
        }
        initialToricSweepRadiusOfCurvature={
          asphericalModalRow?.kind === "surface" && asphericalModalRow.aspherical !== undefined && "toricSweepRadiusOfCurvature" in asphericalModalRow.aspherical
            ? asphericalModalRow.aspherical.toricSweepRadiusOfCurvature
            : 0
        }
        onConfirm={() => undefined}
        onClose={onCloseAsphericalModal}
        onRemove={() => undefined}
      />

      <ApertureModal
        key={apertureModalRow?.id ?? "aperture-closed"}
        isOpen={apertureModalRow?.kind === "surface"}
        readOnly
        semiDiameter={apertureModalRow?.kind === "surface" ? apertureModalRow.semiDiameter : 1}
        initialClearAperture={apertureModalRow?.kind === "surface" ? apertureModalRow.clear_aperture : undefined}
        initialEdgeAperture={apertureModalRow?.kind === "surface" ? apertureModalRow.edge_aperture : undefined}
        onConfirm={() => undefined}
        onClose={onCloseApertureModal}
      />

      <DecenterModal
        key={decenterModalRow?.id ?? "decenter-closed"}
        isOpen={decenterModalRow !== undefined}
        readOnly
        initialDecenter={decenterModalRow?.kind !== "object" ? decenterModalRow?.decenter : undefined}
        onConfirm={() => undefined}
        onClose={onCloseDecenterModal}
        onRemove={() => undefined}
      />

      <DiffractionGratingModal
        key={diffractionGratingModalRow?.id ?? "diffraction-grating-closed"}
        isOpen={diffractionGratingModalRow?.kind === "surface"}
        readOnly
        initialDiffractionGrating={diffractionGratingModalRow?.kind === "surface" ? diffractionGratingModalRow.diffractionGrating : undefined}
        onConfirm={() => undefined}
        onClose={onCloseDiffractionGratingModal}
        onRemove={() => undefined}
      />
    </>
  );
}
