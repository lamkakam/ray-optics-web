"use client";

import React, { useState } from "react";
import { useStore, type StoreApi } from "zustand";
import { type LensEditorState } from "@/store/lensEditorStore";
import { type OpticalModel } from "@/lib/opticalModel";
import { buildExportScript } from "@/lib/pythonScript";
import { Button } from "@/components/micro/Button";
import { LensPrescriptionGrid } from "@/components/composite/LensPrescriptionGrid";
import { MediumSelectorModal } from "@/components/composite/MediumSelectorModal";
import { AsphericalModal, type AsphericalType } from "@/components/composite/AsphericalModal";
import { DecenterModal, type DecenterType } from "@/components/composite/DecenterModal";
import { PythonScriptModal } from "@/components/composite/PythonScriptModal";

interface LensPrescriptionContainerProps {
  readonly store: StoreApi<LensEditorState>;
  readonly getOpticalModel: () => OpticalModel;
}

export function LensPrescriptionContainer({
  store,
  getOpticalModel,
}: LensPrescriptionContainerProps) {
  const rows = useStore(store, (s) => s.rows);
  const mediumModal = useStore(store, (s) => s.mediumModal);
  const asphericalModal = useStore(store, (s) => s.asphericalModal);
  const decenterModal = useStore(store, (s) => s.decenterModal);
  const [pythonScriptOpen, setPythonScriptOpen] = useState(false);

  const mediumRow = rows.find((r) => r.id === mediumModal.rowId);
  const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);
  const decenterRow = rows.find((r) => r.id === decenterModal.rowId);

  const handleExport = () => {
    const json = store.getState().exportToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lens-prescription.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div role="toolbar" aria-label="Grid toolbar" className="mb-2 flex gap-2">
        <Button variant="primary" size="sm" onClick={handleExport}>Export JSON</Button>
        <Button variant="secondary" size="sm" onClick={() => setPythonScriptOpen(true)}>Export Python Script</Button>
      </div>

      <LensPrescriptionGrid
        rows={rows}
        onRowChange={(id, patch) => store.getState().updateRow(id, patch)}
        onOpenMediumModal={(rowId) => store.getState().openMediumModal(rowId)}
        onOpenAsphericalModal={(rowId) => store.getState().openAsphericalModal(rowId)}
        onOpenDecenterModal={(rowId) => store.getState().openDecenterModal(rowId)}
        onAddRowAfter={(rowId) => store.getState().addRowAfter(rowId)}
        onDeleteRow={(rowId) => store.getState().deleteRow(rowId)}
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
        script={pythonScriptOpen ? buildExportScript(getOpticalModel(), "manualAperture") : ""}
        onClose={() => setPythonScriptOpen(false)}
      />
    </div>
  );
}
