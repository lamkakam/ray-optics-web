# `features/lens-editor/components/MediumSelectorModal.tsx`

## Purpose

Modal for selecting an optical medium (glass or special medium) or entering a numeric model glass. Provides manufacturer and glass dropdowns populated from the bundled `glass-catalogs.json` data file, plus a model-glass mode for refractive-index and Abbe-number entry.

## Props

```ts
interface MediumSelectorModalProps {
  isOpen: boolean;
  initialMedium: string;
  initialManufacturer: string;
  onConfirm: (medium: string, manufacturer: string) => void;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `initialMedium` | `string` | Yes | Pre-selected medium on open |
| `initialManufacturer` | `string` | Yes | Pre-selected manufacturer on open; empty string or `"air"` maps to `"Special"` |
| `onConfirm` | `(medium, manufacturer) => void` | Yes | Called with the selected medium and manufacturer (empty string for Special) |
| `onClose` | `() => void` | Yes | Cancel / close callback |

## Internal State

- `manufacturer: string` — selected manufacturer.
- `medium: string` — selected glass/medium.
- `useModelGlass: boolean` — whether the modal is in numeric model-glass mode.
- `singleRefractiveIndex: boolean` — whether the model glass should omit Abbe number.
- `refractiveIndexAtDLine: string` — model-glass refractive index input.
- `abbeNumber: string` — model-glass Abbe-number input.

## Key Behaviors

- When manufacturer changes to `"Special"`, medium resets to `"air"`.
- When manufacturer changes to a catalog, the first glass in the list is selected if the current selection is not in the new catalog.
- `onConfirm` passes an empty string for manufacturer when `"Special"` is selected.
- A `Use model glass` checkbox appears above the catalog controls and defaults to unchecked for non-numeric initial values.
- When `Use model glass` is checked, the manufacturer and glass dropdowns are replaced by:
  - a `Single refractive index` checkbox
  - a `Refractive index at d-line` input
  - an `Abbe Number` input when `Single refractive index` is unchecked
- When `Single refractive index` is checked, the Abbe Number value is cleared and the Abbe Number input is hidden.
- If `initialMedium` parses to a float, the modal auto-enters model-glass mode and seeds the refractive-index input with the original `initialMedium` string.
- If `initialManufacturer` also parses to a float, the modal seeds the Abbe Number input and leaves `Single refractive index` unchecked.
- If `initialMedium` is numeric but `initialManufacturer` is not, the modal starts in model-glass mode with `Single refractive index` checked.
- In model-glass mode, `onConfirm` passes `(refractiveIndexAtDLine, abbeNumber)` or `(refractiveIndexAtDLine, "")` when `Single refractive index` is checked.
- Uses `key` prop at the call site (in `LensPrescriptionContainer`) to reset state when the modal re-opens for a different row.

## Usages

```tsx
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";

// In a container component (e.g., LensPrescriptionContainer)
const mediumRow = rows.find((r) => r.id === mediumModal.rowId);

return (
  <>
    <MediumSelectorModal
      key={mediumModal.open ? mediumModal.rowId : "medium-closed"}
      isOpen={mediumModal.open}
      initialMedium={mediumRow?.kind === "surface" ? mediumRow.medium : "air"}
      initialManufacturer={mediumRow?.kind === "surface" ? mediumRow.manufacturer : ""}
      onConfirm={(medium, manufacturer) => {
        store.getState().updateRow(mediumModal.rowId, { medium, manufacturer });
        store.getState().closeMediumModal();
      }}
      onClose={() => store.getState().closeMediumModal()}
    />
  </>
);
```
