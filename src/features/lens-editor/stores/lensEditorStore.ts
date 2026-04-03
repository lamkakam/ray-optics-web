import { type StateCreator } from "zustand";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import { OBJECT_ROW_ID, IMAGE_ROW_ID } from "@/shared/lib/types/gridTypes";
import { generateRowId } from "@/shared/lib/utils/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

interface ModalState {
  open: boolean;
  rowId: string;
}

export interface LensEditorState {
  rows: GridRow[];
  selectedRowId: string | undefined;
  autoAperture: boolean;
  activeBottomDrawerTabId: string;
  mediumModal: ModalState;
  asphericalModal: ModalState;
  decenterModal: ModalState;
  committedOpticalModel: OpticalModel | undefined;

  setRows: (rows: GridRow[]) => void;
  updateRow: (id: string, patch: Partial<GridRow>) => void;
  addRowAfter: (id: string) => void;
  deleteRow: (id: string) => void;
  setSelectedRowId: (id: string | undefined) => void;
  setAutoAperture: (value: boolean) => void;
  setActiveBottomDrawerTabId: (id: string) => void;
  openMediumModal: (rowId: string) => void;
  closeMediumModal: () => void;
  openAsphericalModal: (rowId: string) => void;
  closeAsphericalModal: () => void;
  openDecenterModal: (rowId: string) => void;
  closeDecenterModal: () => void;
  setCommittedOpticalModel: (model: OpticalModel) => void;
}

const DEFAULT_ROWS: GridRow[] = [
  { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

export const createLensEditorSlice: StateCreator<LensEditorState> = (set, get) => ({
  rows: DEFAULT_ROWS,
  selectedRowId: undefined,
  autoAperture: false,
  activeBottomDrawerTabId: "specs",
  mediumModal: { open: false, rowId: "" },
  asphericalModal: { open: false, rowId: "" },
  decenterModal: { open: false, rowId: "" },
  committedOpticalModel: undefined,

  setRows: (rows) => set({ rows }),

  updateRow: (id, patch) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id, kind: r.kind } as GridRow : r
      ),
    })),

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
    set({ rows: newRows });
  },

  deleteRow: (id) => {
    const { rows } = get();
    const row = rows.find((r) => r.id === id);
    if (!row || row.kind !== "surface") return;

    set({
      rows: rows.filter((r) => r.id !== id),
      selectedRowId: get().selectedRowId === id ? undefined : get().selectedRowId,
    });
  },

  setSelectedRowId: (id) => set({ selectedRowId: id }),

  setAutoAperture: (value) => set({ autoAperture: value }),

  setActiveBottomDrawerTabId: (id) => set({ activeBottomDrawerTabId: id }),

  openMediumModal: (rowId) =>
    set({ mediumModal: { open: true, rowId } }),

  closeMediumModal: () =>
    set({ mediumModal: { open: false, rowId: "" } }),

  openAsphericalModal: (rowId) =>
    set({ asphericalModal: { open: true, rowId } }),

  closeAsphericalModal: () =>
    set({ asphericalModal: { open: false, rowId: "" } }),

  openDecenterModal: (rowId) =>
    set({ decenterModal: { open: true, rowId } }),

  closeDecenterModal: () =>
    set({ decenterModal: { open: false, rowId: "" } }),

  setCommittedOpticalModel: (model) => set({ committedOpticalModel: model }),
});
