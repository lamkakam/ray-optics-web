/**
# `features/import-custom-glass/components/CustomGlassToolbar/CustomGlassToolbar.tsx`

## Accessibility
- Hidden inputs retain `aria-label="Import custom glass JSON file"` and `aria-label="Import custom glass CSV files"` for tests and assistive technology.
- Visible command buttons expose aria labels matching their visible text.
*/
"use client";

import type { RefObject } from "react";
import { Button } from "@/shared/components/primitives/Button";

/**
## Props
- `jsonFileInputRef` and `csvFileInputRef` let the visible buttons trigger hidden file inputs.
- `selectedCount` controls Edit/Delete disabled states.
- `onJsonFileSelected(file)` handles a single JSON file.
- `onCsvFilesSelected(files)` handles multi-file CSV selection.
- `onAdd`, `onEdit`, `onDownloadJson`, and `onDelete` dispatch page-level commands.
*/
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

/**
## Purpose
Command and hidden file-input controls for the import custom glass page.

## Behavior
- Preserves visible command labels: `Import from JSON`, `Import from CSV Files`, `Add Glass`, `Edit Glass`, `Download JSON`, and `Delete Glass`.
- Sizes all visible command buttons with the Lens Editor responsive rule: shared `Button` size `sm` on `screenLG`, and `xs` on `screenSM`.
- The JSON input accepts `application/json,.json`.
- The CSV input accepts `text/csv,.csv` and supports multiple files.
- File inputs reset their value after dispatching selection callbacks so the same file can be selected again.
- Edit is enabled only for one selected row; Delete is enabled for at least one selected row.
*/
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
