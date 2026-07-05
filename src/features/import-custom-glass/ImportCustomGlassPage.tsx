"use client";

import { useMemo, useRef, useState } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { useStore } from "zustand";
import { useAppShell } from "@/app/AppShellContext";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import type { CatalogGlassData, UserDefinedGlassData, UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import { validateImportedCustomGlassData } from "@/shared/lib/schemas/importSchema";
import { FRAUNHOFER_LINES } from "@/shared/lib/data/fraunhoferLines";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

interface CustomGlassPayload {
  readonly version: "1.0";
  readonly Custom: Record<string, { readonly type: "tabulated"; readonly data: readonly (readonly [number, number])[] }>;
}

interface EditablePair {
  readonly id: string;
  readonly fraunhofer: string;
  readonly wavelength: string;
  readonly refractiveIndex: string;
}

interface CustomGlassRow {
  readonly label: string;
  readonly nd: number;
  readonly vd: number;
  readonly data: UserDefinedGlassData;
}

type ModalMode = "add" | "edit";
type ConfirmationMode = "delete" | "overwrite" | "invalid-import" | "rejected-csv";
type UserDefinedCustomCatalog = Record<string, UserDefinedGlassData>;
type ImportedCustomGlassMaterial = { readonly name: string; readonly pairs: readonly (readonly [number, number])[] };
type RejectedCsvFile = { readonly filename: string; readonly reason: string };
interface CustomGlassStoreActions {
  readonly upsertCustomGlasses: (materialsData: Record<string, UserDefinedGlassData>) => void;
  readonly deleteCustomGlasses: (labels: readonly string[]) => void;
}

interface SaveCustomGlassOptions {
  readonly mode: ModalMode;
  readonly previousLabel: string | undefined;
  readonly input: UserDefinedGlassInput;
  readonly proxy: PyodideWorkerAPI;
  readonly storeActions: CustomGlassStoreActions;
}

export const EMPTY_CUSTOM_GLASSES: UserDefinedCustomCatalog = {};

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function makeRow(pair?: readonly [number, number]): EditablePair {
  return {
    id: crypto.randomUUID(),
    fraunhofer: "",
    wavelength: pair === undefined ? "" : formatNumber(pair[0]),
    refractiveIndex: pair === undefined ? "" : formatNumber(pair[1]),
  };
}

function toWorkerInput(label: string, rows: readonly EditablePair[]): UserDefinedGlassInput {
  return {
    name: label.trim(),
    pairs: rows.map((row) => [Number(row.wavelength), Number(row.refractiveIndex)] as const),
  };
}

function toPayload(custom: Record<string, UserDefinedGlassData>): CustomGlassPayload {
  return {
    version: "1.0",
    Custom: Object.fromEntries(
      Object.entries(custom).map(([label, data]) => [
        label,
        { type: "tabulated", data: data.dispersionCoeffs },
      ]),
    ),
  };
}

function isUserDefinedGlassData(data: CatalogGlassData): data is UserDefinedGlassData {
  return data.dispersionCoeffKind === "tabulated";
}

function formatReadonlyNumber(value: unknown): string {
  return Number(value).toFixed(6);
}

export function getUserDefinedCustomGlasses(
  customCatalog: Record<string, CatalogGlassData> | undefined,
): UserDefinedCustomCatalog {
  if (customCatalog === undefined) {
    return EMPTY_CUSTOM_GLASSES;
  }

  const entries = Object.entries(customCatalog);
  if (entries.every((entry): entry is [string, UserDefinedGlassData] => isUserDefinedGlassData(entry[1]))) {
    return customCatalog as UserDefinedCustomCatalog;
  }

  return Object.fromEntries(
    entries.filter((entry): entry is [string, UserDefinedGlassData] => isUserDefinedGlassData(entry[1])),
  );
}

export function isUserDefinedGlassAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("User-defined glass already exists:");
}

