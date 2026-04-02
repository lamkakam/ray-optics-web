# `features/lens-editor/components/LensPrescriptionContainer.tsx`

## Purpose

Container that owns the toolbar (Update System, Load Config, Download Config, Export Python Script, semi-diameter toggle) and orchestrates all modals for the lens prescription editor. Bridges the `lensEditorStore` to `LensPrescriptionGrid` and its associated modals.

## Injected Dependencies

Lens store state is consumed via `LensEditorStoreContext`:
- `useLensEditorStore()` — imperative access (callbacks use `store.getState().*`). For reactive reads (`rows`, `autoAperture`, modal states), use it with Zustand's `useStore`.

| Dependency | Type | Description |
|------------|------|-------------|
| `getOpticalModel` | `() => OpticalModel` | Returns the current optical model snapshot for export |
| `onImportJson` | `(data: OpticalModel) => void` | Applied after the user confirms import of a JSON config file |
| `onUpdateSystem` | `() => void` | Triggers optical system computation (bound to `handleSubmit` in the page) |
| `isUpdateSystemDisabled` | `boolean` | Disables the Update System button while Pyodide is loading or computing |

## Internal State

- `pythonScriptOpen: boolean` — controls `PythonScriptModal`.
- `importErrorOpen: boolean` — controls the import error `ErrorModal`.
- `pendingImportData: OpticalModel | undefined` — holds parsed JSON awaiting confirmation.
- `fileInputRef: React.RefObject<HTMLInputElement>` — hidden file input for JSON import.

## Key Behaviors

- All grid callbacks (`handleRowChange`, `handleOpenMediumModal`, etc.) are wrapped in `useCallback` with `[store]` dependency where `store = useLensEditorStore()` — accessing `store.getState()` directly prevents grid column def recreation.
- File import validates the parsed JSON via `validateImportedLensData`; invalid files trigger `ErrorModal` instead of `ConfirmImportModal`.
- The `MediumSelectorModal`, `AsphericalModal`, and `DecenterModal` each use a `key` prop that changes when the modal opens for a different row, ensuring local state is reset.
- `PythonScriptModal` receives an empty string for `script` when closed, generating the script only when open.
- Auto/Manual semi-diameter toggle updates `autoAperture` in the store and passes `semiDiameterReadonly` to the grid.

## Usages

- Mounted once in the main page inside the `BottomDrawer` tabs.
