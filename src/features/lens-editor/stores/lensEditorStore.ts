/**
 * `autoSemiDiameters` is an app-lifetime cache keyed by stable surface row ID. Its actions replace or clear computed values without changing editable manual `rows[].semiDiameter` values.
 *
 * @remarks
 * Zustand store for managing the lens editor grid and its associated modals. Holds the array of `GridRow` objects displayed in the surface table and coordinates selection, insertion, deletion, and modal open/close state.
 *
 * ## Key Conventions
 *
 * - Object and image rows (`kind === "object"` / `kind === "image"`) cannot be deleted or added after (image guard in `addRowAfter`).
 * - Normal row replacements, row edits, row insertions, and row deletions use `optimizationSyncPolicy: "resetOptimizationModes"` so Optimization clears stale radius/thickness/asphere variable modes after ordinary editor prescription edits.
 * - Optimization Apply and Focusing may pass `optimizationSyncPolicy: "preserveOptimizationModes"` because those prescription updates originate from Optimization-compatible workflows and should not clear Optimization prescription modes.
 * - The default object row is `{ objectDistance: OBJECT_DISTANCE_INFINITY_THRESHOLD, medium: "air", manufacturer: "" }`, currently `1e10`.
 * - New rows inserted by `addRowAfter` are seeded with `generateRowId()` and default surface values: flat (`curvatureRadius: 0`), zero thickness, `"air"` medium, `semiDiameter: 1`.
 * - Modal `rowId` is reset to `""` on close.
 * - `pendingMediumSelection` persists unconfirmed catalog-glass choices across route changes while the root store provider remains mounted.
 * - `activeBottomDrawerTabId` and `bottomDrawerHeight` are feature-owned UI state. They persist as long as the root store provider remains mounted.
 * - `bottomDrawerHeight` is persistence-only state for route restoration; `BottomDrawer` still owns live drag state locally to avoid store-driven re-renders on every pointer move.
 * - Formatting draft controls are intentionally not stored here. `FormattingModal` owns them locally so Cancel and successful Confirm discard drafts when the modal unmounts, and reopening recomputes defaults from current rows.
 *
 * ## Dependencies
 *
 * - `create`, `StateCreator` from `zustand`.
 * - `GridRow`, `OBJECT_ROW_ID`, `IMAGE_ROW_ID` from `@/shared/lib/lens-prescription-grid/types/gridTypes`.
 * - `generateRowId` from `@/shared/lib/lens-prescription-grid/lib/gridTransform`.
 * - `OpticalModel` from `@/shared/lib/types/opticalModel`.
 *
 * Used through `LensEditorStoreProvider` and `useLensEditorStore()` rather than as a standalone exported hook from this file.
 */
