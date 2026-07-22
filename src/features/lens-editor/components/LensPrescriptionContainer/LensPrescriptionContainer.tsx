/**
 * Supplies the editor cache to the grid. Toggling auto aperture changes display/read-only behavior without overwriting manual values or discarding the cache.
 *
 * @remarks
 * ## Injected Dependencies
 *
 * Lens store state is consumed via `LensEditorStoreContext`:
 * - `useLensEditorStore()` — imperative access (callbacks use `store.getState().*`). For reactive reads (`rows`, `autoAperture`, modal states), use it with Zustand's `useStore`.
 *
 * | Dependency | Type | Description |
 * |------------|------|-------------|
 * | `getOpticalModel` | `() => OpticalModel` | Returns the current optical model snapshot for Python script export |
 *
 * ## Internal State
 *
 * - `pythonScriptOpen: boolean` — controls `PythonScriptModal`.
 * - `formattingOpen: boolean` — controls `FormattingModal`.
 * - `formattingError: string | undefined` — controls the shared `ErrorModal` shown when formatting validation fails.
 * - `pendingReferenceSurfaceRows: GridRow[] | undefined` — holds a successful Reverse result while the user chooses whether to insert a flat air reference surface.
 */
"use client";

import React, { useState, useCallback } from "react";
import { useStore } from "zustand";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { OpticalModel, AsphericalType } from "@/shared/lib/types/opticalModel";
import { buildExportScript } from "@/shared/lib/utils/pythonScript";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Switch } from "@/shared/components/primitives/Switch";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { Label } from "@/shared/components/primitives/Label";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { LensPrescriptionGrid } from "./LensPrescriptionGrid";
import { MediumSelectorModal } from "./MediumSelectorModal";
import { AsphericalModal } from "./AsphericalModal";
import { DecenterModal, type DecenterType } from "./DecenterModal";
import { DiffractionGratingModal } from "./DiffractionGratingModal";
import { ApertureModal } from "./ApertureModal";
import { FormattingModal } from "./FormattingModal";
import { PythonScriptModal } from "./PythonScriptModal";
import { AddReferenceSurfaceModal } from "./AddReferenceSurfaceModal";
import {
  firstSurfaceNeedsReferenceSurface,
  insertReferenceSurfaceAfterObject,
} from "@/shared/lib/lens-prescription-grid/lib/prescriptionFormatting";

interface LensPrescriptionContainerProps {
  readonly getOpticalModel: () => OpticalModel;
}

function getInitialAsphericalType(asphericalRow: GridRow | undefined): AsphericalType {
  if (asphericalRow?.kind !== "surface") {
    return "Conic";
  }

  switch (asphericalRow.aspherical?.kind) {
    case "EvenAspherical":
      return "EvenAspherical";
    case "RadialPolynomial":
      return "RadialPolynomial";
    case "XToroid":
      return "XToroid";
    case "YToroid":
      return "YToroid";
    default:
      return "Conic";
  }
}

function getInitialAsphericalCoefficients(asphericalRow: GridRow | undefined): number[] {
  if (asphericalRow?.kind !== "surface") {
    return [];
  }

  switch (asphericalRow.aspherical?.kind) {
    case "EvenAspherical":
    case "RadialPolynomial":
    case "XToroid":
    case "YToroid":
      return asphericalRow.aspherical.polynomialCoefficients;
    default:
      return [];
  }
}

function getInitialToricSweepRadiusOfCurvature(asphericalRow: GridRow | undefined): number {
  if (asphericalRow?.kind !== "surface") {
    return 0;
  }

  switch (asphericalRow.aspherical?.kind) {
    case "XToroid":
    case "YToroid":
      return asphericalRow.aspherical.toricSweepRadiusOfCurvature;
    default:
      return 0;
  }
}

