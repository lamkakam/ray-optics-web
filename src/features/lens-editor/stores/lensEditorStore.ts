import { type StateCreator } from "zustand";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { OBJECT_ROW_ID, IMAGE_ROW_ID } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { generateRowId } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

interface ModalState {
  open: boolean;
  rowId: string;
}

interface PendingMediumSelection {
  rowId: string;
  medium: string;
  manufacturer: string;
}

export type LensEditorOptimizationSyncPolicy = "resetOptimizationModes" | "preserveOptimizationModes";

interface PrescriptionMutationOptions {
  readonly optimizationSyncPolicy?: LensEditorOptimizationSyncPolicy;
}

export interface LensEditorState {
  rows: GridRow[];
  prescriptionRevision: number;
  optimizationSyncPolicy: LensEditorOptimizationSyncPolicy;
  selectedRowId: string | undefined;
  autoAperture: boolean;
  activeBottomDrawerTabId: string;
  bottomDrawerHeight: number | undefined;
  mediumModal: ModalState;
  pendingMediumSelection: PendingMediumSelection | undefined;
  asphericalModal: ModalState;
  decenterModal: ModalState;
  diffractionGratingModal: ModalState;
  committedOpticalModel: OpticalModel | undefined;

  setRows: (rows: GridRow[], options?: PrescriptionMutationOptions) => void;
  updateRow: (id: string, patch: Partial<GridRow>, options?: PrescriptionMutationOptions) => void;
  addRowAfter: (id: string) => void;
  deleteRow: (id: string) => void;
  setSelectedRowId: (id: string | undefined) => void;
  setAutoAperture: (value: boolean) => void;
  setActiveBottomDrawerTabId: (id: string) => void;
  setBottomDrawerHeight: (height: number) => void;
  openMediumModal: (rowId: string) => void;
  updatePendingMediumSelection: (patch: Pick<PendingMediumSelection, "medium" | "manufacturer">) => void;
  commitPendingMediumSelection: (selection?: Pick<PendingMediumSelection, "medium" | "manufacturer">) => void;
  closeMediumModal: () => void;
  openAsphericalModal: (rowId: string) => void;
  closeAsphericalModal: () => void;
  openDecenterModal: (rowId: string) => void;
  closeDecenterModal: () => void;
  openDiffractionGratingModal: (rowId: string) => void;
  closeDiffractionGratingModal: () => void;
  setCommittedOpticalModel: (model: OpticalModel) => void;
}

function derivePendingMediumSelection(rows: GridRow[], rowId: string): PendingMediumSelection | undefined {
  const row = rows.find((item) => item.id === rowId);
  if (row?.kind !== "surface" && row?.kind !== "object") {
    return undefined;
  }

  return {
    rowId,
    medium: row.medium,
    manufacturer: row.manufacturer,
  };
}

