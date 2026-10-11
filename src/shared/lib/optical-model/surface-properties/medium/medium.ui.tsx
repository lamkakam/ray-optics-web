"use client";
/**
 * Prescription-grid column and modal adapter for the medium of the Object gap
 * and of physical-surface gaps. The Lens Editor overrides this adapter with its
 * store-backed selector so unconfirmed catalog choices survive glass-map visits.
 */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import { MediumSelectorModal } from "@/shared/lib/optical-model/surface-properties/medium/MediumSelectorModal";
import type {
  SurfacePropertyModalProps,
  SurfacePropertyUi,
} from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

function mediumOwner(
  row: GridRow | undefined,
): Extract<GridRow, { kind: "object" | "surface" }> | undefined {
  return row?.kind === "object" || row?.kind === "surface" ? row : undefined;
}

/** Seeds `MediumSelectorModal` from the row (reflection is not offered for Object) and writes back medium and manufacturer. */
function MediumPropertyModal({
  row,
  readOnly = false,
  onApply,
  onClose,
}: SurfacePropertyModalProps) {
  const owner = mediumOwner(row);
  return (
    <MediumSelectorModal
      key={row?.id ?? "medium-closed"}
      isOpen={owner !== undefined}
      readOnly={readOnly}
      initialMedium={owner?.medium ?? "air"}
      initialManufacturer={owner?.manufacturer ?? ""}
      allowReflective={row?.kind !== "object"}
      onConfirm={(medium, manufacturer) => onApply({ medium, manufacturer })}
      onClose={onClose}
    />
  );
}

/** Medium column: shows the medium name for Object and physical-surface rows. */
export const mediumUi = {
  properties: ["medium", "manufacturer"],
  headerName: "Medium",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.medium,
  ariaLabel: "Edit medium",
  editTooltip: "Click to set medium or glass",
  viewTooltip: "Click to view medium or glass",
  appliesTo: (row) => row.kind !== "image",
  cellValue: (row) => mediumOwner(row)?.medium,
  formatLabel: (row) => mediumOwner(row)?.medium ?? "",
  Modal: MediumPropertyModal,
} as const satisfies SurfacePropertyUi;
