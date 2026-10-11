"use client";
/** Prescription-grid column and modal adapter for clear and edge apertures of physical surfaces. */
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import type {
  ClearAperture,
  EdgeAperture,
} from "@/shared/lib/optical-model/model/opticalModel";
import { ApertureModal } from "@/shared/lib/optical-model/surface-properties/aperture/ApertureModal";
import type {
  SurfacePropertyModalProps,
  SurfacePropertyUi,
} from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

function hasOffset(
  aperture: Pick<ClearAperture, "offsetX" | "offsetY">,
): boolean {
  return aperture.offsetX !== 0 || aperture.offsetY !== 0;
}

function formatOffset(
  aperture: Pick<ClearAperture, "offsetX" | "offsetY">,
): string {
  return `offset (${aperture.offsetX}, ${aperture.offsetY})`;
}

function formatTransformSuffix(aperture: {
  readonly rotation: number;
  readonly offsetX: number;
  readonly offsetY: number;
}): string {
  const suffixes = [
    aperture.rotation !== 0 ? `rot ${aperture.rotation}°` : undefined,
    hasOffset(aperture) ? formatOffset(aperture) : undefined,
  ].filter((suffix): suffix is string => suffix !== undefined);

  return suffixes.length === 0 ? "" : `, ${suffixes.join(", ")}`;
}

function formatClearApertureLabel(
  clearAperture: ClearAperture | undefined,
): string {
  if (clearAperture === undefined) return "Default";

  if (clearAperture.shape === "circular") {
    return hasOffset(clearAperture)
      ? `Cir ${formatOffset(clearAperture)}`
      : "Default";
  }

  if (clearAperture.shape === "rectangular") {
    return `Rect (${clearAperture.xHalfWidth},${clearAperture.yHalfWidth})${formatTransformSuffix(clearAperture)}`;
  }

  if (clearAperture.shape === "ronchi") {
    return `Ronchi ${clearAperture.lpmm} lp/mm${formatTransformSuffix(clearAperture)}`;
  }

  const baseLabel = `Annu obs ${clearAperture.obstructionRadius}`;
  return hasOffset(clearAperture)
    ? `${baseLabel}, ${formatOffset(clearAperture)}`
    : baseLabel;
}

function formatEdgeApertureLabel(edgeAperture: EdgeAperture): string {
  if (edgeAperture.shape === "rectangular") {
    return `Edge Rect (${edgeAperture.xHalfWidth},${edgeAperture.yHalfWidth})${formatTransformSuffix(edgeAperture)}`;
  }

  const baseLabel = `Edge Cir ${edgeAperture.radius}`;
  return hasOffset(edgeAperture)
    ? `${baseLabel}, ${formatOffset(edgeAperture)}`
    : baseLabel;
}

/** Formats clear and edge aperture shapes, including Ronchi density and nonzero transforms, for a grid cell. */
export function formatApertureLabel(
  clearAperture: ClearAperture | undefined,
  edgeAperture: EdgeAperture | undefined,
): string {
  const clearLabel = formatClearApertureLabel(clearAperture);
  return edgeAperture === undefined
    ? clearLabel
    : `${clearLabel}; ${formatEdgeApertureLabel(edgeAperture)}`;
}

/**
 * Seeds `ApertureModal` with the row's semi-diameter and apertures. Confirm
 * writes both apertures; a rectangular clear aperture also stores
 * `semiDiameter: 0`, because the rectangle owns the aperture size.
 */
function AperturePropertyModal({
  row,
  readOnly = false,
  autoAperture,
  onApply,
  onClose,
}: SurfacePropertyModalProps) {
  const surface = row?.kind === "surface" ? row : undefined;
  return (
    <ApertureModal
      key={row?.id ?? "aperture-closed"}
      isOpen={surface !== undefined}
      readOnly={readOnly}
      autoAperture={autoAperture}
      semiDiameter={surface?.semiDiameter ?? 1}
      initialClearAperture={surface?.clear_aperture}
      initialEdgeAperture={surface?.edge_aperture}
      onConfirm={({ clear_aperture, edge_aperture }) =>
        onApply({
          clear_aperture,
          edge_aperture,
          ...(clear_aperture.shape === "rectangular"
            ? { semiDiameter: 0 }
            : {}),
        })
      }
      onClose={onClose}
    />
  );
}

/** Aperture column: shows a compact clear/edge aperture summary for physical surfaces. */
export const apertureUi = {
  properties: ["clear_aperture", "edge_aperture"],
  headerName: "Aperture",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aperture,
  ariaLabel: "Edit aperture",
  editTooltip: "Click to set aperture",
  viewTooltip: "Click to view aperture",
  appliesTo: (row) => row.kind === "surface",
  cellValue: (row) =>
    row.kind === "surface"
      ? formatApertureLabel(row.clear_aperture, row.edge_aperture)
      : undefined,
  formatLabel: (row) =>
    row.kind === "surface"
      ? formatApertureLabel(row.clear_aperture, row.edge_aperture)
      : "",
  Modal: AperturePropertyModal,
} as const satisfies SurfacePropertyUi;