const DEFAULT_ROWS: GridRow[] = [
  { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0, medium: "air", manufacturer: "" },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

export const createLensEditorSlice: StateCreator<LensEditorState> = (set, get) => ({
  rows: DEFAULT_ROWS,
  prescriptionRevision: 0,
  optimizationSyncPolicy: "resetOptimizationModes",
  selectedRowId: undefined,
  autoAperture: false,
  activeBottomDrawerTabId: "specs",
  bottomDrawerHeight: undefined,
  mediumModal: { open: false, rowId: "" },
  pendingMediumSelection: undefined,
  asphericalModal: { open: false, rowId: "" },
  decenterModal: { open: false, rowId: "" },
  diffractionGratingModal: { open: false, rowId: "" },
  committedOpticalModel: undefined,

  setRows: (rows, options) =>
    set((state) => ({
      rows,
      prescriptionRevision: state.prescriptionRevision + 1,
      optimizationSyncPolicy: options?.optimizationSyncPolicy ?? "resetOptimizationModes",
    })),

  updateRow: (id, patch, options) =>
    set((state) => {
      const rowExists = state.rows.some((row) => row.id === id);
      if (!rowExists) {
        return state;
      }

      return {
        rows: state.rows.map((r) =>
          r.id === id ? { ...r, ...patch, id: r.id, kind: r.kind } as GridRow : r
        ),
        prescriptionRevision: state.prescriptionRevision + 1,
        optimizationSyncPolicy: options?.optimizationSyncPolicy ?? "resetOptimizationModes",
      };
    }),

  addRowAfter: (id) => {
    const { rows } = get();
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return;

    const row = rows[index];
    if (row.kind === "image") return;

    const newRow: GridRow = {
      id: generateRowId(),
      kind: "surface",
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 1,
    };

    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    set((state) => ({
      rows: newRows,
      prescriptionRevision: state.prescriptionRevision + 1,
      optimizationSyncPolicy: "resetOptimizationModes",
    }));
  },

  deleteRow: (id) => {
    const { rows } = get();
    const row = rows.find((r) => r.id === id);
    if (!row || row.kind !== "surface") return;

    set((state) => ({
      rows: rows.filter((r) => r.id !== id),
      selectedRowId: state.selectedRowId === id ? undefined : state.selectedRowId,
      prescriptionRevision: state.prescriptionRevision + 1,
      optimizationSyncPolicy: "resetOptimizationModes",
    }));
  },

  setSelectedRowId: (id) => set({ selectedRowId: id }),

  setAutoAperture: (value) => set({ autoAperture: value }),

  setActiveBottomDrawerTabId: (id) => set({ activeBottomDrawerTabId: id }),

  setBottomDrawerHeight: (height) => set({ bottomDrawerHeight: height }),

  openMediumModal: (rowId) =>
    set((state) => ({
      mediumModal: { open: true, rowId },
      pendingMediumSelection: derivePendingMediumSelection(state.rows, rowId),
    })),

  updatePendingMediumSelection: (patch) =>
    set((state) => {
      if (state.pendingMediumSelection === undefined) {
        return state;
      }

      return {
        pendingMediumSelection: {
          ...state.pendingMediumSelection,
          ...patch,
        },
      };
    }),

  commitPendingMediumSelection: (selection) => {
    const pendingSelection = get().pendingMediumSelection;
    if (pendingSelection === undefined) {
      if (selection === undefined) {
        get().closeMediumModal();
        return;
      }

      const rowId = get().mediumModal.rowId;
      if (rowId !== "") {
        get().updateRow(rowId, {
          medium: selection.medium,
          manufacturer: selection.manufacturer,
        });
      }
      set({
        mediumModal: { open: false, rowId: "" },
        pendingMediumSelection: undefined,
      });
      return;
    }

    const confirmedSelection = selection ?? {
      medium: pendingSelection.medium,
      manufacturer: pendingSelection.manufacturer,
    };
    if (pendingSelection.rowId === "") {
      get().closeMediumModal();
      return;
    }

    get().updateRow(pendingSelection.rowId, {
      medium: confirmedSelection.medium,
      manufacturer: confirmedSelection.manufacturer,
    });
    set({
      mediumModal: { open: false, rowId: "" },
      pendingMediumSelection: undefined,
    });
  },

  closeMediumModal: () =>
    set({
      mediumModal: { open: false, rowId: "" },
      pendingMediumSelection: undefined,
    }),

  openAsphericalModal: (rowId) =>
    set({ asphericalModal: { open: true, rowId } }),

  closeAsphericalModal: () =>
    set({ asphericalModal: { open: false, rowId: "" } }),

  openDecenterModal: (rowId) =>
    set({ decenterModal: { open: true, rowId } }),

  closeDecenterModal: () =>
    set({ decenterModal: { open: false, rowId: "" } }),

  openDiffractionGratingModal: (rowId) =>
    set({ diffractionGratingModal: { open: true, rowId } }),

  closeDiffractionGratingModal: () =>
    set({ diffractionGratingModal: { open: false, rowId: "" } }),

  setCommittedOpticalModel: (model) => set({ committedOpticalModel: model }),
});
