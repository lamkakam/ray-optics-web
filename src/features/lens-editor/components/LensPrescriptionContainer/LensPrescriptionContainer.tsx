"use client";

import { useState, useCallback } from "react";
import { useStore } from "zustand";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import { buildExportScriptSections } from "@/shared/lib/python-export/pythonScript";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Switch } from "@/shared/components/primitives/Switch";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { Label } from "@/shared/components/primitives/Label";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { LensPrescriptionGrid } from "./LensPrescriptionGrid";
import { MediumSelectorModal } from "@/shared/lib/optical-model/surface-properties/medium/MediumSelectorModal";
import {
  SurfacePropertyModalHost,
  type OpenSurfacePropertyModal,
} from "@/shared/lib/lens-prescription-grid/SurfacePropertyModalHost";
import type { SurfacePropertyUiKey } from "@/shared/lib/optical-model/surface-properties/registry.ui";
import type { SurfacePropertyModalProps } from "@/shared/lib/optical-model/surface-properties/uiDescriptor";
import { FormattingModal } from "./FormattingModal";
import { PythonScriptModal } from "./PythonScriptModal";
import { AddReferenceSurfaceModal } from "./AddReferenceSurfaceModal";
import {
  firstSurfaceNeedsReferenceSurface,
  insertReferenceSurfaceAfterObject,
} from "@/shared/lib/lens-prescription-grid/lib/prescriptionFormatting";

interface LensPrescriptionContainerProps {
  /** Returns the current optical-model snapshot for Python script export. */
  readonly getOpticalModel: () => OpticalModel;
}

/**
 * Store-backed medium selector used in place of the generic medium adapter. It
 * persists the unconfirmed catalog-glass draft in `pendingMediumSelection` so
 * the choice survives a round trip to the glass map, and commits it on confirm.
 */
function EditorMediumModal({ row }: SurfacePropertyModalProps) {
  const store = useLensEditorStore();
  const pendingMediumSelection = useStore(
    store,
    (s) => s.pendingMediumSelection,
  );
  const owner =
    row?.kind === "surface" || row?.kind === "object" ? row : undefined;
  return (
    <MediumSelectorModal
      key={row?.id ?? "medium-closed"}
      isOpen={owner !== undefined}
      initialMedium={owner?.medium ?? "air"}
      initialManufacturer={owner?.manufacturer ?? ""}
      allowReflective={row?.kind !== "object"}
      selectedMedium={pendingMediumSelection?.medium}
      selectedManufacturer={
        pendingMediumSelection?.manufacturer === ""
          ? "Special"
          : pendingMediumSelection?.manufacturer
      }
      onSelectionChange={(medium, manufacturer) => {
        store.getState().updatePendingMediumSelection({
          medium,
          manufacturer: manufacturer === "Special" ? "" : manufacturer,
        });
      }}
      onConfirm={(medium, manufacturer) => {
        store.getState().commitPendingMediumSelection({ medium, manufacturer });
      }}
      onClose={() => store.getState().closeMediumModal()}
    />
  );
}

const EDITOR_MODAL_OVERRIDES = { medium: EditorMediumModal } as const;

