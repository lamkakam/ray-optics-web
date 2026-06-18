"use client";

import React, { useRef, useState } from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { ConfirmImportModal } from "@/features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal";
import {
  parsePhotonsToPhotosText,
  type PhotonsToPhotosParseResult,
} from "@/features/lens-editor/lib/photonsToPhotosParser";
import { FocalLengthSelectionModal } from "./FocalLengthSelectionModal";

interface LensEditorConfigToolbarProps {
  readonly getOpticalModel: () => OpticalModel;
  readonly onImportJson: (data: OpticalModel) => void;
  readonly onUpdateSystem: () => void | Promise<void>;
  readonly isUpdateSystemDisabled: boolean;
}

export function LensEditorConfigToolbar({
  getOpticalModel,
  onImportJson,
  onUpdateSystem,
  isUpdateSystemDisabled,
}: LensEditorConfigToolbarProps) {
  const screenSize = useScreenBreakpoint();
  const { lookupMaps } = useGlassCatalogs();
  const buttonSize = screenSize === "screenSM" ? "xs" : "sm";
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
          size={buttonSize}
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
          size={buttonSize}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Load Config"
        >
          Load Config
        </Button>
      </Tooltip>
      <Tooltip text="Import a Photons to Photos TXT prescription" position="bottom" noTouch>
        <Button
          variant="primary"
          size={buttonSize}
          onClick={() => photonsToPhotosFileInputRef.current?.click()}
          aria-label="Import a file from Photons to Photos"
        >
          Import a file from Photons to Photos
        </Button>
      </Tooltip>
      <Tooltip text="Download current config as JSON" position="bottom" noTouch>
        <Button
          variant="primary"
          size={buttonSize}
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
