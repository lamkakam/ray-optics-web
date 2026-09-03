"use client";

/**
 * Modal-local editor for one object or physical-surface glass candidate pool.
 *
 * @remarks
 * The editor exposes only Constant and Variable modes. Switching a constant
 * incumbent to Variable for the first time selects every live candidate in that
 * incumbent's catalog; air, REFL, and numeric ModelGlass incumbents start empty.
 * Eight tri-state catalog controls and AG Grid row/header checkboxes update one
 * explicit identity set. The grid exposes catalog/name text filters and seven
 * sortable/filterable optical coordinates formatted to six decimals. Confirm
 * persists sorted `{catalog, name}` pairs only. Missing persisted identities
 * remain visible with blank optical values so deleted Custom entries can be
 * deselected. A definite `280px` viewport height lets normal-layout AG Grid
 * render and own its internal scrolling.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridProvider } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type RowSelectionOptions,
  type SelectionChangedEvent,
  type SelectionColumnDef,
} from "ag-grid-community";
import { CATALOG_NAMES, type AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { GlassCatalogName } from "@/features/optimization/types/optimizationWorkerTypes";
import type { GlassMode, GlassModeDraft } from "@/features/optimization/stores/optimizationStore";
import {
  formatOptionalSixDecimal,
  NO_BLANK_NUMBER_FILTER_OPTIONS,
  NO_BLANK_TEXT_FILTER_OPTIONS,
} from "@/shared/components/ag-grid/readonlyGridConfig";
import {
  buildLiveGlassCandidateRows,
  getGlassCandidateIdentity,
  getIncumbentGlassCatalog,
  mergePersistedGlassCandidateRows,
  sortGlassCandidates,
  type GlassCandidateRow,
} from "@/features/optimization/lib/glassCandidateSelection";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

interface GlassVariableModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: GlassMode | undefined;
  readonly catalogs: AllGlassCatalogsData | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: GlassModeDraft) => void;
  readonly onClose: () => void;
}

function serializeMode(mode: GlassMode): string {
  return mode.mode === "constant"
    ? "constant"
    : `variable:${mode.candidates.map(getGlassCandidateIdentity).join(",")}`;
}

function areSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

/** Renders a hidden modal until all target data exists, then remounts a keyed local editor. */
export function GlassVariableModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  catalogs,
  onSetMode,
  onClose,
}: GlassVariableModalProps) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined) {
    return <Modal isOpen={false} title="Glass Variable" />;
  }

  const target = surfaceIndex === 0
    ? optimizationModel.object
    : optimizationModel.surfaces[surfaceIndex - 1];

  return (
    <GlassVariableModalEditor
      key={`${surfaceIndex}:${target?.medium ?? ""}:${serializeMode(selectedMode)}`}
      optimizationModel={optimizationModel}
      surfaceIndex={surfaceIndex}
      selectedMode={selectedMode}
      catalogs={catalogs}
      onSetMode={onSetMode}
      onClose={onClose}
    />
  );
}

interface GlassVariableModalEditorProps {
  readonly optimizationModel: OpticalModel;
  readonly surfaceIndex: number;
  readonly selectedMode: GlassMode;
  readonly catalogs: AllGlassCatalogsData | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: GlassModeDraft) => void;
  readonly onClose: () => void;
}

