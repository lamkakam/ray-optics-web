"use client";

import React from "react";
import { AsphericalModal } from "@/features/lens-editor/components/AsphericalModal";
import { DecenterModal } from "@/features/lens-editor/components/DecenterModal";
import { DiffractionGratingModal } from "@/features/lens-editor/components/DiffractionGratingModal";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";
import type { GridRow } from "@/shared/lib/types/gridTypes";

interface OptimizationInspectionModalsProps {
  readonly mediumModalRow: GridRow | undefined;
  readonly asphericalModalRow: GridRow | undefined;
  readonly decenterModalRow: GridRow | undefined;
  readonly diffractionGratingModalRow: GridRow | undefined;
  readonly onCloseMediumModal: () => void;
  readonly onCloseAsphericalModal: () => void;
  readonly onCloseDecenterModal: () => void;
  readonly onCloseDiffractionGratingModal: () => void;
}

export function OptimizationInspectionModals({
  mediumModalRow,
  asphericalModalRow,
  decenterModalRow,
  diffractionGratingModalRow,
  onCloseMediumModal,
  onCloseAsphericalModal,
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
