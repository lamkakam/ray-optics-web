/**
 * Describes the Lens Editor Config Toolbar module.
 *
 * @remarks
 * ## State
 *
 * - `importErrorOpen: boolean` — controls the invalid-import `ErrorModal`.
 * - `importErrorMessage: string` — specific invalid-import message for JSON schema, TXT extension, TXT parse, or TXT schema failures.
 * - `pendingImportData: OpticalModel | undefined` — stores validated JSON or TXT-derived data awaiting confirmation.
 * - `pendingZoomImport: zoom parse result | undefined` — stores a parsed zoom TXT file while the user chooses a focal-length column.
 * - `fileInputRef: React.RefObject<HTMLInputElement>` — hidden `.json` file input triggered by `Load Config`.
 * - `photonsToPhotosFileInputRef: React.RefObject<HTMLInputElement>` — hidden `.txt` file input triggered by `Import a file from Photons to Photos`.
 * - `lookupMaps` — app-wide glass lookup maps read from `useGlassCatalogs()` and passed to Photons to Photos parsing.
 */
"use client";

import React, { useRef, useState } from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { ConfirmImportModal } from "@/features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal";
import {
  parsePhotonsToPhotosText,
  type PhotonsToPhotosParseResult,
} from "@/features/lens-editor/lib/photonsToPhotosParser";
import { FocalLengthSelectionModal } from "./FocalLengthSelectionModal";

interface LensEditorConfigToolbarProps {
  /** Builds the current optical model snapshot for JSON download */
  readonly getOpticalModel: () => OpticalModel;
  /** Applies a validated imported JSON config after user confirmation */
  readonly onImportJson: (data: OpticalModel) => void;
  /** Triggers Lens Editor submit/compute */
  readonly onUpdateSystem: () => void | Promise<void>;
  /** Disables `Update System` while Pyodide is not ready or a compute is in progress */
  readonly isUpdateSystemDisabled: boolean;
}

/**
 * Lens Editor-level toolbar for configuration actions shown above the analysis controls. It owns the visible `Update System`, `Load Config`, `Import a file from Photons to Photos`, and `Download Config` buttons so these actions stay available before any Seidel/Zernike data has been computed.
 *
 * @remarks
 * ## Behavior
 *
 * - `Update System` calls `onUpdateSystem` and respects `isUpdateSystemDisabled`.
 * - `Load Config` opens the hidden JSON file input. File contents are parsed and validated with `validateImportedLensData`; valid data opens `ConfirmImportModal`, invalid data opens `ErrorModal`.
 * - `Import a file from Photons to Photos` opens the hidden TXT file input. Non-`.txt` filenames are rejected before reading. Prime TXT files are parsed with app-wide glass lookup maps when available, AJV-validated, and sent to `ConfirmImportModal`. Zoom TXT files first open `FocalLengthSelectionModal`; confirming the focal length resolves and validates that column before opening `ConfirmImportModal`.
 * - Confirming the import calls `onImportJson(pendingImportData)` and clears pending state. Canceling clears pending state without mutating stores.
 * - `Download Config` serializes `getOpticalModel()` as pretty JSON and downloads it as `lens-config.json`.
 * - Button size follows `useScreenBreakpoint`: `xs` on `screenSM`, `sm` otherwise.
 *
 * Rendered by `LensEditor.tsx` before the Seidel/Zernike analysis controls in both LG and SM layouts.
 */
export function LensEditorConfigToolbar({
  getOpticalModel,
  onImportJson,
  onUpdateSystem,
  isUpdateSystemDisabled,
}: LensEditorConfigToolbarProps) {
  const { lookupMaps } = useGlassCatalogs();
  const [importErrorOpen, setImportErrorOpen] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState("The JSON file is invalid. Schema validation failed.");
  const [pendingImportData, setPendingImportData] = useState<OpticalModel | undefined>();
  const [pendingZoomImport, setPendingZoomImport] = useState<Extract<PhotonsToPhotosParseResult, { kind: "zoom" }> | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photonsToPhotosFileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(getOpticalModel(), undefined, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lens-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: unknown = JSON.parse(String(event.target?.result ?? ""));
        if (validateImportedLensData(parsed)) {
          setPendingImportData(parsed);
        } else {
          setImportErrorMessage("The JSON file is invalid. Schema validation failed.");
          setImportErrorOpen(true);
        }
      } catch {
        setImportErrorMessage("The JSON file is invalid. Schema validation failed.");
        setImportErrorOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const setValidatedPendingImport = (data: OpticalModel, sourceLabel: string) => {
    if (validateImportedLensData(data)) {
      setPendingImportData(data);
      return;
    }
    setImportErrorMessage(`${sourceLabel} schema validation failed.`);
    setImportErrorOpen(true);
  };

  const handlePhotonsToPhotosFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setImportErrorMessage("Photons to Photos import requires a .txt file.");
      setImportErrorOpen(true);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = parsePhotonsToPhotosText(String(event.target?.result ?? ""), lookupMaps);
        if (result.kind === "prime") {
          setValidatedPendingImport(result.model, "Photons to Photos import");
        } else {
          setPendingZoomImport(result);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown parser error.";
        setImportErrorMessage(`Photons to Photos import failed: ${detail}`);
        setImportErrorOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmZoomImport = (choiceIndex: number) => {
    if (!pendingZoomImport) return;
    try {
      setValidatedPendingImport(pendingZoomImport.resolve(choiceIndex), "Photons to Photos import");
      setPendingZoomImport(undefined);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown parser error.";
      setImportErrorMessage(`Photons to Photos import failed: ${detail}`);
      setImportErrorOpen(true);
    }
  };

  const handleConfirmImport = () => {
    if (pendingImportData) onImportJson(pendingImportData);
    setPendingImportData(undefined);
  };

  return (
    <>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        accept=".txt"
        ref={photonsToPhotosFileInputRef}
        className="hidden"
        onChange={handlePhotonsToPhotosFileChange}
      />

      <Tooltip text="Compute and update the optical system" position="bottom" noTouch>
        <Button
          variant="primary"
          disabled={isUpdateSystemDisabled}
          onClick={() => void onUpdateSystem()}
          aria-label="Update System"
        >
          Update System
        </Button>
      </Tooltip>
      <Tooltip text="Load a previously downloaded config" position="bottom" noTouch>
        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Load Config"
        >
          Load Config
        </Button>
      </Tooltip>
      <Tooltip text="Import a Photons to Photos TXT prescription" position="bottom" noTouch>
        <Button
          variant="primary"
          onClick={() => photonsToPhotosFileInputRef.current?.click()}
          aria-label="Import a file from Photons to Photos"
        >
          Import a file from Photons to Photos
        </Button>
      </Tooltip>
      <Tooltip text="Download current config as JSON" position="bottom" noTouch>
        <Button
          variant="primary"
          onClick={handleExport}
          aria-label="Download Config"
        >
          Download Config
        </Button>
      </Tooltip>

      <ConfirmImportModal
        isOpen={pendingImportData !== undefined}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImportData(undefined)}
      />

      <FocalLengthSelectionModal
        isOpen={pendingZoomImport !== undefined}
        choices={pendingZoomImport?.focalLengthChoices ?? []}
        onConfirm={handleConfirmZoomImport}
        onCancel={() => setPendingZoomImport(undefined)}
      />

      <ErrorModal
        isOpen={importErrorOpen}
        message={importErrorMessage}
        onClose={() => setImportErrorOpen(false)}
      />
    </>
  );
}
