"use client";
/** Prescription-grid column and modal adapter for the optional asphere of physical surfaces. */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import type {
  AsphericalConfig,
  AsphericalType,
} from "@/shared/lib/optical-model/model/opticalModel";
import { AsphericalModal } from "@/shared/lib/optical-model/surface-properties/aspherical/AsphericalModal";
import { ASPHERICAL_TYPE_LABELS } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.labels";
import {
  EMPTY_LENS_PRESCRIPTION_CELL_LABEL,
  type SurfacePropertyModalProps,
  type SurfacePropertyUi,
} from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

function asphericalOf(row: GridRow | undefined): AsphericalConfig | undefined {
  return row?.kind === "surface" ? row.aspherical : undefined;
}

/** Formats an optional asphere as its type label, or `None`. */
export function formatAsphericalLabel(
  aspherical: AsphericalConfig | undefined,
): string {
  return aspherical === undefined
    ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL
    : ASPHERICAL_TYPE_LABELS[aspherical.kind];
}

/** Maps the modal's flat draft to the discriminated domain asphere for its `type`. */
function toAspherical(params: {
  readonly type: AsphericalType;
  readonly conicConstant: number;
  readonly polynomialCoefficients: number[];
  readonly toricSweepRadiusOfCurvature: number;
}): AsphericalConfig {
  const {
    type,
    conicConstant,
    polynomialCoefficients,
    toricSweepRadiusOfCurvature,
  } = params;
  if (type === "Conic") {
    return { kind: "Conic", conicConstant };
  }
  if (type === "XToroid" || type === "YToroid") {
    return {
      kind: type,
      conicConstant,
      toricSweepRadiusOfCurvature,
      polynomialCoefficients,
    };
  }
  return { kind: type, conicConstant, polynomialCoefficients };
}

/** Seeds `AsphericalModal` from the row (Conic with zeros when absent) and writes back `aspherical`, or removes it. */
function AsphericalPropertyModal({
  row,
  readOnly = false,
  onApply,
  onClose,
}: SurfacePropertyModalProps) {
  const aspherical = asphericalOf(row);
  return (
    <AsphericalModal
      key={row?.id ?? "aspherical-closed"}
      isOpen={row?.kind === "surface"}
      readOnly={readOnly}
      initialConicConstant={aspherical?.conicConstant ?? 0}
      initialType={aspherical?.kind ?? "Conic"}
      initialCoefficients={
        aspherical !== undefined && aspherical.kind !== "Conic"
          ? aspherical.polynomialCoefficients
          : []
      }
      initialToricSweepRadiusOfCurvature={
        aspherical?.kind === "XToroid" || aspherical?.kind === "YToroid"
          ? aspherical.toricSweepRadiusOfCurvature
          : 0
      }
      onConfirm={(params) => onApply({ aspherical: toAspherical(params) })}
      onClose={onClose}
      onRemove={() => onApply({ aspherical: undefined })}
    />
  );
}

/** Asph. column: shows the asphere type label for physical surfaces. */
export const asphericalUi = {
  properties: ["aspherical"],
  headerName: "Asph.",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aspherical,
  ariaLabel: "Edit aspherical parameters",
  editTooltip: "Click to set aspherical parameters",
  viewTooltip: "Click to view aspherical parameters",
  appliesTo: (row) => row.kind === "surface",
  cellValue: (row) => asphericalOf(row),
  formatLabel: (row) => formatAsphericalLabel(asphericalOf(row)),
  Modal: AsphericalPropertyModal,
} as const satisfies SurfacePropertyUi;
