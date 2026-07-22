"use client";
/**
 * Describes the Import Custom Glass Page module.
 *
 * @remarks
 * ## Worker And Store Flow
 * - Add/edit modal submissions are converted with `toWorkerInput` and persisted through `saveCustomGlass`.
 * - Add/edit persistence writes to IndexedDB only after the corresponding worker mutation succeeds.
 * - Delete confirmation calls `deleteUserDefinedGlasses`, deletes matching IndexedDB rows, mirrors the deletion into the Glass Map store, clears selection, and closes the modal.
 * - JSON and CSV imports are split into update/add worker calls based on labels already present in `catalogsData.Custom`.
 * - JSON and CSV import update/add batches are written to IndexedDB only after their worker calls succeed.
 * - Successful imports call `upsertCustomGlasses({ ...updated, ...added })`.
 * - IndexedDB failures after successful worker mutations open `Custom Glass Persistence Warning`; they do not roll back the Pyodide runtime or Glass Map store.
 * - The page does not call `getAllGlassCatalogsData()`.
 *
 * ## Import Behavior
 * - JSON imports are parsed and validated by `validateImportedCustomGlassData`.
 * - Invalid JSON opens `Invalid Custom Glass JSON`.
 * - CSV imports parse every selected file with `parseCustomGlassCsv`.
 * - Valid CSV files are imported; rejected CSV files are reported in `Rejected Custom Glass CSV Files`.
 * - If all CSV files are rejected, no worker import APIs are called.
 * - Existing-label imports open `Overwrite Custom Glass` and wait for the `Overwrite` action before worker update/add calls.
 * - CSV rejection details survive overwrite confirmation and are shown after the overwrite import completes.
 *
 * ## UI Composition
 * - The toolbar keeps the visible commands `Import from JSON`, `Import from CSV Files`, `Add Glass`, `Edit Glass`, `Download JSON`, and `Delete Glass`.
 * - The readonly table intentionally has no page-level custom-glass filter input.
 * - The Add/Edit modal is rendered only while `modalMode` is set.
 * - Confirmation modals preserve the visible labels and titles used by the previous implementation.
 * - `Custom Glass Persistence Warning` is shown when the session state changed successfully but IndexedDB could not save/delete the persisted rows for future visits.
 *
 * ## Compatibility Exports
 * - Re-exports `EMPTY_CUSTOM_GLASSES`, `getUserDefinedCustomGlasses`, `isUserDefinedGlassAlreadyExistsError`, `parseCustomGlassCsv`, and `saveCustomGlass` from `lib/customGlassImport` so existing external imports keep working during the refactor.
 */

import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useAppShell } from "@/app/AppShellContext";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { CustomGlassModal, CustomGlassTable, CustomGlassToolbar } from "@/features/import-custom-glass/components";
import {
  downloadCustomGlassJson,
  getUserDefinedCustomGlasses,
  makeEditablePair,
  parseCustomGlassCsv,
  saveCustomGlass,
  toCustomGlassPayload,
  toWorkerInput,
} from "@/features/import-custom-glass/lib/customGlassImport";
import {
  deletePersistedCustomGlasses,
  upsertPersistedCustomGlass,
  upsertPersistedCustomGlasses,
} from "@/features/import-custom-glass/lib/customGlassStorage";
import type {
  ConfirmationMode,
  CustomGlassRow,
  ImportedCustomGlassMaterial,
  ModalMode,
  RejectedCsvFile,
} from "@/features/import-custom-glass/types/customGlassImport";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { validateImportedCustomGlassData } from "@/shared/lib/schemas/importSchema";

export {
  EMPTY_CUSTOM_GLASSES,
  getUserDefinedCustomGlasses,
  isUserDefinedGlassAlreadyExistsError,
  parseCustomGlassCsv,
  saveCustomGlass,
} from "@/features/import-custom-glass/lib/customGlassImport";

/**
 * Route-level coordinator for managing user-defined tabulated glass in the client-only app.
 *
 * @remarks
 * ## Responsibilities
 * - Reads the Pyodide worker proxy from `useAppShell`.
 * - Reads `catalogsData.Custom` from the Glass Map Zustand store and derives user-defined tabulated glasses with `getUserDefinedCustomGlasses`.
 * - Owns page-level selection, add/edit modal state, delete/overwrite/invalid/rejected/persistence-warning confirmation state, and queued import state.
 * - Leaves readonly table sort/filter state to `ImportCustomGlassStore`, provided from the app root.
 * - Derives sorted `CustomGlassRow` records for the readonly table.
 * - Composes `CustomGlassToolbar`, `CustomGlassTable`, `CustomGlassModal`, and shared confirmation `Modal` instances.
 */
