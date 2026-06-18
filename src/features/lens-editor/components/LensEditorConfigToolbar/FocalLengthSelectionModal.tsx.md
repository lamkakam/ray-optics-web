# `features/lens-editor/components/LensEditorConfigToolbar/FocalLengthSelectionModal.tsx`

## Purpose

Toolbar-local modal for choosing a focal-length column when importing a zoom Photons to Photos `.txt` file.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls visibility |
| `choices` | `PhotonsToPhotosFocalLengthChoice[]` | Available focal-length columns |
| `onConfirm` | `(choiceIndex: number) => void` | Resolves the selected column |
| `onCancel` | `() => void` | Aborts the TXT import |

## Behavior

- Renders a non-backdrop-dismissible `Modal` titled `Select Focal Length`.
- Uses shared `RadioInput` with labels like `24.376 mm`; the first choice is selected initially.
- `Cancel` closes without importing. `Confirm` passes the selected choice index back to the toolbar.