import { type StateCreator } from "zustand";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { OBJECT_ROW_ID, IMAGE_ROW_ID } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { generateRowId } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { OBJECT_DISTANCE_INFINITY_THRESHOLD } from "@/shared/lib/lens-prescription-grid/lib/prescriptionFormatting";
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
  /** Surface-grid rows. Defaults to the object and image rows. */
  rows: GridRow[];
  /** Monotonically increasing prescription mutation counter. Defaults to `0`. */
  prescriptionRevision: number;
  /** Policy Optimization should use for the latest prescription mutation. Defaults to `"resetOptimizationModes"`. */
  optimizationSyncPolicy: LensEditorOptimizationSyncPolicy;
  /** Selected grid-row ID, or `undefined` when no row is selected. */
  selectedRowId: string | undefined;
  /** Whether automatic aperture calculation is enabled. Defaults to `false`. */
  autoAperture: boolean;
  /** App-lifetime computed semi-diameter cache keyed by stable row ID. Defaults to an empty object and does not alter manual row values. */
  autoSemiDiameters: Readonly<Record<string, number>>;
  /** Active bottom-drawer tab ID, persisted across route changes. Defaults to `"specs"`. */
  activeBottomDrawerTabId: string;
  /** Last committed bottom-drawer height for route restoration, initially `undefined`. */
  bottomDrawerHeight: number | undefined;
  /** Medium-picker modal state. Defaults to closed with an empty row ID. */
  mediumModal: ModalState;
  /** Unconfirmed medium selection, or `undefined` when no draft exists. */
  pendingMediumSelection: PendingMediumSelection | undefined;
  /** Aspherical-coefficients modal state. Defaults to closed with an empty row ID. */
  asphericalModal: ModalState;
  /** Surface-decenter modal state. Defaults to closed with an empty row ID. */
  decenterModal: ModalState;
  /** Diffraction-grating modal state. Defaults to closed with an empty row ID. */
  diffractionGratingModal: ModalState;
  /** Surface-aperture modal state. Defaults to closed with an empty row ID. */
  apertureModal: ModalState;
  /** Last successfully submitted optical-model snapshot, initially `undefined`. */
  committedOpticalModel: OpticalModel | undefined;

  /** Replaces all rows, increments `prescriptionRevision`, and records the supplied sync policy or the reset policy by default. */
  setRows: (rows: GridRow[], options?: PrescriptionMutationOptions) => void;
  /** Merges a patch into an existing row while preserving its `id` and `kind`, then increments the revision and records the sync policy. Does nothing when `id` is absent. */
  updateRow: (id: string, patch: Partial<GridRow>, options?: PrescriptionMutationOptions) => void;
  /** Inserts a default surface after `id` and increments the revision. Does nothing for an unknown ID or the image row. */
  addRowAfter: (id: string) => void;
  /** Deletes a surface row, clears its selection, and increments the revision. Does nothing for missing, object, or image rows. */
  deleteRow: (id: string) => void;
  /** Sets or clears the selected row ID. */
  setSelectedRowId: (id: string | undefined) => void;
  /** Enables or disables automatic aperture calculation. */
  setAutoAperture: (value: boolean) => void;
  /** Replaces the computed semi-diameter cache without changing editable manual semi-diameters. */
  setAutoSemiDiameters: (values: Readonly<Record<string, number>>) => void;
  /** Clears the computed semi-diameter cache without changing editable manual semi-diameters. */
  clearAutoSemiDiameters: () => void;
  /** Persists the active bottom-drawer tab ID across route changes. */
  setActiveBottomDrawerTabId: (id: string) => void;
  /** Persists the latest committed bottom-drawer height across route changes. */
  setBottomDrawerHeight: (height: number) => void;
  /** Opens the medium picker for `rowId` and seeds its pending draft from a valid object or surface row. */
  openMediumModal: (rowId: string) => void;
  /** Updates the pending medium and manufacturer when a draft exists; otherwise does nothing. */
  updatePendingMediumSelection: (patch: Pick<PendingMediumSelection, "medium" | "manufacturer">) => void;
  /** Commits the explicit selection or pending draft to its target row, then closes the modal and clears the draft. Does nothing when no selection is available. */
  commitPendingMediumSelection: (selection?: Pick<PendingMediumSelection, "medium" | "manufacturer">) => void;
  /** Closes the medium picker, resets its row ID, and discards the pending draft. */
  closeMediumModal: () => void;
  /** Opens the aspherical-coefficients modal for a row. */
  openAsphericalModal: (rowId: string) => void;
  /** Closes the aspherical-coefficients modal and resets its row ID. */
  closeAsphericalModal: () => void;
  /** Opens the surface-decenter modal for a row. */
  openDecenterModal: (rowId: string) => void;
  /** Closes the surface-decenter modal and resets its row ID. */
  closeDecenterModal: () => void;
  /** Opens the diffraction-grating modal for a row. */
  openDiffractionGratingModal: (rowId: string) => void;
  /** Closes the diffraction-grating modal and resets its row ID. */
  closeDiffractionGratingModal: () => void;
  /** Opens the surface-aperture modal for a row. */
  openApertureModal: (rowId: string) => void;
  /** Closes the surface-aperture modal and resets its row ID. */
  closeApertureModal: () => void;
  /** Stores the last successfully submitted optical-model snapshot for analysis consumers. */
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
  {
    id: OBJECT_ROW_ID,
    kind: "object",
    objectDistance: OBJECT_DISTANCE_INFINITY_THRESHOLD,
    medium: "air",
    manufacturer: "",
  },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

export const createLensEditorSlice: StateCreator<LensEditorState> = (set, get) => ({
  rows: DEFAULT_ROWS,
  prescriptionRevision: 0,
  optimizationSyncPolicy: "resetOptimizationModes",
  selectedRowId: undefined,
  autoAperture: false,
  autoSemiDiameters: {},
  activeBottomDrawerTabId: "specs",
  bottomDrawerHeight: undefined,
  mediumModal: { open: false, rowId: "" },
  pendingMediumSelection: undefined,
  asphericalModal: { open: false, rowId: "" },
  decenterModal: { open: false, rowId: "" },
  diffractionGratingModal: { open: false, rowId: "" },
  apertureModal: { open: false, rowId: "" },
  committedOpticalModel: undefined,

  setRows: (rows, options) =>
    set((state) => {
      return {
        rows,
        prescriptionRevision: state.prescriptionRevision + 1,
        optimizationSyncPolicy: options?.optimizationSyncPolicy ?? "resetOptimizationModes",
      };
    }),

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

  setAutoSemiDiameters: (values) => set({ autoSemiDiameters: { ...values } }),

  clearAutoSemiDiameters: () => set({ autoSemiDiameters: {} }),

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

  openApertureModal: (rowId) =>
    set({ apertureModal: { open: true, rowId } }),

  closeApertureModal: () =>
    set({ apertureModal: { open: false, rowId: "" } }),

  setCommittedOpticalModel: (model) => set({ committedOpticalModel: model }),
});
