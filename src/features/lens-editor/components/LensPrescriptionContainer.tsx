"use client";

import React, { useState, useRef, useCallback } from "react";
import { useStore, type StoreApi } from "zustand";
import { type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { type GridRow } from "@/shared/lib/types/gridTypes";
import { type OpticalModel } from "@/shared/lib/types/opticalModel";
import { buildExportScript } from "@/shared/lib/utils/pythonScript";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import { Button } from "@/shared/components/primitives/Button";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { Label } from "@/shared/components/primitives/Label";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LensPrescriptionGrid } from "@/features/lens-editor/components/LensPrescriptionGrid";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";
import { AsphericalModal, type AsphericalType } from "@/features/lens-editor/components/AsphericalModal";
import { DecenterModal, type DecenterType } from "@/features/lens-editor/components/DecenterModal";
import { PythonScriptModal } from "@/features/lens-editor/components/PythonScriptModal";
import { ConfirmImportModal } from "@/features/lens-editor/components/ConfirmImportModal";

interface LensPrescriptionContainerProps {
  readonly store: StoreApi<LensEditorState>;
  readonly getOpticalModel: () => OpticalModel;
  readonly onImportJson: (data: OpticalModel) => void;
  readonly onUpdateSystem: () => void;
  readonly isUpdateSystemDisabled: boolean;
}

export function LensPrescriptionContainer({
  store,
  getOpticalModel,
  onImportJson,
  onUpdateSystem,
  isUpdateSystemDisabled,
}: LensPrescriptionContainerProps) {
  const screenSize = useScreenBreakpoint();
  const buttonSize = screenSize === "screenSM" ? "xs" : "sm";
  const rows = useStore(store, (s) => s.rows);
  const autoAperture = useStore(store, (s) => s.autoAperture);
  const mediumModal = useStore(store, (s) => s.mediumModal);
  const asphericalModal = useStore(store, (s) => s.asphericalModal);
  const decenterModal = useStore(store, (s) => s.decenterModal);
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
  const handleAddRowAfter = useCallback((rowId: string) => store.getState().addRowAfter(rowId), [store]);
  const handleDeleteRow = useCallback((rowId: string) => store.getState().deleteRow(rowId), [store]);

  const mediumRow = rows.find((r) => r.id === mediumModal.rowId);
  const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);
  const decenterRow = rows.find((r) => r.id === decenterModal.rowId);

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
        onAddRowAfter={handleAddRowAfter}
        onDeleteRow={handleDeleteRow}
        semiDiameterReadonly={autoAperture}
      />

      <MediumSelectorModal
        key={mediumModal.open ? mediumModal.rowId : "medium-closed"}
        isOpen={mediumModal.open}
        initialMedium={mediumRow?.kind === "surface" ? mediumRow.medium : "air"}
        initialManufacturer={mediumRow?.kind === "surface" ? mediumRow.manufacturer : ""}
        onConfirm={(medium, manufacturer) => {
          store.getState().updateRow(mediumModal.rowId, { medium, manufacturer });
          store.getState().closeMediumModal();
        }}
        onClose={() => store.getState().closeMediumModal()}
      />

      <AsphericalModal
        key={asphericalModal.open ? asphericalModal.rowId : "aspherical-closed"}
        isOpen={asphericalModal.open}
        initialConicConstant={asphericalRow?.kind === "surface" ? (asphericalRow.aspherical?.conicConstant ?? 0) : 0}
        initialType={
          asphericalRow?.kind === "surface" && asphericalRow.aspherical?.polynomialCoefficients?.length
            ? "EvenAspherical"
            : "Conical"
        }
        initialCoefficients={asphericalRow?.kind === "surface" ? (asphericalRow.aspherical?.polynomialCoefficients ?? []) : []}
        onConfirm={(params: { conicConstant: number; type: AsphericalType; polynomialCoefficients: number[] }) => {
          const aspherical = {
            conicConstant: params.conicConstant,
            ...(params.polynomialCoefficients.length > 0
              ? { polynomialCoefficients: params.polynomialCoefficients }
              : {}),
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
