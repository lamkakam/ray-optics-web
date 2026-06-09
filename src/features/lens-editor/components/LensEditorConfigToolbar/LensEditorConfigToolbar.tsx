"use client";

import React, { useRef, useState } from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { ConfirmImportModal } from "@/features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal";

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
  const buttonSize = screenSize === "screenSM" ? "xs" : "sm";
  const [importErrorOpen, setImportErrorOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<OpticalModel | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setImportErrorOpen(true);
        }
      } catch {
        setImportErrorOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

      <ErrorModal
        isOpen={importErrorOpen}
        message="The JSON file is invalid. Schema validation failed."
        onClose={() => setImportErrorOpen(false)}
      />
    </>
  );
}
