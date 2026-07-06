# `features/import-custom-glass/components/CustomGlassToolbar/CustomGlassToolbar.tsx`

## Purpose
Command and hidden file-input controls for the import custom glass page.

## Props
- `jsonFileInputRef` and `csvFileInputRef` let the visible buttons trigger hidden file inputs.
- `selectedCount` controls Edit/Delete disabled states.
- `onJsonFileSelected(file)` handles a single JSON file.
- `onCsvFilesSelected(files)` handles multi-file CSV selection.
- `onAdd`, `onEdit`, `onDownloadJson`, and `onDelete` dispatch page-level commands.

## Behavior
- Preserves visible command labels: `Import from JSON`, `Import from CSV Files`, `Add Glass`, `Edit Glass`, `Download JSON`, and `Delete Glass`.
- The JSON input accepts `application/json,.json`.
- The CSV input accepts `text/csv,.csv` and supports multiple files.
- File inputs reset their value after dispatching selection callbacks so the same file can be selected again.
- Edit is enabled only for one selected row; Delete is enabled for at least one selected row.

## Accessibility
- Hidden inputs retain `aria-label="Import custom glass JSON file"` and `aria-label="Import custom glass CSV files"` for tests and assistive technology.
- Visible command buttons expose aria labels matching their visible text.
