"use client";
/** Prescription-grid column and modal adapter for the optional tilt and decenter of physical surfaces and the image plane. */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import type { DecenterConfig } from "@/shared/lib/optical-model/model/opticalModel";
import { DecenterModal } from "@/shared/lib/optical-model/surface-properties/decenter/DecenterModal";
import {
  EMPTY_LENS_PRESCRIPTION_CELL_LABEL,
  type SurfacePropertyModalProps,
  type SurfacePropertyUi,
} from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

function decenterOf(row: GridRow | undefined): DecenterConfig | undefined {
  return row === undefined || row.kind === "object" ? undefined : row.decenter;
}

/** Formats an optional decenter as its coordinate-system strategy, or `None`. */
export function formatDecenterLabel(
  decenter: DecenterConfig | undefined,
): string {
  return decenter === undefined
    ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL
    : decenter.coordinateSystemStrategy;
}

/** Seeds `DecenterModal` from the row and writes back `decenter`, or removes it. */
function DecenterPropertyModal({
  row,
  readOnly = false,
  onApply,
  onClose,
}: SurfacePropertyModalProps) {
  return (
    <DecenterModal
      key={row?.id ?? "decenter-closed"}
      isOpen={row !== undefined && row.kind !== "object"}
      readOnly={readOnly}
      initialDecenter={decenterOf(row)}
      onConfirm={(decenter) => onApply({ decenter })}
      onClose={onClose}
      onRemove={() => onApply({ decenter: undefined })}
    />
  );
}

/** Tilt & Decenter column: shows the coordinate-system strategy for surfaces and Image. */
export const decenterUi = {
  properties: ["decenter"],
  headerName: "Tilt & Decenter",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.decenter,
  ariaLabel: "Edit decenter and tilt",
  editTooltip: "Click to open settings for Tilt and Decenter",
  viewTooltip: "Click to view tilt and decenter",
  appliesTo: (row) => row.kind !== "object",
  cellValue: (row) => decenterOf(row),
  formatLabel: (row) => formatDecenterLabel(decenterOf(row)),
  Modal: DecenterPropertyModal,
} as const satisfies SurfacePropertyUi;
