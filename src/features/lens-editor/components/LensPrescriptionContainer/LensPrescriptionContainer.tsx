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
import { FormattingModal } from "./FormattingModal";
import { PythonScriptModal } from "./PythonScriptModal";

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
  const buttonSize = screenSize === "screenSM" ? "xs" : "sm";
  const store = useLensEditorStore();
  const rows = useStore(store, (s) => s.rows);
  const autoAperture = useStore(store, (s) => s.autoAperture);
  const mediumModal = useStore(store, (s) => s.mediumModal);
  const pendingMediumSelection = useStore(store, (s) => s.pendingMediumSelection);
  const asphericalModal = useStore(store, (s) => s.asphericalModal);
  const decenterModal = useStore(store, (s) => s.decenterModal);
  const diffractionGratingModal = useStore(store, (s) => s.diffractionGratingModal);
  const formattingMode = useStore(store, (s) => s.formattingMode);
  const formattingScaleFactor = useStore(store, (s) => s.formattingScaleFactor);
  const formattingScaleFirstSurface = useStore(store, (s) => s.formattingScaleFirstSurface);
  const formattingScaleLastSurface = useStore(store, (s) => s.formattingScaleLastSurface);
  const formattingReverseFirstSurface = useStore(store, (s) => s.formattingReverseFirstSurface);
  const formattingReverseLastSurface = useStore(store, (s) => s.formattingReverseLastSurface);
  const [pythonScriptOpen, setPythonScriptOpen] = useState(false);
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [formattingError, setFormattingError] = useState<string | undefined>(undefined);

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
  const handleAddRowAfter = useCallback((rowId: string) => store.getState().addRowAfter(rowId), [store]);
  const handleDeleteRow = useCallback((rowId: string) => store.getState().deleteRow(rowId), [store]);

  const mediumRow = rows.find((r) => r.id === mediumModal.rowId);
  const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);
  const decenterRow = rows.find((r) => r.id === decenterModal.rowId);
  const diffractionGratingRow = rows.find((r) => r.id === diffractionGratingModal.rowId);
  const isObjectMediumRow = mediumRow?.kind === "object";

  return (
    <div>
      <div role="toolbar" aria-label="Grid toolbar" className="mb-2 flex gap-2">
        <Tooltip text="Generate a Python script" portal noTouch>
          <Button variant="secondary" size={buttonSize} onClick={() => setPythonScriptOpen(true)}>Export Python Script</Button>
        </Tooltip>
        <Tooltip text="Format selected prescription rows" portal noTouch>
          <Button variant="secondary" size={buttonSize} onClick={() => setFormattingOpen(true)}>Formatting</Button>
        </Tooltip>
      </div>

      <div className="mt-2 mb-2 flex items-center gap-2">
        <Label htmlFor="auto-aperture-toggle">Set auto semi-diameter:</Label>
        <Tooltip text={autoAperture ? "Turn off auto semi-diameter" : "Turn on auto semi-diameter"} noTouch>
          <Switch
            id="auto-aperture-toggle"
            checked={autoAperture}
            onCheckedChange={(checked) => store.getState().setAutoAperture(checked)}
            ariaLabel="Set auto semi-diameter"
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
        onAddRowAfter={handleAddRowAfter}
        onDeleteRow={handleDeleteRow}
        semiDiameterReadonly={autoAperture}
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

      <PythonScriptModal
        isOpen={pythonScriptOpen}
        script={pythonScriptOpen ? buildExportScript(getOpticalModel()) : ""}
        onClose={() => setPythonScriptOpen(false)}
      />

      <FormattingModal
        isOpen={formattingOpen}
        rows={rows}
        draft={{
          mode: formattingMode,
          scaleFactor: formattingScaleFactor,
          scaleFirstSurface: formattingScaleFirstSurface,
          scaleLastSurface: formattingScaleLastSurface,
          reverseFirstSurface: formattingReverseFirstSurface,
          reverseLastSurface: formattingReverseLastSurface,
        }}
        draftActions={{
          setMode: (mode) => store.getState().setFormattingMode(mode),
          setScaleFactor: (factor) => store.getState().setFormattingScaleFactor(factor),
          setScaleFirstSurface: (surface) => store.getState().setFormattingScaleFirstSurface(surface),
          setScaleLastSurface: (surface) => store.getState().setFormattingScaleLastSurface(surface),
          setReverseFirstSurface: (surface) => store.getState().setFormattingReverseFirstSurface(surface),
          setReverseLastSurface: (surface) => store.getState().setFormattingReverseLastSurface(surface),
        }}
        onConfirm={(updatedRows) => {
          store.getState().setRows(updatedRows);
          setFormattingOpen(false);
        }}
        onCancel={() => setFormattingOpen(false)}
        onError={setFormattingError}
      />

      <ErrorModal
        isOpen={formattingError !== undefined}
        message={formattingError}
        onClose={() => setFormattingError(undefined)}
      />

    </div>
  );
}
