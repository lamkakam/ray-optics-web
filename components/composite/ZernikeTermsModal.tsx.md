# `components/composite/ZernikeTermsModal.tsx`

## Purpose

Modal that displays Zernike polynomial coefficients for a selected field and wavelength. Data is fetched lazily when the modal opens or when dropdown selections change.

## Props

```ts
interface ZernikeTermsModalProps {
  readonly isOpen: boolean;
  readonly fieldOptions: readonly SelectOption[];
  readonly wavelengthOptions: readonly SelectOption[];
  readonly onFetchData: (fieldIndex: number, wvlIndex: number) => Promise<ZernikeData>;
  readonly onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `fieldOptions` | `readonly SelectOption[]` | Yes | Options for the Field dropdown |
| `wavelengthOptions` | `readonly SelectOption[]` | Yes | Options for the Wavelength dropdown |
| `onFetchData` | `(fieldIndex, wvlIndex) => Promise<ZernikeData>` | Yes | Callback to fetch Zernike data. Called on open and on dropdown change. |
| `onClose` | `() => void` | Yes | Called when the Ok button is clicked |

## Internal State

| State | Type | Description |
|-------|------|-------------|
| `selectedFieldIndex` | `number` | Currently selected field index (reset to 0 on each open) |
| `selectedWvlIndex` | `number` | Currently selected wavelength index (reset to 0 on each open) |
| `data` | `ZernikeData \| undefined` | Fetched Zernike data |
| `loading` | `boolean` | Whether a fetch is in progress |
| `prevIsOpen` | `boolean` | Tracks open transition (false→true) |
| `openCount` | `number` | Increments on each open transition; drives the fetch effect |

## Key Behaviors

- On `isOpen` transition false→true: resets indices to 0 and triggers a data fetch.
- On dropdown change: fetches data with the new selection.
- Race condition guard: uses a request counter ref to discard stale results from prior fetches.
- Renders 56 Noll-ordered Zernike terms in a scrollable table.
- Each row shows: Noll j, Z notation (MathJax), classical name, unnormalized coefficient, RMS-normalized coefficient.
- Summary section displays P-V WFE, RMS WFE, and Strehl ratio.
- Wraps in `MathJaxContext` for inline LaTeX rendering of Zernike notation.

## Layout

- Field + Wavelength dropdowns in a flex row
- Scrollable table area (`max-h-[60vh] overflow-y-auto`)
- Table: 5 columns (Noll j | Notation | Classical Name | Coeff (waves) | RMS Coeff (waves))
- Summary: P-V WFE, RMS WFE, Strehl ratio
- Ok button aligned right

## Usages

- Opened from the main page toolbar ("Zernike Terms" button), conditional on `seidelData` being available (same guard as the Seidel button).
