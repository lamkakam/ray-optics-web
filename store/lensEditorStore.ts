import { create, type StateCreator } from "zustand";
import type { GridRow } from "@/lib/gridTypes";
import { gridRowsToSurfaces } from "@/lib/gridTransform";
import { generateRowId } from "@/lib/gridTransform";

interface ModalState {
  open: boolean;
  rowId: string;
}

export interface LensEditorState {
  rows: GridRow[];
  selectedRowId: string | undefined;
  mediumModal: ModalState;
  asphericalModal: ModalState;

  setRows: (rows: GridRow[]) => void;
  updateRow: (id: string, patch: Partial<GridRow>) => void;
  addRowAfterSelected: () => void;
  deleteSelectedRow: () => void;
  setSelectedRowId: (id: string | undefined) => void;
  openMediumModal: (rowId: string) => void;
  closeMediumModal: () => void;
  openAsphericalModal: (rowId: string) => void;
  closeAsphericalModal: () => void;
  exportToJson: () => string;
}

export const createLensEditorSlice: StateCreator<LensEditorState> = (set, get) => ({
  rows: [],
  selectedRowId: undefined,
  mediumModal: { open: false, rowId: "" },
  asphericalModal: { open: false, rowId: "" },

  setRows: (rows) => set({ rows }),

  updateRow: (id, patch) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id, kind: r.kind } : r
      ),
    })),

  addRowAfterSelected: () => {
    const { rows, selectedRowId } = get();
    if (selectedRowId === undefined) return;

    const selectedIndex = rows.findIndex((r) => r.id === selectedRowId);
    if (selectedIndex === -1) return;

    const selectedRow = rows[selectedIndex];
    if (selectedRow.kind !== "surface") return;

    const newRow: GridRow = {
      id: generateRowId(),
      kind: "surface",
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "air",
      semiDiameter: 1,
    };

    const newRows = [...rows];
    newRows.splice(selectedIndex + 1, 0, newRow);
    set({ rows: newRows });
  },

  deleteSelectedRow: () => {
    const { rows, selectedRowId } = get();
    if (selectedRowId === undefined) return;

    const selectedRow = rows.find((r) => r.id === selectedRowId);
    if (!selectedRow || selectedRow.kind !== "surface") return;

    set({
      rows: rows.filter((r) => r.id !== selectedRowId),
      selectedRowId: undefined,
    });
  },

  setSelectedRowId: (id) => set({ selectedRowId: id }),

  openMediumModal: (rowId) =>
    set({ mediumModal: { open: true, rowId } }),

  closeMediumModal: () =>
    set({ mediumModal: { open: false, rowId: "" } }),

  openAsphericalModal: (rowId) =>
    set({ asphericalModal: { open: true, rowId } }),

  closeAsphericalModal: () =>
    set({ asphericalModal: { open: false, rowId: "" } }),

  exportToJson: () => {
    const { rows } = get();
    const surfaces = gridRowsToSurfaces(rows);
    return JSON.stringify(surfaces, undefined, 2);
  },
});

export const useLensEditorStore = create<LensEditorState>(createLensEditorSlice);
