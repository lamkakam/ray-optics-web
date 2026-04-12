"use client";

import React, { useState, useRef, useCallback } from "react";
import { useStore } from "zustand";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { type GridRow } from "@/shared/lib/types/gridTypes";
import type { OpticalModel, AsphericalType } from "@/shared/lib/types/opticalModel";
import { buildExportScript } from "@/shared/lib/utils/pythonScript";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import { Button } from "@/shared/components/primitives/Button";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { Label } from "@/shared/components/primitives/Label";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LensPrescriptionGrid } from "@/features/lens-editor/components/LensPrescriptionGrid";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";
import { AsphericalModal } from "@/features/lens-editor/components/AsphericalModal";
import { DecenterModal, type DecenterType } from "@/features/lens-editor/components/DecenterModal";
import { DiffractionGratingModal } from "@/features/lens-editor/components/DiffractionGratingModal";
import { PythonScriptModal } from "@/features/lens-editor/components/PythonScriptModal";
import { ConfirmImportModal } from "@/features/lens-editor/components/ConfirmImportModal";

interface LensPrescriptionContainerProps {
  readonly getOpticalModel: () => OpticalModel;
  readonly onImportJson: (data: OpticalModel) => void;
  readonly onUpdateSystem: () => void;
  readonly isUpdateSystemDisabled: boolean;
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
  onImportJson,
  onUpdateSystem,
  isUpdateSystemDisabled,
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
  const [pythonScriptOpen, setPythonScriptOpen] = useState(false);
  const [importErrorOpen, setImportErrorOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<OpticalModel | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = () => {
    const json = JSON.stringify(getOpticalModel(), undefined, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lens-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.target?.result as string);
        if (validateImportedLensData(parsed)) {
          setPendingImportData(parsed);
        } else {
          setImportErrorOpen(true);
        }
      } catch {
        setImportErrorOpen(true);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (pendingImportData) onImportJson(pendingImportData);
    setPendingImportData(undefined);
  };

  const handleCancelImport = () => setPendingImportData(undefined);

  return (
    <div>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div role="toolbar" aria-label="Grid toolbar" className="mb-2 flex gap-2">
        <Tooltip text="Compute and update the optical system" position="top-start" portal noTouch>
          <Button variant="primary" size={buttonSize} disabled={isUpdateSystemDisabled} onClick={onUpdateSystem} aria-label="Update System">Update System</Button>
        </Tooltip>
        <Tooltip text="Load a previously downloaded config" position="top-start" portal noTouch>
          <Button variant="primary" size={buttonSize} onClick={handleImportClick} aria-label="Load Config">Load Config</Button>
        </Tooltip>
        <Tooltip text="Download current config as JSON" portal noTouch>
          <Button variant="primary" size={buttonSize} onClick={handleExport} aria-label="Download Config">Download Config</Button>
        </Tooltip>
        <Tooltip text="Generate a Python script" portal noTouch>
          <Button variant="secondary" size={buttonSize} onClick={() => setPythonScriptOpen(true)}>Export Python Script</Button>
        </Tooltip>
      </div>

      <div className="mt-2 mb-2 flex items-center gap-2">
        <Label htmlFor="auto-aperture-toggle">Semi-diameter</Label>
        <Tooltip text={autoAperture ? "Click to toggle off Auto semi-diameter" : "Click to toggle on Auto semi-diameter"} noTouch>
          <Button
            id="auto-aperture-toggle"
            variant="secondary"
            size={buttonSize}
            aria-pressed={autoAperture}
            onClick={() => store.getState().setAutoAperture(!autoAperture)}
          >
            {autoAperture ? "Auto" : "Manual"}
          </Button>
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
        initialMedium={mediumRow?.kind === "surface" ? mediumRow.medium : "air"}
        initialManufacturer={mediumRow?.kind === "surface" ? mediumRow.manufacturer : ""}
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

      <ConfirmImportModal
        isOpen={pendingImportData !== undefined}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />

      <ErrorModal
        isOpen={importErrorOpen}
        message="The JSON file is invalid. Schema validation failed."
        onClose={() => setImportErrorOpen(false)}
      />
    </div>
  );
}