export default function ImportCustomGlassPage() {
  const { proxy } = useAppShell();
  const glassMapStore = useGlassMapStore();
  const customCatalog = useStore(glassMapStore, (state) => state.catalogsData?.Custom);
  const custom = useMemo(() => getUserDefinedCustomGlasses(customCatalog), [customCatalog]);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [modalMode, setModalMode] = useState<ModalMode | undefined>();
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode | undefined>();
  const [pendingImport, setPendingImport] = useState<readonly ImportedCustomGlassMaterial[] | undefined>();
  const [rejectedCsvFiles, setRejectedCsvFiles] = useState<readonly RejectedCsvFile[]>([]);
  const [persistenceWarning, setPersistenceWarning] = useState<string | undefined>();
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo<readonly CustomGlassRow[]>(
    () => Object.entries(custom)
      .map(([label, data]) => ({
        label,
        nd: data.refractiveIndexD,
        vd: data.abbeNumberD,
        ne: data.refractiveIndexE,
        ve: data.abbeNumberE,
        pgF: data.partialDispersions.P_gF,
        pFe: data.partialDispersions.P_fe,
        pFd: data.partialDispersions.P_Fd,
        data,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [custom],
  );
  const checkedLabels = [...checked];
  const selectedEditLabel = checkedLabels.length === 1 ? checkedLabels[0] : undefined;
  const selectedEditData = selectedEditLabel === undefined ? undefined : custom[selectedEditLabel];

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
    let hasPersistenceWarning = false;
    try {
      await deletePersistedCustomGlasses(checkedLabels);
    } catch (error) {
      hasPersistenceWarning = true;
      setPersistenceWarning(error instanceof Error ? error.message : "Failed to delete persisted custom glass.");
      setConfirmationMode("persistence-warning");
    }
    glassMapStore.getState().deleteCustomGlasses(checkedLabels);
    setChecked(new Set());
    if (!hasPersistenceWarning) {
      setConfirmationMode(undefined);
    }
  };
  const handleSubmit = async (label: string, modalRows: Parameters<typeof toWorkerInput>[1]) => {
    if (proxy === undefined || modalMode === undefined) {
      return;
    }
    await saveCustomGlass({
      mode: modalMode,
      previousLabel: selectedEditLabel,
      input: toWorkerInput(label, modalRows),
      proxy,
      storeActions: glassMapStore.getState(),
      persistInput: upsertPersistedCustomGlass,
      deletePersisted: deletePersistedCustomGlasses,
      onPersistenceWarning: (message) => {
        setPersistenceWarning(message);
        setConfirmationMode("persistence-warning");
      },
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
    let hasPersistenceWarning = false;
    const updated = toUpdate.length > 0 ? await proxy.updateUserDefinedGlasses(toUpdate) : {};
    if (toUpdate.length > 0) {
      try {
        await upsertPersistedCustomGlasses(toUpdate);
      } catch (error) {
        hasPersistenceWarning = true;
        setPersistenceWarning(error instanceof Error ? error.message : "Failed to persist custom glass import.");
        setConfirmationMode("persistence-warning");
      }
    }
    const added = toAdd.length > 0 ? await proxy.addUserDefinedGlasses(toAdd) : {};
    if (toAdd.length > 0) {
      try {
        await upsertPersistedCustomGlasses(toAdd);
      } catch (error) {
        hasPersistenceWarning = true;
        setPersistenceWarning(error instanceof Error ? error.message : "Failed to persist custom glass import.");
        setConfirmationMode("persistence-warning");
      }
    }
    glassMapStore.getState().upsertCustomGlasses({ ...updated, ...added });
    setPendingImport(undefined);
    if (hasPersistenceWarning) {
      return;
    }
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
    const materials = Object.entries(payload.Custom).map(([name, material]) => ({ name, pairs: material.data }));
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
    ? selectedEditData.dispersionCoeffs.map((pair) => makeEditablePair(pair))
    : [];

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <CustomGlassToolbar
        jsonFileInputRef={jsonFileInputRef}
        csvFileInputRef={csvFileInputRef}
        selectedCount={checkedLabels.length}
        onJsonFileSelected={(file) => { void handleJsonImport(file); }}
        onCsvFilesSelected={(files) => { void handleCsvImport(files); }}
        onAdd={() => setModalMode("add")}
        onEdit={openEdit}
        onDownloadJson={() => downloadCustomGlassJson(toCustomGlassPayload(custom))}
        onDelete={() => setConfirmationMode("delete")}
      />
      <CustomGlassTable rows={rows} checked={checked} onCheckedChange={setChecked} />
      {modalMode !== undefined && (
        <CustomGlassModal
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
              <Button variant="secondary" aria-label="Cancel" onClick={() => setConfirmationMode(undefined)}>Cancel</Button>
              <Button variant="danger" aria-label="Delete" onClick={() => { void confirmDelete(); }}>Delete</Button>
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
                aria-label="Cancel"
                onClick={() => {
                  setPendingImport(undefined);
                  setRejectedCsvFiles([]);
                  setConfirmationMode(undefined);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" aria-label="Overwrite" onClick={() => { void importMaterials(pendingImport, rejectedCsvFiles); }}>Overwrite</Button>
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
              <Button variant="primary" aria-label="OK" onClick={() => setConfirmationMode(undefined)}>OK</Button>
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
                aria-label="OK"
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
      {confirmationMode === "persistence-warning" && persistenceWarning !== undefined && (
        <Modal
          isOpen
          title="Custom Glass Persistence Warning"
          footer={(
            <div className="flex justify-end gap-3">
              <Button
                variant="primary"
                aria-label="OK"
                onClick={() => {
                  setPersistenceWarning(undefined);
                  setConfirmationMode(undefined);
                }}
              >
                OK
              </Button>
            </div>
          )}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The custom glass change succeeded for this session, but it could not be saved for future visits. {persistenceWarning}
          </p>
        </Modal>
      )}
    </main>
  );
}
