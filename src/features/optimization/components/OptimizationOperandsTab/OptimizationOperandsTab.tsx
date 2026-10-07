"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type { OptimizationOperandRow } from "@/features/optimization/stores/optimizationStore";
import { getOperandLabel } from "@/features/optimization/lib/optimizationViewModels";
import {
  OPTIMIZATION_OPERAND_METADATA,
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { NumericRangeInput } from "@/shared/components/NumericRangeInput";
import { Button } from "@/shared/components/primitives/Button";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

type OperandRowUpdater = (
  id: string,
  patch: Partial<Omit<OptimizationOperandRow, "id">>,
) => void;

/** Returns whether an operand kind is penalized only outside a `min`/`max` range, in either scope. */
function isRangeOperandKind(kind: OptimizationOperandKind): boolean {
  return getOptimizationOperandMetadata(kind).goal === "range";
}

interface OperandRangeCellProps {
  readonly data?: OptimizationOperandRow;
  readonly onUpdateOperand: OperandRowUpdater;
}

/**
 * Target cell renderer for range operands: edits `min` / `max` through `NumericRangeInput`, sending one `{ min }` or
 * `{ max }` patch per keystroke. Bounds are flagged invalid when non-positive for kinds whose metadata sets
 * `requiresPositiveBounds` (Edge Thickness).
 */
function OperandRangeCell({ data, onUpdateOperand }: OperandRangeCellProps) {
  if (data === undefined) {
    return null;
  }
  return (
    <NumericRangeInput
      min={data.min}
      max={data.max}
      onMinChange={(min) => onUpdateOperand(data.id, { min })}
      onMaxChange={(max) => onUpdateOperand(data.id, { max })}
      minAriaLabel={`Lower bound for operand ${data.id}`}
      maxAriaLabel={`Upper bound for operand ${data.id}`}
      positive={
        getOptimizationOperandMetadata(data.kind).requiresPositiveBounds ===
        true
      }
    />
  );
}

interface OptimizationOperandsTabProps {
  readonly operands: ReadonlyArray<OptimizationOperandRow>;
  readonly onAddOperand: () => void;
  readonly onDeleteOperand: (id: string) => void;
  readonly onUpdateOperand: OperandRowUpdater;
  /** Number of real optical surfaces (object and image excluded); the Surface Index editor's upper bound. */
  readonly surfaceCount: number;
  readonly onCellEditingStarted?: () => void;
  readonly onCellEditingStopped?: () => void;
}

/**
 * Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.
 *
 * @remarks
 * - Uses a height-constrained flex column with a `1rem` gap and the same responsive total height as Lens Prescription: `h-[calc(100vh-160px)]` below `1440px`, then `h-full min-h-[200px]` at `1440px` and above.
 * - Keeps the content-sized Add Operand button above the grid. The grid wrapper uses `min-h-0 flex-1`, so it occupies the concrete remaining height after the button and gap, while the tab retains horizontal overflow and relies on parent layout padding instead of adding its own outer `p-4`.
 * - Uses AG Grid's normal layout so the grid owns vertical scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
 * - Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so users cannot reorder operand-table columns.
 * - Orders the columns Operand Kind, Target, Weight, Surface Index, and the delete/action column, with fixed AG Grid widths of `215`, `190`, `90`, `110`, and `90`.
 * - Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending operand edits commit when editing stops.
 * - Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while operand edits and their post-edit evaluation refreshes are pending.
 * - Provides AG Grid `getRowId` from each operand `id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active operand editor or discard uncommitted typed text.
 * - Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
 * - Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Edits adjustable targets in the `Target` column with AG Grid's text editor, and shows `N/A` without editing for fixed-target operands such as combined and axis-specific Ray Fan operands (implicit zero target).
 * - For range operands in either scope (such as Edge Thickness), a `cellRendererSelector` renders the shared `NumericRangeInput` in the `Target` cell: two always-visible lower/upper bound inputs labelled `Lower bound for operand <id>` / `Upper bound for operand <id>` that send a `{ min }` or `{ max }` patch on every keystroke. A blank bound means unbounded on that side; non-positive bounds are flagged invalid when the kind's metadata sets `requiresPositiveBounds`. `suppressKeyboardEvent` keeps AG Grid navigation from capturing typing, Tab, or arrow keys in those inputs. The column is not editable for range rows, so these edits do not emit AG Grid cell-editing lifecycle callbacks; each keystroke commits to the store directly.
 * - The `Surface Index` column shows `N/A` and is not editable for system-scoped operands. For surface-scoped operands it uses AG Grid's `agNumberCellEditor` with `{ min: 1, max: surfaceCount, precision: 0, step: 1 }`, shows the row's 1-based `surfaceIndex` (empty when unset), and sends `{ surfaceIndex }` only for integers in `[1, surfaceCount]`; a cleared editor sends `{ surfaceIndex: undefined }`, and any other value is rejected without a patch. `cellDataType: false` stops AG Grid inferring a type from the mixed `N/A` / number values.
 */
export function OptimizationOperandsTab({
  operands,
  onAddOperand,
  onDeleteOperand,
  onUpdateOperand,
  surfaceCount,
  onCellEditingStarted,
  onCellEditingStopped,
}: OptimizationOperandsTabProps) {
  const gridTheme = useAgGridTheme();

  const operandColumns = useMemo<ColDef<OptimizationOperandRow>[]>(
    () => [
      {
        headerName: "Operand Kind",
        width: 215,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: OPTIMIZATION_OPERAND_METADATA.map(
            (metadata) => metadata.kind,
          ),
        },
        valueGetter: (params) => params.data?.kind,
        valueFormatter: (params) =>
          getOperandLabel(params.value as OptimizationOperandKind),
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }

          onUpdateOperand(params.data.id, {
            kind: params.newValue as OptimizationOperandKind,
          });
          return true;
        },
      },
      {
        headerName: "Target",
        width: 190,
        cellRendererSelector: (params) =>
          params.data !== undefined && isRangeOperandKind(params.data.kind)
            ? { component: OperandRangeCell, params: { onUpdateOperand } }
            : undefined,
        suppressKeyboardEvent: (params) =>
          params.data !== undefined && isRangeOperandKind(params.data.kind),
        editable: (params) =>
          params.data !== undefined &&
          isOptimizationAdjustableTargetOperandKind(params.data.kind),
        valueGetter: (params) => {
          if (params.data === undefined) {
            return undefined;
          }
          return isOptimizationAdjustableTargetOperandKind(params.data.kind)
            ? params.data.target
            : "N/A";
        },
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }

          if (!isOptimizationAdjustableTargetOperandKind(params.data.kind)) {
            return false;
          }

          onUpdateOperand(params.data.id, { target: String(params.newValue) });
          return true;
        },
      },
      {
        headerName: "Weight",
        width: 90,
        editable: true,
        valueGetter: (params) => params.data?.weight,
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }

          onUpdateOperand(params.data.id, { weight: String(params.newValue) });
          return true;
        },
      },
      {
        headerName: "Surface Index",
        width: 110,
        cellDataType: false,
        editable: (params) =>
          params.data !== undefined &&
          isOptimizationSurfaceOperandKind(params.data.kind),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 1, max: surfaceCount, precision: 0, step: 1 },
        valueGetter: (params) => {
          if (params.data === undefined) {
            return undefined;
          }
          return isOptimizationSurfaceOperandKind(params.data.kind)
            ? params.data.surfaceIndex
            : "N/A";
        },
        valueSetter: (params) => {
          if (
            params.data === undefined ||
            !isOptimizationSurfaceOperandKind(params.data.kind)
          ) {
            return false;
          }

          const { newValue } = params;
          if (
            newValue === null ||
            newValue === undefined ||
            String(newValue).trim() === ""
          ) {
            onUpdateOperand(params.data.id, { surfaceIndex: undefined });
            return true;
          }
          const surfaceIndex = Number(newValue);
          if (
            !Number.isInteger(surfaceIndex) ||
            surfaceIndex < 1 ||
            surfaceIndex > surfaceCount
          ) {
            return false;
          }
          onUpdateOperand(params.data.id, { surfaceIndex });
          return true;
        },
      },
      {
        headerName: "",
        width: 90,
        cellRenderer: (params: { data: OptimizationOperandRow }) => (
          <Button
            variant="danger"
            size="xs"
            aria-label={`Delete operand ${params.data.id}`}
            onClick={() => onDeleteOperand(params.data.id)}
          >
            Delete
          </Button>
        ),
      },
    ],
    [onDeleteOperand, onUpdateOperand, surfaceCount],
  );

  return (
    <div
      data-testid="optimization-operands-tab"
      className="flex h-[calc(100vh-160px)] flex-col gap-4 overflow-x-auto min-[1440px]:h-full min-[1440px]:min-h-[200px]"
    >
      <Button
        className="self-start"
        variant="secondary"
        size="sm"
        aria-label="Add operand"
        onClick={onAddOperand}
      >
        Add Operand
      </Button>
      <div className="ag-grid-touch-scroll min-h-0 flex-1">
        <AgGridProvider modules={[AllCommunityModule]}>
          <EditableAgGridReact<OptimizationOperandRow>
            theme={gridTheme}
            rowData={[...operands]}
            columnDefs={operandColumns}
            getRowId={(params) => params.data.id}
            defaultColDef={{ sortable: false, suppressMovable: true }}
            domLayout="normal"
            onCellEditingStarted={onCellEditingStarted}
            onCellEditingStopped={onCellEditingStopped}
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
