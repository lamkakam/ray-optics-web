/**
 * Describes the Custom Glass Toolbar module.
 *
 * @remarks
 * ## Accessibility
 * - Hidden inputs retain `aria-label="Import custom glass JSON file"` and `aria-label="Import custom glass CSV files"` for tests and assistive technology.
 * - Visible command buttons expose aria labels matching their visible text.
 */
"use client";

import type { RefObject } from "react";
import { Button } from "@/shared/components/primitives/Button";

interface CustomGlassToolbarProps {
  /** Lets the visible JSON button trigger its hidden file input. */
  readonly jsonFileInputRef: RefObject<HTMLInputElement | null>;
  /** Lets the visible CSV button trigger its hidden file input. */
  readonly csvFileInputRef: RefObject<HTMLInputElement | null>;
  /** Controls the Edit and Delete disabled states. */
  readonly selectedCount: number;
  /** Handles a single JSON file. */
  readonly onJsonFileSelected: (file: File) => void;
  /** Handles multi-file CSV selection. */
  readonly onCsvFilesSelected: (files: readonly File[]) => void;
  /** Dispatches the page-level add command. */
  readonly onAdd: () => void;
  /** Dispatches the page-level edit command. */
  readonly onEdit: () => void;
  /** Dispatches the page-level JSON download command. */
  readonly onDownloadJson: () => void;
  /** Dispatches the page-level delete command. */
  readonly onDelete: () => void;
}

/**
 * Command and hidden file-input controls for the import custom glass page.
 *
 * @remarks
 * ## Behavior
 * - Preserves visible command labels: `Import from JSON`, `Import from CSV Files`, `Add Glass`, `Edit Glass`, `Download JSON`, and `Delete Glass`.
 * - Sizes all visible command buttons with the Lens Editor responsive rule: shared `Button` size `sm` on `screenLG`, and `xs` on `screenSM`.
 * - The JSON input accepts `application/json,.json`.
 * - The CSV input accepts `text/csv,.csv` and supports multiple files.
 * - File inputs reset their value after dispatching selection callbacks so the same file can be selected again.
 * - Edit is enabled only for one selected row; Delete is enabled for at least one selected row.
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
