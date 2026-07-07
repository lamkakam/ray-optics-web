"use client";

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
    glassMapStore.getState().deleteCustomGlasses(checkedLabels);
    setChecked(new Set());
    setConfirmationMode(undefined);
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
    </main>
  );
}