/**
 * Container that owns lens-prescription-specific controls (Export Python Script, Formatting, auto aperture dimensions switch) and orchestrates all grid editing modals for the lens prescription editor. Bridges the `lensEditorStore` to its colocated `LensPrescriptionGrid`, modal components, and row buttons under `LensPrescriptionContainer/`. Lens config actions (`Update System`, `Load Config`, `Download Config`) live in `LensEditorConfigToolbar`.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - All grid callbacks (`handleRowChange`, `handleOpenPropertyModal`, etc.) are wrapped in `useCallback` with `[store]` dependency where `store = useLensEditorStore()` — accessing `store.getState()` directly prevents grid column def recreation. `handleOpenPropertyModal(key, rowId)` opens the medium picker for `medium` and the shared `propertyModal` for every other property.
 * - Property modals are rendered by the shared `SurfacePropertyModalHost` from each property's UI descriptor. Confirm and remove write the descriptor's row patch through `updateRow` and close the modal, so a new modal-backed property needs no container changes.
 * - The medium picker is overridden with `EditorMediumModal`, which is wired to `pendingMediumSelection` in the lens editor store so unconfirmed catalog-glass choices survive route changes and are only written to the object or surface row on confirm.
 * - When the medium modal targets the Object row, it seeds from the object row’s medium/manufacturer and disables reflective (`REFL`) selection.
 * - Each property modal adapter uses a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
 * - The aspherical adapter (`aspherical.ui.tsx`) preloads the modal from the selected row and maps its flat draft to the domain `Surface["aspherical"]` union, so toroidal and radial polynomial surfaces reopen with the correct draft values.
 * - The diffraction-grating adapter only applies to `surface` rows and writes `surface.diffractiveElement.diffractionGrating` back into the row state on confirm; removal omits the wrapper.
 * - The aperture adapter (`ApertureModal`) only applies to `surface` rows. The selected row's `semiDiameter` is passed so annular clear apertures can validate their central obstruction and Ronchi rulings can use it as their circular envelope; `autoAperture` is passed so Clear Rectangular fields are labeled Length Ratio / Width Ratio while auto aperture dimensions are enabled. Confirm writes the selected circular, annular, rectangular, or Ronchi `clear_aperture`; it writes an explicit circular or rectangular `edge_aperture` when selected and clears `edge_aperture` when Edge Aperture follows Clear Aperture. Rectangular clear aperture confirm also stores `semiDiameter: 0` so the semi-diameter cell remains blank and non-editable while the rectangle owns the aperture size. Ronchi density, rotation, and offsets remain stored while automatic aperture calculation changes only the surface semi-diameter/envelope.
 * - `PythonScriptModal` receives empty `userDefinedMaterials` and `remainingScript` strings when closed, while `buildExportScriptSections(getOpticalModel())` is called only when the export modal is open.
 * - The `Formatting` toolbar button opens `FormattingModal` beside `Export Python Script`. Successful Scale confirms call `store.getState().setRows(updatedRows)` immediately so the prescription revision and Optimization sync policy follow normal prescription mutation behavior.
 * - Successful Reverse confirms first check the resulting first physical surface. If it has nonzero tilt or decenter, the container closes `FormattingModal`, stores the reversed rows in `pendingReferenceSurfaceRows`, and opens `AddReferenceSurfaceModal` without mutating the store.
 * - In `AddReferenceSurfaceModal`, `No` applies the reversed rows unchanged, while `Yes` inserts a flat zero-thickness air reference surface immediately after Object and then applies rows.
 * - `FormattingModal` is rendered only while `formattingOpen` is true. Closing it via Cancel or successful Confirm unmounts its local draft controls, so reopening starts from defaults derived from the current prescription rows.
 * - Scale and Reverse formatting ranges are local to one open modal session, so switching modes during that session restores the last range used for each mode.
 * - Formatting errors are surfaced through the shared `ErrorModal`; failed formatting leaves the existing store rows unchanged.
 * - The visible `Set auto aperture dimensions:` label and `Set auto aperture dimensions` accessible switch name are paired with an Auto/Manual switch that updates `autoAperture` in the store, passes `semiDiameterReadonly` to the grid, and passes `autoAperture` to `ApertureModal` for Clear Rectangular ratio labels.
 * - At the `1440px` large-screen breakpoint, the prescription tab content becomes a full-height flex column: its toolbar and aperture switch retain natural height while the grid fills the remaining panel height and keeps a `200px` minimum.
 * - `LensPrescriptionGrid`, `PythonScriptModal`, `FormattingModal`, and `AddReferenceSurfaceModal` are internal to this directory; the nested barrel only exports `LensPrescriptionContainer` and `GridRowButtons`. Property modals live with their surface properties under `shared/lib/optical-model/surface-properties/`. `ConfirmImportModal` remains colocated here but is used by `LensEditorConfigToolbar`.
 *
 * - Mounted once in the main page inside the `BottomDrawer` tabs.
 *
 *
 * Supplies the editor cache to the grid. Toggling auto aperture changes display/read-only behavior without overwriting manual values or discarding the cache.
 *
 * ## Injected Dependencies
 *
 * Lens store state is consumed via `LensEditorStoreContext`:
 * - `useLensEditorStore()` — imperative access (callbacks use `store.getState().*`). For reactive reads (`rows`, `autoAperture`, modal states), use it with Zustand's `useStore`.
 *
 *
 */