/**
 * Container that owns lens-prescription-specific controls (Export Python Script, Formatting, auto aperture dimensions switch) and orchestrates all grid editing modals for the lens prescription editor. Bridges the `lensEditorStore` to its colocated `LensPrescriptionGrid`, modal components, and row buttons under `LensPrescriptionContainer/`. Lens config actions (`Update System`, `Load Config`, `Download Config`) live in `LensEditorConfigToolbar`.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - All grid callbacks (`handleRowChange`, `handleOpenMediumModal`, etc.) are wrapped in `useCallback` with `[store]` dependency where `store = useLensEditorStore()` — accessing `store.getState()` directly prevents grid column def recreation.
 * - `MediumSelectorModal` is wired to `pendingMediumSelection` in the lens editor store so unconfirmed catalog-glass choices survive route changes and are only written to the object or surface row on confirm.
 * - When the medium modal targets the Object row, it seeds from the object row’s medium/manufacturer and disables reflective (`REFL`) selection.
 * - The `MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, `DiffractionGratingModal`, and `ApertureModal` each use a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
 * - `AsphericalModal` uses UI labels (`"Conic"`, `"EvenAspherical"`, `"RadialPolynomial"`, `"XToroid"`, `"YToroid"`), while this container maps them to the domain `Surface["aspherical"]` union.
 * - `getInitialAsphericalType`, `getInitialAsphericalCoefficients`, and `getInitialToricSweepRadiusOfCurvature` preload modal state from the selected row so toroidal and radial polynomial surfaces reopen with the correct draft values.
 * - `DiffractionGratingModal` only applies to `surface` rows and writes `surface.diffractionGrating` back into the row state on confirm.
 * - `ApertureModal` only applies to `surface` rows. The selected row's `semiDiameter` is passed so annular clear apertures can validate their central obstruction radius against the outer clear aperture radius, and `autoAperture` is passed so Clear Rectangular fields are labeled Length Ratio / Width Ratio while auto aperture dimensions are enabled. Confirm writes the selected circular, annular, or rectangular `clear_aperture`; it writes an explicit circular or rectangular `edge_aperture` when selected and clears `edge_aperture` when Edge Aperture follows Clear Aperture. Rectangular clear aperture confirm also stores `semiDiameter: 0` so the semi-diameter cell remains blank and non-editable while the rectangle owns the aperture size.
 * - `PythonScriptModal` receives an empty string for `script` when closed, generating the script only when open.
 * - The `Formatting` toolbar button opens `FormattingModal` beside `Export Python Script`. Successful Scale confirms call `store.getState().setRows(updatedRows)` immediately so the prescription revision and Optimization sync policy follow normal prescription mutation behavior.
 * - Successful Reverse confirms first check the resulting first physical surface. If it has nonzero tilt or decenter, the container closes `FormattingModal`, stores the reversed rows in `pendingReferenceSurfaceRows`, and opens `AddReferenceSurfaceModal` without mutating the store.
 * - In `AddReferenceSurfaceModal`, `No` applies the reversed rows unchanged, while `Yes` inserts a flat zero-thickness air reference surface immediately after Object and then applies rows.
 * - `FormattingModal` is rendered only while `formattingOpen` is true. Closing it via Cancel or successful Confirm unmounts its local draft controls, so reopening starts from defaults derived from the current prescription rows.
 * - Scale and Reverse formatting ranges are local to one open modal session, so switching modes during that session restores the last range used for each mode.
 * - Formatting errors are surfaced through the shared `ErrorModal`; failed formatting leaves the existing store rows unchanged.
 * - The visible `Set auto aperture dimensions:` label and `Set auto aperture dimensions` accessible switch name are paired with an Auto/Manual switch that updates `autoAperture` in the store, passes `semiDiameterReadonly` to the grid, and passes `autoAperture` to `ApertureModal` for Clear Rectangular ratio labels.
 * - At the `1440px` large-screen breakpoint, the prescription tab content becomes a full-height flex column: its toolbar and aperture switch retain natural height while the grid fills the remaining panel height and keeps a `200px` minimum.
 * - `LensPrescriptionGrid`, `PythonScriptModal`, `FormattingModal`, and `AddReferenceSurfaceModal` are internal to this directory; the nested barrel only exports components used outside `LensPrescriptionContainer/` (`MediumSelectorModal`, `AsphericalModal`, `DecenterModal`, `DiffractionGratingModal`, and `GridRowButtons`). `ConfirmImportModal` remains colocated here but is used by `LensEditorConfigToolbar`.
 *
 * - Mounted once in the main page inside the `BottomDrawer` tabs.
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
  const pendingMediumSelection = useStore(store, (s) => s.pendingMediumSelection);
  const asphericalModal = useStore(store, (s) => s.asphericalModal);
  const decenterModal = useStore(store, (s) => s.decenterModal);
  const diffractionGratingModal = useStore(store, (s) => s.diffractionGratingModal);
  const apertureModal = useStore(store, (s) => s.apertureModal);
  const [pythonScriptOpen, setPythonScriptOpen] = useState(false);
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [formattingError, setFormattingError] = useState<string | undefined>(undefined);
  const [pendingReferenceSurfaceRows, setPendingReferenceSurfaceRows] = useState<GridRow[] | undefined>(undefined);

  // Stable callbacks — use store.getState() so they never change reference,
  // preventing unnecessary columnDefs recreation in LensPrescriptionGrid.
  const handleRowChange = useCallback(
    (id: string, patch: Partial<GridRow>) => store.getState().updateRow(id, patch),
    [store]
  );
  const handleOpenMediumModal = useCallback((rowId: string) => store.getState().openMediumModal(rowId), [store]);
  const handleOpenAsphericalModal = useCallback((rowId: string) => store.getState().openAsphericalModal(rowId), [store]);
  const handleOpenDecenterModal = useCallback((rowId: string) => store.getState().openDecenterModal(rowId), [store]);
  const handleOpenDiffractionGratingModal = useCallback(
    (rowId: string) => store.getState().openDiffractionGratingModal(rowId),
    [store]
  );
  const handleOpenApertureModal = useCallback((rowId: string) => store.getState().openApertureModal(rowId), [store]);
  const handleAddRowAfter = useCallback((rowId: string) => store.getState().addRowAfter(rowId), [store]);
  const handleDeleteRow = useCallback((rowId: string) => store.getState().deleteRow(rowId), [store]);

  const mediumRow = rows.find((r) => r.id === mediumModal.rowId);
  const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);
  const decenterRow = rows.find((r) => r.id === decenterModal.rowId);
  const diffractionGratingRow = rows.find((r) => r.id === diffractionGratingModal.rowId);
  const apertureRow = rows.find((r) => r.id === apertureModal.rowId);
  const isObjectMediumRow = mediumRow?.kind === "object";

  return (
    <div className="min-[1440px]:flex min-[1440px]:h-full min-[1440px]:flex-col">
      <div role="toolbar" aria-label="Grid toolbar" className="mb-2 flex gap-2">
        <Tooltip text="Generate a Python script" portal noTouch>
          <Button variant="secondary" onClick={() => setPythonScriptOpen(true)}>Export Python Script</Button>
        </Tooltip>
        <Tooltip text="Format selected prescription rows" portal noTouch>
          <Button variant="secondary" onClick={() => setFormattingOpen(true)}>Formatting</Button>
        </Tooltip>
      </div>

      <div className="mt-2 mb-2 flex items-center gap-2">
        <Label htmlFor="auto-aperture-toggle">Set auto aperture dimensions:</Label>
        <Tooltip text={autoAperture ? "Turn off auto aperture dimensions" : "Turn on auto aperture dimensions"} noTouch>
          <Switch
            id="auto-aperture-toggle"
            checked={autoAperture}
            onCheckedChange={(checked) => store.getState().setAutoAperture(checked)}
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
        onOpenMediumModal={handleOpenMediumModal}
        onOpenAsphericalModal={handleOpenAsphericalModal}
        onOpenDecenterModal={handleOpenDecenterModal}
        onOpenDiffractionGratingModal={handleOpenDiffractionGratingModal}
        onOpenApertureModal={handleOpenApertureModal}
        onAddRowAfter={handleAddRowAfter}
        onDeleteRow={handleDeleteRow}
        semiDiameterReadonly={autoAperture}
        computedSemiDiameters={autoSemiDiameters}
      />

      <MediumSelectorModal
        key={mediumModal.open ? mediumModal.rowId : "medium-closed"}
        isOpen={mediumModal.open}
        initialMedium={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.medium : "air"}
        initialManufacturer={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.manufacturer : ""}
        allowReflective={!isObjectMediumRow}
        selectedMedium={pendingMediumSelection?.medium}
        selectedManufacturer={
          pendingMediumSelection?.manufacturer === "" ? "Special" : pendingMediumSelection?.manufacturer
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

      <AsphericalModal
        key={asphericalModal.open ? asphericalModal.rowId : "aspherical-closed"}
        isOpen={asphericalModal.open}
        initialConicConstant={asphericalRow?.kind === "surface" ? (asphericalRow.aspherical?.conicConstant ?? 0) : 0}
        initialType={getInitialAsphericalType(asphericalRow)}
        initialCoefficients={getInitialAsphericalCoefficients(asphericalRow)}
        initialToricSweepRadiusOfCurvature={getInitialToricSweepRadiusOfCurvature(asphericalRow)}
        onConfirm={(params: {
          conicConstant: number;
          type: AsphericalType;
          polynomialCoefficients: number[];
          toricSweepRadiusOfCurvature: number;
        }) => {
          const aspherical = params.type === "EvenAspherical"
            ? {
                kind: "EvenAspherical" as const,
                conicConstant: params.conicConstant,
                polynomialCoefficients: params.polynomialCoefficients,
              }
            : params.type === "RadialPolynomial"
              ? {
                  kind: "RadialPolynomial" as const,
                  conicConstant: params.conicConstant,
                  polynomialCoefficients: params.polynomialCoefficients,
                }
              : params.type === "XToroid"
                ? {
                    kind: "XToroid" as const,
                    conicConstant: params.conicConstant,
                    toricSweepRadiusOfCurvature: params.toricSweepRadiusOfCurvature,
                    polynomialCoefficients: params.polynomialCoefficients,
                  }
                : params.type === "YToroid"
                  ? {
                      kind: "YToroid" as const,
                      conicConstant: params.conicConstant,
                      toricSweepRadiusOfCurvature: params.toricSweepRadiusOfCurvature,
                      polynomialCoefficients: params.polynomialCoefficients,
                    }
                  : {
                      kind: "Conic" as const,
                      conicConstant: params.conicConstant,
                    };
          store.getState().updateRow(asphericalModal.rowId, { aspherical });
          store.getState().closeAsphericalModal();
        }}
        onClose={() => store.getState().closeAsphericalModal()}
        onRemove={() => {
          store.getState().updateRow(asphericalModal.rowId, { aspherical: undefined });
          store.getState().closeAsphericalModal();
        }}
      />

      <DecenterModal
        key={decenterModal.open ? decenterModal.rowId : "decenter-closed"}
        isOpen={decenterModal.open}
        initialDecenter={decenterRow?.kind !== "object" ? decenterRow?.decenter : undefined}
        onConfirm={(decenter: DecenterType) => {
          store.getState().updateRow(decenterModal.rowId, { decenter });
          store.getState().closeDecenterModal();
        }}
        onClose={() => store.getState().closeDecenterModal()}
        onRemove={() => {
          store.getState().updateRow(decenterModal.rowId, { decenter: undefined });
          store.getState().closeDecenterModal();
        }}
      />

      <DiffractionGratingModal
        key={diffractionGratingModal.open ? diffractionGratingModal.rowId : "diffraction-grating-closed"}
        isOpen={diffractionGratingModal.open}
        initialDiffractionGrating={
          diffractionGratingRow?.kind === "surface" ? diffractionGratingRow.diffractionGrating : undefined
        }
        onConfirm={(diffractionGrating) => {
          store.getState().updateRow(diffractionGratingModal.rowId, { diffractionGrating });
          store.getState().closeDiffractionGratingModal();
        }}
        onClose={() => store.getState().closeDiffractionGratingModal()}
        onRemove={() => {
          store.getState().updateRow(diffractionGratingModal.rowId, { diffractionGrating: undefined });
          store.getState().closeDiffractionGratingModal();
        }}
      />

      <ApertureModal
        key={apertureModal.open ? apertureModal.rowId : "aperture-closed"}
        isOpen={apertureModal.open}
        autoAperture={autoAperture}
        semiDiameter={apertureRow?.kind === "surface" ? apertureRow.semiDiameter : 1}
        initialClearAperture={apertureRow?.kind === "surface" ? apertureRow.clear_aperture : undefined}
        initialEdgeAperture={apertureRow?.kind === "surface" ? apertureRow.edge_aperture : undefined}
        onConfirm={({ clear_aperture, edge_aperture }) => {
          store.getState().updateRow(apertureModal.rowId, {
            clear_aperture,
            edge_aperture,
            ...(clear_aperture.shape === "rectangular" ? { semiDiameter: 0 } : {}),
          });
          store.getState().closeApertureModal();
        }}
        onClose={() => store.getState().closeApertureModal()}
      />

      <PythonScriptModal
        isOpen={pythonScriptOpen}
        script={pythonScriptOpen ? buildExportScript(getOpticalModel()) : ""}
        onClose={() => setPythonScriptOpen(false)}
      />

      {formattingOpen && (
        <FormattingModal
          isOpen={formattingOpen}
          rows={rows}
          onConfirm={({ mode, rows: updatedRows }) => {
            if (mode === "reverse" && firstSurfaceNeedsReferenceSurface(updatedRows)) {
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
            store.getState().setRows(insertReferenceSurfaceAfterObject(pendingReferenceSurfaceRows));
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
