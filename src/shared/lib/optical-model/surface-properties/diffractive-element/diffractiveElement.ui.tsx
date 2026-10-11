"use client";
/** Prescription-grid column and modal adapter for the optional diffractive element of physical surfaces. */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import type { DiffractionGrating } from "@/shared/lib/optical-model/model/opticalModel";
import { DiffractionGratingModal } from "@/shared/lib/optical-model/surface-properties/diffractive-element/DiffractionGratingModal";
import {
  EMPTY_LENS_PRESCRIPTION_CELL_LABEL,
  type SurfacePropertyModalProps,
  type SurfacePropertyUi,
} from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

function gratingOf(row: GridRow | undefined): DiffractionGrating | undefined {
  return row?.kind === "surface"
    ? row.diffractiveElement?.diffractionGrating
    : undefined;
}

/** Formats an optional grating density as `<lpmm> lp/mm`, or `None`. */
export function formatDiffractionGratingLabel(
  diffractionGrating: DiffractionGrating | undefined,
): string {
  return diffractionGrating === undefined
    ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL
    : `${diffractionGrating.lpmm} lp/mm`;
}

/** Seeds `DiffractionGratingModal` from the nested grating and writes back the wrapper, or removes it. */
function DiffractiveElementPropertyModal({
  row,
  readOnly = false,
  onApply,
  onClose,
}: SurfacePropertyModalProps) {
  return (
    <DiffractionGratingModal
      key={row?.id ?? "diffraction-grating-closed"}
      isOpen={row?.kind === "surface"}
      readOnly={readOnly}
      initialDiffractionGrating={gratingOf(row)}
      onConfirm={(diffractionGrating) =>
        onApply({ diffractiveElement: { diffractionGrating } })
      }
      onClose={onClose}
      onRemove={() => onApply({ diffractiveElement: undefined })}
    />
  );
}

/** Diffraction Grating column: shows the grating density for physical surfaces. */
export const diffractiveElementUi = {
  properties: ["diffractiveElement"],
  headerName: "Diffraction Grating",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.diffractionGrating,
  ariaLabel: "Edit diffraction grating",
  editTooltip: "Click to set diffraction grating",
  viewTooltip: "Click to view diffraction grating",
  appliesTo: (row) => row.kind === "surface",
  cellValue: (row) => gratingOf(row),
  formatLabel: (row) => formatDiffractionGratingLabel(gratingOf(row)),
  Modal: DiffractiveElementPropertyModal,
} as const satisfies SurfacePropertyUi;
