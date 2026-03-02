"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { createStore, useStore } from "zustand";
import type { Surfaces } from "@/lib/opticalModel";
import type { GridRow } from "@/lib/gridTypes";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { LensPrescriptionGrid } from "@/components/composite/LensPrescriptionGrid";
import { MediumSelectorModal } from "@/components/composite/MediumSelectorModal";
import { AsphericalModal, type AsphericalType } from "@/components/composite/AsphericalModal";

interface LensPrescriptionContainerProps {
  readonly initialSurfaces: Surfaces;
  readonly onSurfacesChange: (surfaces: Surfaces) => void;
  readonly onFetchGlassList: (manufacturer: string) => Promise<string[]>;
}

export function LensPrescriptionContainer({
  initialSurfaces,
  onSurfacesChange,
  onFetchGlassList,
}: LensPrescriptionContainerProps) {
  const store = useMemo(() => createStore<LensEditorState>(createLensEditorSlice), []);

  const rows = useStore(store, (s) => s.rows);
  const mediumModal = useStore(store, (s) => s.mediumModal);
  const asphericalModal = useStore(store, (s) => s.asphericalModal);

  // Initialize rows from props
  useEffect(() => {
    store.getState().setRows(surfacesToGridRows(initialSurfaces));
  }, [initialSurfaces, store]);

  // Notify parent when rows change
  const prevRowsRef = useRef<GridRow[]>([]);
  useEffect(() => {
    if (rows.length === 0) return;
    if (rows === prevRowsRef.current) return;
    prevRowsRef.current = rows;
    onSurfacesChange(gridRowsToSurfaces(rows));
  }, [rows, onSurfacesChange]);

  const mediumRow = rows.find((r) => r.id === mediumModal.rowId);
  const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);

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
      <div role="toolbar" aria-label="Grid toolbar">
        <button type="button" onClick={handleExport}>
          Export JSON
        </button>
      </div>

      <LensPrescriptionGrid
        rows={rows}
        onRowChange={(id, patch) => store.getState().updateRow(id, patch)}
        onOpenMediumModal={(rowId) => store.getState().openMediumModal(rowId)}
        onOpenAsphericalModal={(rowId) => store.getState().openAsphericalModal(rowId)}
        onAddRowAfter={(rowId) => store.getState().addRowAfter(rowId)}
        onDeleteRow={(rowId) => store.getState().deleteRow(rowId)}
      />

      <MediumSelectorModal
        key={mediumModal.open ? mediumModal.rowId : "medium-closed"}
        isOpen={mediumModal.open}
        initialMedium={mediumRow?.medium ?? "air"}
        initialManufacturer={mediumRow?.manufacturer ?? "air"}
        onConfirm={(medium, manufacturer) => {
          store.getState().updateRow(mediumModal.rowId, { medium, manufacturer });
          store.getState().closeMediumModal();
        }}
        onClose={() => store.getState().closeMediumModal()}
        onFetchGlassList={onFetchGlassList}
      />

      <AsphericalModal
        key={asphericalModal.open ? asphericalModal.rowId : "aspherical-closed"}
        isOpen={asphericalModal.open}
        initialConicConstant={asphericalRow?.aspherical?.conicConstant ?? 0}
        initialType={
          asphericalRow?.aspherical?.polynomialCoefficients?.length
            ? "EvenAspherical"
            : "Conical"
        }
        initialCoefficients={asphericalRow?.aspherical?.polynomialCoefficients ?? []}
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
    </div>
  );
}
