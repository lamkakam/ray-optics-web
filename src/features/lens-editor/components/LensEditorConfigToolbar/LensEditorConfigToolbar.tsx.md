# `features/lens-editor/components/LensEditorConfigToolbar/LensEditorConfigToolbar.tsx`

## Purpose

Lens Editor-level toolbar for configuration actions shown above the analysis controls. It owns the visible `Update System`, `Load Config`, `Import a file from Photons to Photos`, and `Download Config` buttons so these actions stay available before any Seidel/Zernike data has been computed.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `getOpticalModel` | `() => OpticalModel` | Builds the current optical model snapshot for JSON download |
| `onImportJson` | `(data: OpticalModel) => void` | Applies a validated imported JSON config after user confirmation |
| `onUpdateSystem` | `() => void \| Promise<void>` | Triggers Lens Editor submit/compute |
| `isUpdateSystemDisabled` | `boolean` | Disables `Update System` while Pyodide is not ready or a compute is in progress |

## State

- `importErrorOpen: boolean` — controls the invalid-import `ErrorModal`.
- `importErrorMessage: string` — specific invalid-import message for JSON schema, TXT extension, TXT parse, or TXT schema failures.
- `pendingImportData: OpticalModel | undefined` — stores validated JSON or TXT-derived data awaiting confirmation.
- `pendingZoomImport: zoom parse result | undefined` — stores a parsed zoom TXT file while the user chooses a focal-length column.
- `fileInputRef: React.RefObject<HTMLInputElement>` — hidden `.json` file input triggered by `Load Config`.
- `photonsToPhotosFileInputRef: React.RefObject<HTMLInputElement>` — hidden `.txt` file input triggered by `Import a file from Photons to Photos`.

## Behavior

- `Update System` calls `onUpdateSystem` and respects `isUpdateSystemDisabled`.
- `Load Config` opens the hidden JSON file input. File contents are parsed and validated with `validateImportedLensData`; valid data opens `ConfirmImportModal`, invalid data opens `ErrorModal`.
- `Import a file from Photons to Photos` opens the hidden TXT file input. Non-`.txt` filenames are rejected before reading. Prime TXT files are parsed, AJV-validated, and sent to `ConfirmImportModal`. Zoom TXT files first open `FocalLengthSelectionModal`; confirming the focal length resolves and validates that column before opening `ConfirmImportModal`.
- Confirming the import calls `onImportJson(pendingImportData)` and clears pending state. Canceling clears pending state without mutating stores.
- `Download Config` serializes `getOpticalModel()` as pretty JSON and downloads it as `lens-config.json`.
- Button size follows `useScreenBreakpoint`: `xs` on `screenSM`, `sm` otherwise.

## Usages

Rendered by `LensEditor.tsx` before the Seidel/Zernike analysis controls in both LG and SM layouts.
