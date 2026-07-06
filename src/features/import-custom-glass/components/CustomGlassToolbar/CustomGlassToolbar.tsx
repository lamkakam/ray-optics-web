"use client";

import type { RefObject } from "react";
import { Button } from "@/shared/components/primitives/Button";

interface CustomGlassToolbarProps {
  readonly jsonFileInputRef: RefObject<HTMLInputElement | null>;
  readonly csvFileInputRef: RefObject<HTMLInputElement | null>;
  readonly selectedCount: number;
  readonly onJsonFileSelected: (file: File) => void;
  readonly onCsvFilesSelected: (files: readonly File[]) => void;
  readonly onAdd: () => void;
  readonly onEdit: () => void;
  readonly onDownloadJson: () => void;
  readonly onDelete: () => void;
}

export function CustomGlassToolbar({
  jsonFileInputRef,
  csvFileInputRef,
  selectedCount,
  onJsonFileSelected,
  onCsvFilesSelected,
  onAdd,
  onEdit,
  onDownloadJson,
  onDelete,
}: CustomGlassToolbarProps) {
  return (
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
            onJsonFileSelected(file);
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
          onCsvFilesSelected(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <Button variant="secondary" aria-label="Import from JSON" onClick={() => jsonFileInputRef.current?.click()}>Import from JSON</Button>
      <Button variant="secondary" aria-label="Import from CSV Files" onClick={() => csvFileInputRef.current?.click()}>Import from CSV Files</Button>
      <Button variant="primary" aria-label="Add Glass" onClick={onAdd}>Add Glass</Button>
      <Button variant="secondary" aria-label="Edit Glass" disabled={selectedCount !== 1} onClick={onEdit}>Edit Glass</Button>
      <Button variant="secondary" aria-label="Download JSON" onClick={onDownloadJson}>Download JSON</Button>
      <Button variant="danger" aria-label="Delete Glass" disabled={selectedCount === 0} onClick={onDelete}>Delete Glass</Button>
    </div>
  );
}
