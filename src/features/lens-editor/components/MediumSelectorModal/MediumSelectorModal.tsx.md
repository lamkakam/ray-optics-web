# `features/lens-editor/components/MediumSelectorModal/MediumSelectorModal.tsx`

## Purpose

Modal for selecting an optical medium (glass or special medium) or entering a numeric model glass. Manufacturer and glass dropdowns are populated from the app-wide `GlassCatalogProvider`, which uses the same Pyodide-backed catalog source as the glass map.

## Props

```ts
interface MediumSelectorModalProps {
  isOpen: boolean;
  initialMedium: string;
  initialManufacturer: string;
  readOnly?: boolean;
  allowReflective?: boolean;
  selectedMedium?: string;
  selectedManufacturer?: string;
  onSelectionChange?: (medium: string, manufacturer: string) => void;
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
| `readOnly` | `boolean` | No | When `true`, all controls are disabled and the footer shows only `Close` |
| `allowReflective` | `boolean` | No | When `false`, `"REFL"` is removed from the Special media options |
| `selectedMedium` | `string \| undefined` | No | Controlled catalog-glass medium value used when the parent persists an unconfirmed draft |
| `selectedManufacturer` | `string \| undefined` | No | Controlled catalog-glass manufacturer value used with `selectedMedium` |
| `onSelectionChange` | `(medium, manufacturer) => void` | No | Called whenever the catalog-glass draft changes |
| `onConfirm` | `(medium, manufacturer) => void` | Yes | Called with the selected medium and manufacturer (empty string for Special) |
| `onClose` | `() => void` | Yes | Cancel / close callback |

## Internal State

- `manufacturer: string` — selected manufacturer.
- `medium: string` — selected glass/medium.
- `useModelGlass: boolean` — whether the modal is in numeric model-glass mode.
- `singleRefractiveIndex: boolean` — whether the model glass should omit Abbe number.
- `refractiveIndexAtDLine: string` — model-glass refractive index input.
- `abbeNumber: string` — model-glass Abbe-number input.
- `catalogs / error / isLoaded` — injected from `useGlassCatalogs()`.

## Key Behaviors

- When manufacturer changes to `"Special"`, medium resets to `"air"`.
- Manufacturer options come from loaded provider catalogs with `"Special"` prefixed and empty catalogs omitted.
- The `"Special"` glass list combines built-in non-glass media (`"air"`, `"REFL"`) with provider-backed special glasses such as `"CaF2"`.
- When `allowReflective` is `false`, `"REFL"` is excluded from the Special media list so object-space media cannot be set to reflective.
- When manufacturer changes to a catalog, the first glass in that provider-backed list is selected if the current selection is not in the new catalog.
- When `selectedMedium` / `selectedManufacturer` are provided, the catalog-glass dropdowns are controlled by the parent so unconfirmed choices can survive route changes.
- `onSelectionChange` fires for catalog-glass changes and reports `"Special"` for the special manufacturer option.
- `onConfirm` passes an empty string for manufacturer when `"Special"` is selected.
- When `Use model glass` is unchecked and a catalog glass is selected, an inline `View in glass map` link appears below the glass dropdown.
- The glass-map link targets `/glass-map` with query params `source=medium-selector`, `catalog=<manufacturer>`, and `glass=<medium>`.
- The glass-map link is hidden for `"Special"` media and for model-glass mode.
- If catalog data is still loading or failed, the modal shows a status message and disables the manufacturer/glass selects instead of assuming static bundled data.
- A shared compact `CheckboxInput` labelled `Use model glass` appears above the catalog controls and defaults to unchecked for non-numeric initial values.
- When `Use model glass` is checked, the manufacturer and glass dropdowns are replaced by:
  - a `Single refractive index` checkbox rendered with the shared checkbox primitive
  - a `Refractive index at d-line` input
  - an `Abbe Number` input when `Single refractive index` is unchecked
- When `Single refractive index` is checked, the Abbe Number value is cleared and the Abbe Number input is hidden.
- If `initialMedium` parses to a float, the modal auto-enters model-glass mode and seeds the refractive-index input with the original `initialMedium` string.
- If `initialManufacturer` also parses to a float, the modal seeds the Abbe Number input and leaves `Single refractive index` unchecked.
- If `initialMedium` is numeric but `initialManufacturer` is not, the modal starts in model-glass mode with `Single refractive index` checked.
- On blur, `Refractive index at d-line` is normalized to a positive numeric string; parse failure, `NaN`, zero, or negative values reset it to `"1.0"`.
- On blur, `Abbe Number` is normalized to either a numeric string or the empty string; parse failure or `NaN` resets it to `""`.
- In model-glass mode, `onConfirm` passes `(refractiveIndexAtDLine, abbeNumber)` or `(refractiveIndexAtDLine, "")` when `Single refractive index` is checked.
- In `readOnly` mode, all checkboxes, selects, and inputs are disabled and the footer renders a single `Close` action instead of `Cancel` / `Confirm`.
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
      initialMedium={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.medium : "air"}
      initialManufacturer={mediumRow?.kind === "surface" || mediumRow?.kind === "object" ? mediumRow.manufacturer : ""}
      allowReflective={mediumRow?.kind !== "object"}
      onConfirm={(medium, manufacturer) => {
        store.getState().updateRow(mediumModal.rowId, { medium, manufacturer });
        store.getState().closeMediumModal();
      }}
      onClose={() => store.getState().closeMediumModal()}
    />
  </>
);
```
