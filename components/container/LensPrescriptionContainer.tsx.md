# `components/container/LensPrescriptionContainer.tsx`

## Purpose

Container that owns the toolbar (Load Config, Download Config, Export Python Script, semi-diameter toggle) and orchestrates all modals for the lens prescription editor. Bridges the `lensEditorStore` to `LensPrescriptionGrid` and its associated modals.

## Injected Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| `store` | `StoreApi<LensEditorState>` | Zustand store instance for lens editor state (rows, modal open/close, autoAperture) |
| `getOpticalModel` | `() => OpticalModel` | Returns the current optical model snapshot for export |
| `onImportJson` | `(data: ImportedLensData) => void` | Applied after the user confirms import of a JSON config file |

## Internal State

- `pythonScriptOpen: boolean` — controls `PythonScriptModal`.
- `importErrorOpen: boolean` — controls the import error `ErrorModal`.
- `pendingImportData: ImportedLensData | undefined` — holds parsed JSON awaiting confirmation.
- `fileInputRef: React.RefObject<HTMLInputElement>` — hidden file input for JSON import.

## Key Behaviors

- All grid callbacks (`handleRowChange`, `handleOpenMediumModal`, etc.) are wrapped in `useCallback` with `[store]` dependency and access `store.getState()` directly — preventing grid column def recreation.
- File import validates the parsed JSON via `validateImportedLensData`; invalid files trigger `ErrorModal` instead of `ConfirmImportModal`.
- The `MediumSelectorModal`, `AsphericalModal`, and `DecenterModal` each use a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
- `PythonScriptModal` receives an empty string for `script` when closed, generating the script only when open.
- Auto/Manual semi-diameter toggle updates `autoAperture` in the store and passes `semiDiameterReadonly` to the grid.

## Usages

- Mounted once in the main page inside the `BottomDrawer` tabs.