function GlassVariableModalEditor({
  optimizationModel,
  surfaceIndex,
  selectedMode,
  catalogs,
  onSetMode,
  onClose,
}: GlassVariableModalEditorProps) {
  const gridTheme = useAgGridTheme();
  const persistedCandidates = useMemo(
    () => selectedMode.mode === "variable" ? selectedMode.candidates : [],
    [selectedMode],
  );
  const rows = useMemo(
    () => mergePersistedGlassCandidateRows(buildLiveGlassCandidateRows(catalogs), persistedCandidates),
    [catalogs, persistedCandidates],
  );
  const rowsByIdentity = useMemo(
    () => new Map(rows.map((row) => [row.id, row] as const)),
    [rows],
  );
  const [mode, setMode] = useState<GlassMode["mode"]>(selectedMode.mode);
  const [selectedIdentities, setSelectedIdentities] = useState<ReadonlySet<string>>(
    () => new Set(persistedCandidates.map(getGlassCandidateIdentity)),
  );
  const initializedVariableRef = useRef(selectedMode.mode === "variable");
  const gridApiRef = useRef<GridApi<GlassCandidateRow> | undefined>(undefined);

  const rowSelection = useMemo<RowSelectionOptions<GlassCandidateRow>>(() => ({
    mode: "multiRow",
    checkboxes: true,
    headerCheckbox: true,
    selectAll: "all",
  }), []);
  const selectionColumnDef = useMemo<SelectionColumnDef>(() => ({
    width: 58,
    maxWidth: 58,
    sortable: false,
    filter: false,
    resizable: false,
    suppressMovable: true,
  }), []);
  const columnDefs = useMemo<ColDef<GlassCandidateRow>[]>(() => [
    {
      headerName: "Catalog",
      field: "catalog",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: { filterOptions: NO_BLANK_TEXT_FILTER_OPTIONS },
      unSortIcon: true,
    },
    {
      headerName: "Label",
      field: "name",
      width: 180,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: { filterOptions: NO_BLANK_TEXT_FILTER_OPTIONS },
      unSortIcon: true,
      cellRenderer: ({ data }: { data: GlassCandidateRow }) =>
        data.available ? data.name : `${data.name} (Unavailable)`,
    },
    {
      headerName: "nd",
      field: "nd",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "vd",
      field: "vd",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "ne",
      field: "ne",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "ve",
      field: "ve",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "Pg,F",
      field: "pgF",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "PF,e",
      field: "pFe",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
    {
      headerName: "PF,d",
      field: "pFd",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NO_BLANK_NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      valueFormatter: formatOptionalSixDecimal,
    },
  ], []);

  const synchronizeGridSelection = useCallback((api: GridApi<GlassCandidateRow>) => {
    api.forEachNode((node) => {
      const id = node.data?.id;
      const shouldBeSelected = id !== undefined && selectedIdentities.has(id);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
  }, [selectedIdentities]);

  useEffect(() => {
    if (gridApiRef.current !== undefined) {
      synchronizeGridSelection(gridApiRef.current);
    }
  }, [synchronizeGridSelection]);

  const handleGridReady = useCallback((event: GridReadyEvent<GlassCandidateRow>) => {
    gridApiRef.current = event.api;
    synchronizeGridSelection(event.api);
  }, [synchronizeGridSelection]);

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<GlassCandidateRow>) => {
    const next = new Set(
      event.selectedNodes
        ?.map((node) => node.data?.id)
        .filter((id): id is string => id !== undefined) ?? [],
    );
    setSelectedIdentities((previous) => areSetsEqual(previous, next) ? previous : next);
  }, []);

  const handleModeChange = (nextMode: GlassMode["mode"]) => {
    setMode(nextMode);
    if (nextMode !== "variable" || initializedVariableRef.current) {
      return;
    }

    initializedVariableRef.current = true;
    const incumbentCatalog = getIncumbentGlassCatalog(
      optimizationModel,
      surfaceIndex,
      catalogs,
    );
    setSelectedIdentities(new Set(
      rows
        .filter((row) => row.available && row.catalog === incumbentCatalog)
        .map((row) => row.id),
    ));
  };

  const updateCatalogSelection = (catalog: GlassCatalogName, checked: boolean) => {
    setSelectedIdentities((previous) => {
      const next = new Set(previous);
      for (const row of rows) {
        if (row.catalog !== catalog) {
          continue;
        }
        if (checked && row.available) {
          next.add(row.id);
        } else if (!checked) {
          next.delete(row.id);
        }
      }
      return next;
    });
  };

  const selectedCandidates = sortGlassCandidates(
    [...selectedIdentities]
      .map((identity) => rowsByIdentity.get(identity))
      .filter((row): row is GlassCandidateRow => row !== undefined)
      .map(({ name, catalog }) => ({ name, catalog })),
  );
  const hasSelectionError = mode === "variable" && selectedCandidates.length === 0;
  const target = surfaceIndex === 0
    ? optimizationModel.object
    : optimizationModel.surfaces[surfaceIndex - 1];
  const targetLabel = surfaceIndex === 0
    ? "Object"
    : optimizationModel.surfaces[surfaceIndex - 1]?.label ?? `Surface ${surfaceIndex}`;

  return (
    <Modal
      isOpen
      title="Glass Variable"
      size="4xl"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={hasSelectionError}
            onClick={() => {
              const draft: GlassModeDraft = mode === "constant"
                ? { mode: "constant" }
                : { mode: "variable", candidates: selectedCandidates };
              onSetMode(surfaceIndex, draft);
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Paragraph>
          {targetLabel} medium: {target?.medium ?? ""}
        </Paragraph>
        <div>
          <Label htmlFor="glass-variable-mode">Mode</Label>
          <Select
            id="glass-variable-mode"
            aria-label="Glass mode"
            value={mode}
            options={[
              { value: "constant", label: "constant" },
              { value: "variable", label: "variable" },
            ]}
            onChange={(event) => handleModeChange(event.target.value as GlassMode["mode"])}
          />
        </div>

        {mode === "variable" ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {CATALOG_NAMES.map((catalog) => {
                const liveRows = rows.filter((row) => row.catalog === catalog && row.available);
                const selectedCount = liveRows.filter((row) => selectedIdentities.has(row.id)).length;
                const checked = liveRows.length > 0 && selectedCount === liveRows.length;
                const indeterminate = selectedCount > 0 && selectedCount < liveRows.length;
                return (
                  <CheckboxInput
                    key={catalog}
                    id={`glass-catalog-${catalog}`}
                    ariaLabel={`Select all ${catalog} candidates`}
                    label={catalog}
                    checked={checked}
                    indeterminate={indeterminate}
                    onChange={(nextChecked) => updateCatalogSelection(catalog, nextChecked)}
                  />
                );
              })}
            </div>
            {hasSelectionError ? (
              <Paragraph className="text-red-600 dark:text-red-400">
                Select at least one glass candidate.
              </Paragraph>
            ) : undefined}
            <div className="ag-grid-touch-scroll h-[280px] overflow-x-auto">
              <AgGridProvider modules={[AllCommunityModule]}>
                <EditableAgGridReact<GlassCandidateRow>
                  theme={gridTheme}
                  rowData={rows}
                  columnDefs={columnDefs}
                  defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
                  domLayout="normal"
                  getRowId={(params) => params.data.id}
                  rowSelection={rowSelection}
                  selectionColumnDef={selectionColumnDef}
                  onGridReady={handleGridReady}
                  onSelectionChanged={handleSelectionChanged}
                />
              </AgGridProvider>
            </div>
          </>
        ) : undefined}
      </div>
    </Modal>
  );
}
