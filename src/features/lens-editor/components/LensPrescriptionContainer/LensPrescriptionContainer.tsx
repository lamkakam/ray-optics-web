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
