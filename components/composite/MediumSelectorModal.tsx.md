# `components/composite/MediumSelectorModal.tsx`

## Purpose

Modal for selecting an optical medium (glass or special medium). Provides manufacturer and glass dropdowns populated from the bundled `glass-catalogs.json` data file.

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

## Key Behaviors

- When manufacturer changes to `"Special"`, medium resets to `"air"`.
- When manufacturer changes to a catalog, the first glass in the list is selected if the current selection is not in the new catalog.
- `onConfirm` passes an empty string for manufacturer when `"Special"` is selected.
- Uses `key` prop at the call site (in `LensPrescriptionContainer`) to reset state when the modal re-opens for a different row.

## Usages

- Rendered by `LensPrescriptionContainer`; opened from `MediumCell` in the prescription grid.