export function LensPrescriptionContainer({
  getOpticalModel,
}: LensPrescriptionContainerProps) {
  const screenSize = useScreenBreakpoint();
  const store = useLensEditorStore();
  const rows = useStore(store, (s) => s.rows);
  const autoAperture = useStore(store, (s) => s.autoAperture);
  const autoSemiDiameters = useStore(store, (s) => s.autoSemiDiameters);
  const mediumModal = useStore(store, (s) => s.mediumModal);
  const propertyModal = useStore(store, (s) => s.propertyModal);
  /** Visibility of the generated Python-script modal. */
  const [pythonScriptOpen, setPythonScriptOpen] = useState(false);
  /** Visibility of the prescription-formatting modal. */
  const [formattingOpen, setFormattingOpen] = useState(false);
  /** Formatting validation error displayed by the shared error modal. */
  const [formattingError, setFormattingError] = useState<string | undefined>(
    undefined,
  );
  /** Reversed rows awaiting the optional reference-surface decision. */
  const [pendingReferenceSurfaceRows, setPendingReferenceSurfaceRows] =
    useState<GridRow[] | undefined>(undefined);

  // Stable callbacks — use store.getState() so they never change reference,
  // preventing unnecessary columnDefs recreation in LensPrescriptionGrid.
  const handleRowChange = useCallback(
    (id: string, patch: Partial<GridRow>) =>
      store.getState().updateRow(id, patch),
    [store],
  );
  const handleOpenPropertyModal = useCallback(
    (key: SurfacePropertyUiKey, rowId: string) => {
      if (key === "medium") {
        store.getState().openMediumModal(rowId);
      } else {
        store.getState().openPropertyModal(key, rowId);
      }
    },
    [store],
  );
  const handleAddRowAfter = useCallback(
    (rowId: string) => store.getState().addRowAfter(rowId),
    [store],
  );
  const handleDeleteRow = useCallback(
    (rowId: string) => store.getState().deleteRow(rowId),
    [store],
  );

  const mediumRow = mediumModal.open
    ? rows.find((r) => r.id === mediumModal.rowId)
    : undefined;
  const propertyRow = propertyModal.open
    ? rows.find((r) => r.id === propertyModal.rowId)
    : undefined;
  const openPropertyModal: OpenSurfacePropertyModal | undefined =
    mediumRow !== undefined
      ? { key: "medium", row: mediumRow }
      : propertyModal.open && propertyRow !== undefined
        ? { key: propertyModal.key, row: propertyRow }
        : undefined;
  const pythonScriptSections = pythonScriptOpen
    ? buildExportScriptSections(getOpticalModel())
    : { userDefinedMaterials: "", remainingScript: "" };

  return (
    <div className="min-[1440px]:flex min-[1440px]:h-full min-[1440px]:flex-col">
      <div role="toolbar" aria-label="Grid toolbar" className="mb-2 flex gap-2">
        <Tooltip text="Generate a Python script" portal noTouch>
          <Button variant="secondary" onClick={() => setPythonScriptOpen(true)}>
            Export Python Script
          </Button>
        </Tooltip>
        <Tooltip text="Format selected prescription rows" portal noTouch>
          <Button variant="secondary" onClick={() => setFormattingOpen(true)}>
            Formatting
          </Button>
        </Tooltip>
      </div>

      <div className="mt-2 mb-2 flex items-center gap-2">
        <Label htmlFor="auto-aperture-toggle">
          Set auto aperture dimensions:
        </Label>
        <Tooltip
          text={
            autoAperture
              ? "Turn off auto aperture dimensions"
              : "Turn on auto aperture dimensions"
          }
          noTouch
        >
          <Switch
            id="auto-aperture-toggle"
            checked={autoAperture}
            onCheckedChange={(checked) =>
              store.getState().setAutoAperture(checked)
            }
            ariaLabel="Set auto aperture dimensions"
            checkedContent="Auto"
            uncheckedContent="Manual"
            size={screenSize === "screenSM" ? "sm" : "md"}
          />
        </Tooltip>
      </div>

      <LensPrescriptionGrid
        rows={rows}
        onRowChange={handleRowChange}
        onOpenPropertyModal={handleOpenPropertyModal}
        onAddRowAfter={handleAddRowAfter}
        onDeleteRow={handleDeleteRow}
        semiDiameterReadonly={autoAperture}
        computedSemiDiameters={autoSemiDiameters}
      />

      <SurfacePropertyModalHost
        open={openPropertyModal}
        autoAperture={autoAperture}
        overrides={EDITOR_MODAL_OVERRIDES}
        onApply={(row, patch) => {
          store.getState().updateRow(row.id, patch);
          store.getState().closePropertyModal();
        }}
        onClose={() => store.getState().closePropertyModal()}
      />

      <PythonScriptModal
        isOpen={pythonScriptOpen}
        userDefinedMaterials={pythonScriptSections.userDefinedMaterials}
        remainingScript={pythonScriptSections.remainingScript}
        onClose={() => setPythonScriptOpen(false)}
      />

      {formattingOpen && (
        <FormattingModal
          isOpen={formattingOpen}
          rows={rows}
          onConfirm={({ mode, rows: updatedRows }) => {
            if (
              mode === "reverse" &&
              firstSurfaceNeedsReferenceSurface(updatedRows)
            ) {
              setPendingReferenceSurfaceRows(updatedRows);
              setFormattingOpen(false);
              return;
            }

            store.getState().setRows(updatedRows);
            setFormattingOpen(false);
          }}
          onCancel={() => setFormattingOpen(false)}
          onError={setFormattingError}
        />
      )}

      <AddReferenceSurfaceModal
        isOpen={pendingReferenceSurfaceRows !== undefined}
        onCancel={() => {
          if (pendingReferenceSurfaceRows !== undefined) {
            store.getState().setRows(pendingReferenceSurfaceRows);
          }
          setPendingReferenceSurfaceRows(undefined);
        }}
        onConfirm={() => {
          if (pendingReferenceSurfaceRows !== undefined) {
            store
              .getState()
              .setRows(
                insertReferenceSurfaceAfterObject(pendingReferenceSurfaceRows),
              );
          }
          setPendingReferenceSurfaceRows(undefined);
        }}
      />

      <ErrorModal
        isOpen={formattingError !== undefined}
        message={formattingError}
        onClose={() => setFormattingError(undefined)}
      />
    </div>
  );
}
