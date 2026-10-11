/**
 * React-side contract for a modal-backed surface property. It is kept apart
 * from the pure `descriptor.ts` so the Pyodide worker and Python export never
 * import React. One UI descriptor supplies a prescription-grid column (header,
 * width, cell label, tooltips) and a modal adapter that maps a grid row to the
 * property's editor and back to a row patch.
 */
import type { ComponentType } from "react";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { SurfacePropertyKey } from "@/shared/lib/optical-model/surface-properties/descriptor";

/** Display label for an unset optional prescription value. */
export const EMPTY_LENS_PRESCRIPTION_CELL_LABEL = "None";

/** Props every surface-property modal adapter accepts. */
export interface SurfacePropertyModalProps {
  /** Row being edited or inspected; `undefined`, or a row the property does not apply to, closes the modal. */
  readonly row: GridRow | undefined;
  /** Disables every control and shows a Close-only footer. */
  readonly readOnly?: boolean;
  /** Whether the prescription computes semi-diameters automatically. */
  readonly autoAperture?: boolean;
  /** Writes the confirmed or removed value back as a row patch. */
  readonly onApply: (patch: Partial<GridRow>) => void;
  readonly onClose: () => void;
}

/** Grid column, cell, and modal behavior for one modal-backed surface property. */
export interface SurfacePropertyUi {
  /** Surface keys this column and modal edit. */
  readonly properties: readonly SurfacePropertyKey[];
  readonly headerName: string;
  readonly width: number;
  /** Accessible name of the cell's action button. */
  readonly ariaLabel: string;
  /** Tooltip shown where the property is editable. */
  readonly editTooltip: string;
  /** Tooltip shown where the property is only inspected. */
  readonly viewTooltip: string;
  /** Whether Object, Surface, or Image rows carry this property. */
  readonly appliesTo: (row: GridRow) => boolean;
  /** AG Grid value for an applicable row. */
  readonly cellValue: (row: GridRow) => unknown;
  /** Cell text for an applicable row. */
  readonly formatLabel: (row: GridRow) => string;
  /** Editor/inspector adapter rendered by `SurfacePropertyModalHost`. */
  readonly Modal: ComponentType<SurfacePropertyModalProps>;
}
