/**
`autoSemiDiameters` is an app-lifetime cache keyed by stable surface row ID. Its actions replace or clear computed values without changing editable manual `rows[].semiDiameter` values.

Zustand store for managing the lens editor grid and its associated modals. Holds the array of `GridRow` objects displayed in the surface table and coordinates selection, insertion, deletion, and modal open/close state.

## State

| Field | Type | Default |
|---|---|---|
| `rows` | `GridRow[]` | `[OBJECT_ROW, IMAGE_ROW]` |
| `prescriptionRevision` | `number` | `0` |
| `optimizationSyncPolicy` | `"resetOptimizationModes" \| "preserveOptimizationModes"` | `"resetOptimizationModes"` |
| `selectedRowId` | `string \| undefined` | `undefined` |
| `autoAperture` | `boolean` | `false` |
| `activeBottomDrawerTabId` | `string` | `"specs"` |
| `bottomDrawerHeight` | `number \| undefined` | `undefined` |
| `mediumModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `pendingMediumSelection` | `{ rowId: string; medium: string; manufacturer: string } \| undefined` | `undefined` |
| `asphericalModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `decenterModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `diffractionGratingModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `apertureModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `committedOpticalModel` | `OpticalModel \| undefined` | `undefined` |

## Actions

- `setRows(rows, options?)` — replaces the entire rows array (used when loading a model), increments `prescriptionRevision`, and records an optional Optimization sync policy.
- `updateRow(id, patch, options?)` — merges `patch` into the row with the given id; `id` and `kind` are always preserved and cannot be overwritten by the patch. Successful updates increment `prescriptionRevision` and record an optional Optimization sync policy.
- `addRowAfter(id)` — inserts a new blank surface row immediately after the row with the given id; no-op if the id is not found or the target row is the image row.
- `deleteRow(id)` — removes the surface row with the given id; no-op for object/image rows. Clears `selectedRowId` if it matches the deleted row.
- `setSelectedRowId(id)` — sets or clears the selected row.
- `setAutoAperture(value)` — sets the auto-aperture flag.
- `setActiveBottomDrawerTabId(id)` — records the currently selected Lens Editor bottom-drawer tab so the same tab can be restored after navigating away and back.
- `setBottomDrawerHeight(height)` — records the most recently committed bottom-drawer height so the drawer can restore its size after navigating away and back.
- `openMediumModal(rowId)` — opens the glass medium picker modal and seeds `pendingMediumSelection` from the object or surface row’s confirmed medium/manufacturer.
- `updatePendingMediumSelection(patch)` — updates the unconfirmed catalog-glass selection while the medium modal is open.
- `commitPendingMediumSelection(selection?)` — writes the confirmed selection to the target row, then clears the pending draft and closes the modal. Optional `selection` allows model-glass values to bypass the catalog draft.
- `closeMediumModal()` — closes the medium modal and discards the pending draft.
- `openAsphericalModal(rowId)` / `closeAsphericalModal()` — open/close the aspherical coefficients modal.
- `openDecenterModal(rowId)` / `closeDecenterModal()` — open/close the surface decenter modal.
- `openDiffractionGratingModal(rowId)` / `closeDiffractionGratingModal()` — open/close the surface diffraction grating modal.
- `openApertureModal(rowId)` / `closeApertureModal()` — open/close the surface aperture modal.
- `setCommittedOpticalModel(model)` — stores the last successfully submitted `OpticalModel` snapshot. Used by `AnalysisPlotContainer` and other consumers that need the most recently committed model.

## Key Conventions

- Object and image rows (`kind === "object"` / `kind === "image"`) cannot be deleted or added after (image guard in `addRowAfter`).
- Normal row replacements, row edits, row insertions, and row deletions use `optimizationSyncPolicy: "resetOptimizationModes"` so Optimization clears stale radius/thickness/asphere variable modes after ordinary editor prescription edits.
- Optimization Apply and Focusing may pass `optimizationSyncPolicy: "preserveOptimizationModes"` because those prescription updates originate from Optimization-compatible workflows and should not clear Optimization prescription modes.
- The default object row is `{ objectDistance: OBJECT_DISTANCE_INFINITY_THRESHOLD, medium: "air", manufacturer: "" }`, currently `1e10`.
- New rows inserted by `addRowAfter` are seeded with `generateRowId()` and default surface values: flat (`curvatureRadius: 0`), zero thickness, `"air"` medium, `semiDiameter: 1`.
- Modal `rowId` is reset to `""` on close.
- `pendingMediumSelection` persists unconfirmed catalog-glass choices across route changes while the root store provider remains mounted.
- `activeBottomDrawerTabId` and `bottomDrawerHeight` are feature-owned UI state. They persist as long as the root store provider remains mounted.
- `bottomDrawerHeight` is persistence-only state for route restoration; `BottomDrawer` still owns live drag state locally to avoid store-driven re-renders on every pointer move.
- Formatting draft controls are intentionally not stored here. `FormattingModal` owns them locally so Cancel and successful Confirm discard drafts when the modal unmounts, and reopening recomputes defaults from current rows.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `GridRow`, `OBJECT_ROW_ID`, `IMAGE_ROW_ID` from `@/shared/lib/lens-prescription-grid/types/gridTypes`.
- `generateRowId` from `@/shared/lib/lens-prescription-grid/lib/gridTransform`.
- `OpticalModel` from `@/shared/lib/types/opticalModel`.

Used through `LensEditorStoreProvider` and `useLensEditorStore()` rather than as a standalone exported hook from this file.
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
  rows: GridRow[];
  prescriptionRevision: number;
  optimizationSyncPolicy: LensEditorOptimizationSyncPolicy;
  selectedRowId: string | undefined;
  autoAperture: boolean;
  autoSemiDiameters: Readonly<Record<string, number>>;
  activeBottomDrawerTabId: string;
  bottomDrawerHeight: number | undefined;
  mediumModal: ModalState;
  pendingMediumSelection: PendingMediumSelection | undefined;
  asphericalModal: ModalState;
  decenterModal: ModalState;
  diffractionGratingModal: ModalState;
  apertureModal: ModalState;
  committedOpticalModel: OpticalModel | undefined;

  setRows: (rows: GridRow[], options?: PrescriptionMutationOptions) => void;
  updateRow: (id: string, patch: Partial<GridRow>, options?: PrescriptionMutationOptions) => void;
  addRowAfter: (id: string) => void;
  deleteRow: (id: string) => void;
  setSelectedRowId: (id: string | undefined) => void;
  setAutoAperture: (value: boolean) => void;
  setAutoSemiDiameters: (values: Readonly<Record<string, number>>) => void;
  clearAutoSemiDiameters: () => void;
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
  openApertureModal: (rowId: string) => void;
  closeApertureModal: () => void;
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
