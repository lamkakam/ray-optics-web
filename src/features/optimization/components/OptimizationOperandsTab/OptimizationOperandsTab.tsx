"use client";

import { useEffect, useMemo, useRef } from "react";
import { AgGridProvider, type CustomCellEditorProps } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type { OptimizationOperandRow } from "@/features/optimization/stores/optimizationStore";
import { getOperandLabel } from "@/features/optimization/lib/optimizationViewModels";
import {
  OPTIMIZATION_OPERAND_METADATA,
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationSurfaceOperandKind,
  isOptimizationSystemOrSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { NumericRangeInput } from "@/shared/components/NumericRangeInput";
import { Button } from "@/shared/components/primitives/Button";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

/** Surface Index option and display value for the whole-system scope of system-or-surface operands. */
const SYSTEM_SCOPE_OPTION = "System";

type OperandRowUpdater = (
  id: string,
  patch: Partial<Omit<OptimizationOperandRow, "id">>,
) => void;

/** Returns whether an operand kind is penalized only outside a `min`/`max` range, in either scope. */
function isRangeOperandKind(kind: OptimizationOperandKind): boolean {
  return getOptimizationOperandMetadata(kind).goal === "range";
}

/** Target-column value of a range operand row: its raw `min` / `max` bound texts. */
interface OperandRangeValue {
  readonly min: string | undefined;
  readonly max: string | undefined;
}

/** Returns whether a Target-column value is a range operand's `{ min, max }` bounds. */
function isOperandRangeValue(value: unknown): value is OperandRangeValue {
  return typeof value === "object" && value !== null && "min" in value;
}

/**
 * Formats range bounds for the idle Target cell: `<min> ≤ x ≤ <max>`, `≥ <min>`, or `≤ <max>`. Blank bounds are
 * unbounded on that side; an empty string is returned when neither bound is set.
 */
function formatOperandRange({ min, max }: OperandRangeValue): string {
  const lower = min?.trim() ?? "";
  const upper = max?.trim() ?? "";
  if (lower !== "" && upper !== "") {
    return `${lower} ≤ x ≤ ${upper}`;
  }
  if (lower !== "") {
    return `≥ ${lower}`;
  }
  if (upper !== "") {
    return `≤ ${upper}`;
  }
  return "";
}

/** Marks the range editor wrapper so `shouldSuppressOperandRangeEditorTab` can find its bound inputs. */
const OPERAND_RANGE_EDITOR_ATTRIBUTE = "data-operand-range-editor";

/**
 * Returns whether AG Grid should ignore a keydown inside the range editor because it is a Tab (Tab from the lower
 * bound, Shift+Tab from the upper bound) that moves between the editor's two bound inputs; any other Tab leaves the
 * cell through AG Grid's normal navigation.
 */
export function shouldSuppressOperandRangeEditorTab(
  event: KeyboardEvent,
): boolean {
  if (event.key !== "Tab" || !(event.target instanceof HTMLInputElement)) {
    return false;
  }
  const editor = event.target.closest(`[${OPERAND_RANGE_EDITOR_ATTRIBUTE}]`);
  if (editor === null) {
    return false;
  }
  const inputs = Array.from(editor.querySelectorAll("input"));
  const nextIndex = inputs.indexOf(event.target) + (event.shiftKey ? -1 : 1);
  return nextIndex >= 0 && nextIndex < inputs.length;
}

/**
 * Target cell editor for range operands: edits `min` / `max` through `NumericRangeInput` and reports the pending
 * `{ min, max }` value to AG Grid through `onValueChange`, so the column `valueSetter` commits both bounds once when
 * editing stops. Focuses the lower bound on open. Bounds are flagged invalid when non-positive for kinds whose metadata
 * sets `requiresPositiveBounds` (Edge Thickness). AG Grid renders this component directly inside the full-height
 * `.ag-cell`, so a full-height flex wrapper centers the inputs vertically within the row.
 */
function OperandRangeCell({
  data,
  value,
  onValueChange,
}: CustomCellEditorProps<OptimizationOperandRow, OperandRangeValue>) {
  const minInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    minInputRef.current?.focus();
  }, []);

  if (data === undefined) {
    return null;
  }
  const range: OperandRangeValue = value ?? { min: data.min, max: data.max };
  return (
    <div
      {...{ [OPERAND_RANGE_EDITOR_ATTRIBUTE]: "" }}
      className="flex h-full items-center"
    >
      <NumericRangeInput
        min={range.min}
        max={range.max}
        onMinChange={(min) => onValueChange({ ...range, min })}
        onMaxChange={(max) => onValueChange({ ...range, max })}
        minAriaLabel={`Lower bound for operand ${data.id}`}
        maxAriaLabel={`Upper bound for operand ${data.id}`}
        positive={
          getOptimizationOperandMetadata(data.kind).requiresPositiveBounds ===
          true
        }
        minInputRef={minInputRef}
      />
    </div>
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
 * - Orders the columns Operand Kind, Target, Weight, Surface Index, and the delete/action column, with fixed AG Grid widths of `290`, `190`, `90`, `110`, and `90`.
 * - Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending operand edits commit when editing stops.
 * - Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while operand edits and their post-edit evaluation refreshes are pending.
 * - Provides AG Grid `getRowId` from each operand `id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active operand editor or discard uncommitted typed text.
 * - Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
 * - Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Edits adjustable targets in the `Target` column with AG Grid's text editor, and shows `N/A` without editing for fixed-target operands such as combined and axis-specific Ray Fan operands (implicit zero target).
 * - For range operands in either scope (such as Edge Thickness), the `Target` cell is editable through the `OperandRangeCell` custom cell editor (selected per row by `cellEditorSelector`). While idle, the cell shows the bounds as read-only text: `<min> ≤ x ≤ <max>` when both are set, `≥ <min>` or `≤ <max>` when only one is set (blank or whitespace-only bounds mean unbounded), and empty when neither is set. Editing (double-click, Enter, or typing) opens the shared `NumericRangeInput` with lower/upper bound inputs labelled `Lower bound for operand <id>` / `Upper bound for operand <id>`, focused on the lower bound; non-positive bounds are flagged invalid when the kind's metadata sets `requiresPositiveBounds`. Like the other editable cells, range edits emit the AG Grid cell-editing lifecycle callbacks, commit once when editing stops (Enter or focus loss) as a single `{ min, max }` patch that is skipped when both bounds are unchanged, and are discarded on Escape. `suppressKeyboardEvent` keeps Tab (Shift+Tab) moving from the lower (upper) bound to the other input inside the editor; Tab out of either end leaves the cell normally. `cellDataType: false` stops AG Grid inferring a type from the mixed text / `N/A` / range-object values.
 * - The `Surface Index` column shows `N/A` and is not editable for system-only operands. For operands that accept a surface it uses AG Grid's `agSelectCellEditor` through a per-row `cellEditorSelector`: surface-only operands (Edge Thickness) offer the real surfaces `1 … surfaceCount` and show the row's 1-based `surfaceIndex` (empty when unset); system-or-surface operands (the third-order aberrations) offer `System` followed by `1 … surfaceCount` and show `System` while `surfaceIndex` is unset. Choosing a surface sends `{ surfaceIndex }` only for integers in `[1, surfaceCount]`, choosing `System` sends `{ surfaceIndex: undefined }` for system-or-surface operands only, and any other value is rejected without a patch. `cellDataType: false` stops AG Grid inferring a type from the mixed `N/A` / `System` / number values. A `valueFormatter` renders every value, including the numeric surface options in the select list, as a string; AG Grid's select editor otherwise uses each raw option value as its label and throws `children is not iterable` for numbers. The options themselves stay numbers so the editor still preselects the row's numeric `surfaceIndex` by strict equality.
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
        width: 290,
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
        cellDataType: false,
        cellEditorSelector: (params) =>
          params.data !== undefined && isRangeOperandKind(params.data.kind)
            ? { component: OperandRangeCell }
            : undefined,
        suppressKeyboardEvent: (params) =>
          params.editing &&
          params.data !== undefined &&
          isRangeOperandKind(params.data.kind) &&
          shouldSuppressOperandRangeEditorTab(params.event),
        editable: (params) =>
          params.data !== undefined &&
          (isOptimizationAdjustableTargetOperandKind(params.data.kind) ||
            isRangeOperandKind(params.data.kind)),
        valueGetter: (params) => {
          if (params.data === undefined) {
            return undefined;
          }
          if (isRangeOperandKind(params.data.kind)) {
            return { min: params.data.min, max: params.data.max };
          }
          return isOptimizationAdjustableTargetOperandKind(params.data.kind)
            ? params.data.target
            : "N/A";
        },
        valueFormatter: (params) =>
          isOperandRangeValue(params.value)
            ? formatOperandRange(params.value)
            : String(params.value ?? ""),
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }

          if (isRangeOperandKind(params.data.kind)) {
            if (!isOperandRangeValue(params.newValue)) {
              return false;
            }
            const { min, max } = params.newValue;
            if (min === params.data.min && max === params.data.max) {
              return false;
            }
            onUpdateOperand(params.data.id, { min, max });
            return true;
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
        cellEditorSelector: (params) => {
          const surfaceIndices = Array.from(
            { length: surfaceCount },
            (_, index) => index + 1,
          );
          return {
            component: "agSelectCellEditor",
            params: {
              values:
                params.data !== undefined &&
                isOptimizationSystemOrSurfaceOperandKind(params.data.kind)
                  ? [SYSTEM_SCOPE_OPTION, ...surfaceIndices]
                  : surfaceIndices,
            },
          };
        },
        valueGetter: (params) => {
          if (params.data === undefined) {
            return undefined;
          }
          if (!isOptimizationSurfaceOperandKind(params.data.kind)) {
            return "N/A";
          }
          if (
            params.data.surfaceIndex === undefined &&
            isOptimizationSystemOrSurfaceOperandKind(params.data.kind)
          ) {
            return SYSTEM_SCOPE_OPTION;
          }
          return params.data.surfaceIndex;
        },
        valueFormatter: (params) =>
          params.value === undefined || params.value === null
            ? ""
            : String(params.value),
        valueSetter: (params) => {
          if (
            params.data === undefined ||
            !isOptimizationSurfaceOperandKind(params.data.kind)
          ) {
            return false;
          }

          const { newValue } = params;
          if (newValue === SYSTEM_SCOPE_OPTION) {
            if (!isOptimizationSystemOrSurfaceOperandKind(params.data.kind)) {
              return false;
            }
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
