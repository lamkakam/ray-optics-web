"use client";
import type { ComponentType } from "react";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  SURFACE_PROPERTY_UI_KEYS,
  SURFACE_PROPERTY_UIS,
  type SurfacePropertyUiKey,
} from "@/shared/lib/optical-model/surface-properties/registry.ui";
import type { SurfacePropertyModalProps } from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

/** The property modal that is open and the row it targets. */
export interface OpenSurfacePropertyModal {
  readonly key: SurfacePropertyUiKey;
  readonly row: GridRow;
}

interface SurfacePropertyModalHostProps {
  /** Open modal, or `undefined` when every property modal is closed. */
  readonly open: OpenSurfacePropertyModal | undefined;
  readonly readOnly?: boolean;
  readonly autoAperture?: boolean;
  /** Receives the target row and the confirmed or removed value as a row patch. */
  readonly onApply: (row: GridRow, patch: Partial<GridRow>) => void;
  readonly onClose: () => void;
  /** Replaces the descriptor's modal adapter for selected properties, such as the editor's store-backed medium selector. */
  readonly overrides?: Partial<
    Record<SurfacePropertyUiKey, ComponentType<SurfacePropertyModalProps>>
  >;
}

/**
 * Renders the modal adapter of every modal-backed surface property and opens the
 * one named by `open`. Each adapter remounts when its target row changes, so its
 * draft state starts from the row's current value. A new surface property is
 * picked up from `SURFACE_PROPERTY_UIS` without changes here.
 */
export function SurfacePropertyModalHost({
  open,
  readOnly = false,
  autoAperture,
  onApply,
  onClose,
  overrides,
}: SurfacePropertyModalHostProps) {
  return (
    <>
      {SURFACE_PROPERTY_UI_KEYS.map((key) => {
        const Modal = overrides?.[key] ?? SURFACE_PROPERTY_UIS[key].Modal;
        const row = open?.key === key ? open.row : undefined;
        return (
          <Modal
            key={key}
            row={row}
            readOnly={readOnly}
            autoAperture={autoAperture}
            onApply={(patch) => {
              if (row !== undefined) onApply(row, patch);
            }}
            onClose={onClose}
          />
        );
      })}
    </>
  );
}