export async function saveCustomGlass({
  mode,
  previousLabel,
  input,
  proxy,
  storeActions,
}: SaveCustomGlassOptions): Promise<void> {
  if (mode === "edit" && previousLabel !== undefined && previousLabel !== input.name) {
    const added = await proxy.addUserDefinedGlasses([input]);
    await proxy.deleteUserDefinedGlasses([previousLabel]);
    storeActions.upsertCustomGlasses(added);
    storeActions.deleteCustomGlasses([previousLabel]);
    return;
  }

  let result;
  try {
    result = mode === "add"
      ? await proxy.addUserDefinedGlasses([input])
      : await proxy.updateUserDefinedGlasses([input]);
  } catch (error) {
    if (mode !== "add" || !isUserDefinedGlassAlreadyExistsError(error)) {
      throw error;
    }

    result = await proxy.getUserDefinedGlasses([input.name]);
  }
  storeActions.upsertCustomGlasses(result);
}

function downloadJson(payload: CustomGlassPayload): void {
  const blob = new Blob([JSON.stringify(payload, undefined, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "custom-glass.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function filenameStem(filename: string): string {
  const basename = filename.split(/[\\/]/).at(-1) ?? filename;
  const extensionIndex = basename.lastIndexOf(".");
  return (extensionIndex <= 0 ? basename : basename.slice(0, extensionIndex)).trim();
}

function parseCustomGlassCsv(file: File, text: string): ImportedCustomGlassMaterial | RejectedCsvFile {
  const label = filenameStem(file.name);
  if (label === "") {
    return { filename: file.name, reason: "Filename must provide a non-blank glass label." };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { filename: file.name, reason: "Missing CSV header wl,n." };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  if (headers.length !== 2 || headers[0] !== "wl" || headers[1] !== "n") {
    return { filename: file.name, reason: "CSV header must contain exactly two columns: wl,n." };
  }

  const pairs: [number, number][] = [];
  const wavelengths = new Set<number>();
  for (const [index, line] of lines.slice(1).entries()) {
    const rowNumber = index + 2;
    const columns = line.split(",").map((column) => column.trim());
    if (columns.length !== 2 || columns.some((column) => column === "")) {
      return { filename: file.name, reason: `Row ${rowNumber} must contain exactly two columns.` };
    }

    const wavelengthMicrometers = Number(columns[0]);
    const refractiveIndex = Number(columns[1]);
    if (!Number.isFinite(wavelengthMicrometers) || !Number.isFinite(refractiveIndex)) {
      return { filename: file.name, reason: `Row ${rowNumber} values must be numeric.` };
    }
    if (wavelengthMicrometers <= 0 || refractiveIndex <= 0) {
      return { filename: file.name, reason: `Row ${rowNumber} values must be positive.` };
    }
    if (wavelengths.has(wavelengthMicrometers)) {
      return { filename: file.name, reason: `Duplicate wavelength ${columns[0]} found.` };
    }

    wavelengths.add(wavelengthMicrometers);
    pairs.push([wavelengthMicrometers * 1000, refractiveIndex]);
  }

  if (pairs.length < 4) {
    return { filename: file.name, reason: "CSV must contain at least four valid wavelength/index pairs." };
  }

  return { name: label, pairs };
}

function isPositiveFinite(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function duplicateWavelengths(rows: readonly EditablePair[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const normalized = row.wavelength.trim();
    if (normalized !== "") {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

function GlassModal({
  mode,
  existingLabels,
  initialLabel,
  initialRows,
  onCancel,
  onSubmit,
}: {
  readonly mode: ModalMode;
  readonly existingLabels: ReadonlySet<string>;
  readonly initialLabel: string;
  readonly initialRows: readonly EditablePair[];
  readonly onCancel: () => void;
  readonly onSubmit: (label: string, rows: readonly EditablePair[]) => void;
}) {
  const gridTheme = useAgGridTheme();
  const [label, setLabel] = useState(initialLabel);
  const [rows, setRows] = useState<readonly EditablePair[]>(initialRows);
  const duplicates = duplicateWavelengths(rows);
  const trimmedLabel = label.trim();
  const labelExists = existingLabels.has(trimmedLabel) && (mode === "add" || trimmedLabel !== initialLabel);
  const canConfirm = trimmedLabel !== ""
    && !labelExists
    && rows.length >= 4
    && rows.every((row) => isPositiveFinite(row.wavelength) && isPositiveFinite(row.refractiveIndex))
    && duplicates.size === 0;
  const updateRow = (id: string, patch: Partial<EditablePair>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  const modalColumnDefs = useMemo<ColDef<EditablePair>[]>(() => [
    {
      headerName: "",
      width: 95,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: EditablePair | undefined }) => {
        if (params.data === undefined) {
          return undefined;
        }

        return (
          <Button
            variant="danger"
            size="xs"
            aria-label={`Delete row ${params.data.id}`}
            onClick={() => setRows((current) => current.filter((item) => item.id !== params.data?.id))}
          >
            Delete
          </Button>
        );
      },
    },
    {
      headerName: "Fraunhofer",
      field: "fraunhofer",
      width: 130,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["", ...FRAUNHOFER_LINES.map((line) => line.symbol)],
      },
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        const symbol = String(params.newValue);
        const line = FRAUNHOFER_LINES.find((item) => item.symbol === symbol);
        updateRow(params.data.id, {
          fraunhofer: symbol,
          wavelength: line === undefined ? params.data.wavelength : String(line.wavelength),
        });
        return true;
      },
    },
    {
      headerName: "Wavelength (nm)",
      field: "wavelength",
      width: 170,
      editable: true,
      cellClass: (params) => duplicates.has(String(params.value ?? "").trim()) ? "text-red-600" : undefined,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        updateRow(params.data.id, { wavelength: String(params.newValue), fraunhofer: "" });
        return true;
      },
    },
    {
      headerName: "Refractive Index",
      field: "refractiveIndex",
      width: 170,
      editable: true,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        updateRow(params.data.id, { refractiveIndex: String(params.newValue) });
        return true;
      },
    },
  ], [duplicates]);

  return (
    <Modal
      isOpen
      title={mode === "add" ? "Add Glass" : "Edit Glass"}
      size="4xl"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!canConfirm} onClick={() => onSubmit(trimmedLabel, rows)}>Confirm</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-glass-label">Label</Label>
          <Input id="custom-glass-label" aria-label="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
          {labelExists && <p className="mt-1 text-sm text-red-600">Label already exists.</p>}
        </div>
        <Button variant="secondary" onClick={() => setRows((current) => [...current, makeRow()])}>Add row</Button>
        {duplicates.size > 0 && <p className="text-sm text-red-600">Duplicate wavelength rows must be resolved.</p>}
        <div className="h-[45vh] min-h-72">
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<EditablePair>
              theme={gridTheme}
              rowData={[...rows]}
              columnDefs={modalColumnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              getRowId={(params) => params.data.id}
            />
          </AgGridProvider>
        </div>
      </div>
    </Modal>
  );
}

export default function ImportCustomGlassPage() {
  const { proxy } = useAppShell();
  const gridTheme = useAgGridTheme();
  const glassMapStore = useGlassMapStore();
  const customCatalog = useStore(glassMapStore, (state) => state.catalogsData?.Custom);
  const custom = useMemo(() => getUserDefinedCustomGlasses(customCatalog), [customCatalog]);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [modalMode, setModalMode] = useState<ModalMode | undefined>();
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode | undefined>();
  const [pendingImport, setPendingImport] = useState<readonly ImportedCustomGlassMaterial[] | undefined>();
  const [rejectedCsvFiles, setRejectedCsvFiles] = useState<readonly RejectedCsvFile[]>([]);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(
    () => Object.entries(custom)
      .map(([label, data]) => ({ label, nd: data.refractiveIndexD, vd: data.abbeNumberD, data }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [custom],
  );
  const checkedLabels = [...checked];
  const selectedEditLabel = checkedLabels.length === 1 ? checkedLabels[0] : undefined;
  const selectedEditData = selectedEditLabel === undefined ? undefined : custom[selectedEditLabel];
  const mainColumnDefs = useMemo<ColDef<CustomGlassRow>[]>(() => [
    {
      headerName: "",
      width: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: { data: CustomGlassRow | undefined }) => {
        if (params.data === undefined) {
          return undefined;
        }

        return (
          <input
            type="checkbox"
            aria-label={`Select ${params.data.label}`}
            checked={checked.has(params.data.label)}
            onChange={(event) => setChecked((current) => {
              const next = new Set(current);
              if (event.target.checked) {
                next.add(params.data!.label);
              } else {
                next.delete(params.data!.label);
              }
              return next;
            })}
          />
        );
      },
    },
    { headerName: "Label", field: "label", sortable: true, filter: true, width: 100 },
    { headerName: "nd", field: "nd", sortable: true, filter: true, width: 112, valueFormatter: (params) => formatReadonlyNumber(params.value) },
    { headerName: "vd", field: "vd", sortable: true, filter: true, width: 112, valueFormatter: (params) => formatReadonlyNumber(params.value) },
  ], [checked]);

  const openAdd = () => setModalMode("add");
  const openEdit = () => {
    if (selectedEditLabel !== undefined) {
      setModalMode("edit");
    }
  };
  const confirmDelete = async () => {
    if (proxy === undefined || checkedLabels.length === 0) {
      return;
    }
    await proxy.deleteUserDefinedGlasses(checkedLabels);
    glassMapStore.getState().deleteCustomGlasses(checkedLabels);
    setChecked(new Set());
    setConfirmationMode(undefined);
  };
  const handleSubmit = async (label: string, modalRows: readonly EditablePair[]) => {
    if (proxy === undefined || modalMode === undefined) {
      return;
    }
    const input = toWorkerInput(label, modalRows);
    await saveCustomGlass({
      mode: modalMode,
      previousLabel: selectedEditLabel,
      input,
      proxy,
      storeActions: glassMapStore.getState(),
    });
    setChecked(new Set([label]));
    setModalMode(undefined);
  };
  const showRejectedCsvFiles = (rejections: readonly RejectedCsvFile[]) => {
    if (rejections.length > 0) {
      setRejectedCsvFiles(rejections);
      setConfirmationMode("rejected-csv");
    }
  };
  const importMaterials = async (
    materials: readonly ImportedCustomGlassMaterial[],
    rejectionsAfterImport: readonly RejectedCsvFile[] = [],
  ) => {
    if (proxy === undefined) {
      return;
    }
    const toUpdate = materials.filter((material) => custom[material.name] !== undefined);
    const toAdd = materials.filter((material) => custom[material.name] === undefined);
    const updated = toUpdate.length > 0 ? await proxy.updateUserDefinedGlasses(toUpdate) : {};
    const added = toAdd.length > 0 ? await proxy.addUserDefinedGlasses(toAdd) : {};
    glassMapStore.getState().upsertCustomGlasses({ ...updated, ...added });
    setPendingImport(undefined);
    setConfirmationMode(undefined);
    showRejectedCsvFiles(rejectionsAfterImport);
  };
  const queueImport = async (
    materials: readonly ImportedCustomGlassMaterial[],
    rejections: readonly RejectedCsvFile[] = [],
  ) => {
    if (proxy === undefined) {
      return;
    }
    if (materials.length === 0) {
      showRejectedCsvFiles(rejections);
      return;
    }
    const conflicts = materials.filter((material) => custom[material.name] !== undefined);
    if (conflicts.length > 0) {
      setRejectedCsvFiles(rejections);
      setPendingImport(materials);
      setConfirmationMode("overwrite");
      return;
    }
    await importMaterials(materials, rejections);
  };
  const handleJsonImport = async (file: File) => {
    if (proxy === undefined) {
      return;
    }
    const payload = JSON.parse(await file.text()) as unknown;
    if (!validateImportedCustomGlassData(payload)) {
      setConfirmationMode("invalid-import");
      return;
    }
    const data = payload as unknown as CustomGlassPayload;
    const materials = Object.entries(data.Custom).map(([name, material]) => ({ name, pairs: material.data }));
    await queueImport(materials);
  };
  const handleCsvImport = async (files: readonly File[]) => {
    if (proxy === undefined || files.length === 0) {
      return;
    }
    const results = await Promise.all(files.map(async (file) => parseCustomGlassCsv(file, await file.text())));
    const materials = results.filter((result): result is ImportedCustomGlassMaterial => "name" in result);
    const rejections = results.filter((result): result is RejectedCsvFile => "reason" in result);
    await queueImport(materials, rejections);
  };
  const initialModalRows = modalMode === "edit" && selectedEditData !== undefined
    ? selectedEditData.dispersionCoeffs.map((pair) => makeRow(pair))
    : [];

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={jsonFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import custom glass JSON file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              void handleJsonImport(file);
              event.target.value = "";
            }
          }}
        />
        <input
          ref={csvFileInputRef}
          type="file"
          accept="text/csv,.csv"
          multiple
          className="hidden"
          aria-label="Import custom glass CSV files"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            void handleCsvImport(files);
            event.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => jsonFileInputRef.current?.click()}>Import from JSON</Button>
        <Button variant="secondary" onClick={() => csvFileInputRef.current?.click()}>Import from CSV Files</Button>
        <Button variant="primary" onClick={openAdd}>Add Glass</Button>
        <Button variant="secondary" disabled={checkedLabels.length !== 1} onClick={openEdit}>Edit Glass</Button>
        <Button variant="secondary" onClick={() => downloadJson(toPayload(custom))}>Download JSON</Button>
        <Button variant="danger" disabled={checkedLabels.length === 0} onClick={() => setConfirmationMode("delete")}>Delete Glass</Button>
      </div>
      <div className="min-h-0 flex-1">
        <AgGridProvider modules={[AllCommunityModule]}>
          <EditableAgGridReact<CustomGlassRow>
            theme={gridTheme}
            rowData={rows}
            columnDefs={mainColumnDefs}
            defaultColDef={{ sortable: true, filter: true, suppressMovable: true }}
            getRowId={(params) => params.data.label}
          />
        </AgGridProvider>
      </div>
      {modalMode !== undefined && (
        <GlassModal
          mode={modalMode}
          existingLabels={new Set(Object.keys(custom))}
          initialLabel={modalMode === "edit" ? selectedEditLabel ?? "" : ""}
          initialRows={initialModalRows}
          onCancel={() => setModalMode(undefined)}
          onSubmit={(label, modalRows) => { void handleSubmit(label, modalRows); }}
        />
      )}
      {confirmationMode === "delete" && (
        <Modal
          isOpen
          title="Delete Custom Glass"
          footer={(
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmationMode(undefined)}>Cancel</Button>
              <Button variant="danger" onClick={() => { void confirmDelete(); }}>Delete</Button>
            </div>
          )}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Delete {checkedLabels.length} selected custom glass{checkedLabels.length === 1 ? "" : "es"}?
          </p>
        </Modal>
      )}
      {confirmationMode === "overwrite" && pendingImport !== undefined && (
        <Modal
          isOpen
          title="Overwrite Custom Glass"
          footer={(
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingImport(undefined);
                  setRejectedCsvFiles([]);
                  setConfirmationMode(undefined);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={() => { void importMaterials(pendingImport, rejectedCsvFiles); }}>Overwrite</Button>
            </div>
          )}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Overwrite existing custom glass entries from this import?
          </p>
        </Modal>
      )}
      {confirmationMode === "invalid-import" && (
        <Modal
          isOpen
          title="Invalid Custom Glass JSON"
          footer={(
            <div className="flex justify-end gap-3">
              <Button variant="primary" onClick={() => setConfirmationMode(undefined)}>OK</Button>
            </div>
          )}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The selected file is not a valid custom glass JSON file.
          </p>
        </Modal>
      )}
      {confirmationMode === "rejected-csv" && rejectedCsvFiles.length > 0 && (
        <Modal
          isOpen
          title="Rejected Custom Glass CSV Files"
          footer={(
            <div className="flex justify-end gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setRejectedCsvFiles([]);
                  setConfirmationMode(undefined);
                }}
              >
                OK
              </Button>
            </div>
          )}
        >
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>The following CSV files were not imported.</p>
            <ul className="space-y-2">
              {rejectedCsvFiles.map((rejection) => (
                <li key={rejection.filename}>
                  <span className="font-medium">{rejection.filename}</span>
                  <span>: {rejection.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </main>
  );
}
