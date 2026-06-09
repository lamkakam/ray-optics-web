# `features/lens-editor/components/LensEditorConfigToolbar/LensEditorConfigToolbar.tsx`

## Purpose

Lens Editor-level toolbar for configuration actions shown above the analysis controls. It owns the visible `Update System`, `Load Config`, and `Download Config` buttons so these actions stay available before any Seidel/Zernike data has been computed.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `getOpticalModel` | `() => OpticalModel` | Builds the current optical model snapshot for JSON download |
| `onImportJson` | `(data: OpticalModel) => void` | Applies a validated imported JSON config after user confirmation |
| `onUpdateSystem` | `() => void \| Promise<void>` | Triggers Lens Editor submit/compute |
| `isUpdateSystemDisabled` | `boolean` | Disables `Update System` while Pyodide is not ready or a compute is in progress |

## State

- `importErrorOpen: boolean` — controls the invalid-import `ErrorModal`.
- `pendingImportData: OpticalModel | undefined` — stores validated JSON awaiting confirmation.
- `fileInputRef: React.RefObject<HTMLInputElement>` — hidden `.json` file input triggered by `Load Config`.

## Behavior

- `Update System` calls `onUpdateSystem` and respects `isUpdateSystemDisabled`.
- `Load Config` opens the hidden JSON file input. File contents are parsed and validated with `validateImportedLensData`; valid data opens `ConfirmImportModal`, invalid data opens `ErrorModal`.
- Confirming the import calls `onImportJson(pendingImportData)` and clears pending state. Canceling clears pending state without mutating stores.
- `Download Config` serializes `getOpticalModel()` as pretty JSON and downloads it as `lens-config.json`.
- Button size follows `useScreenBreakpoint`: `xs` on `screenSM`, `sm` otherwise.

## Usages

Rendered by `LensEditor.tsx` before the Seidel/Zernike analysis controls in both LG and SM layouts.
