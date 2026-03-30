# `components/composite/ZernikeTermsModal.tsx`

## Purpose

Modal that displays Zernike polynomial coefficients for a selected field, wavelength, and ordering (Noll or Fringe). Data is fetched lazily when the modal opens or when any dropdown selection changes.

## Props

```ts
interface ZernikeTermsModalProps {
  readonly isOpen: boolean;
  readonly fieldOptions: readonly SelectOption[];
  readonly wavelengthOptions: readonly SelectOption[];
  readonly onFetchData: (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering) => Promise<ZernikeData>;
  readonly onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `fieldOptions` | `readonly SelectOption[]` | Yes | Options for the Field dropdown |
| `wavelengthOptions` | `readonly SelectOption[]` | Yes | Options for the Wavelength dropdown |
| `onFetchData` | `(fieldIndex, wvlIndex, ordering) => Promise<ZernikeData>` | Yes | Callback to fetch Zernike data. Called on open and on any dropdown change. |
| `onClose` | `() => void` | Yes | Called when the Ok button is clicked |

## Internal State

| State | Type | Description |
|-------|------|-------------|
| `selectedFieldIndex` | `number` | Currently selected field index (reset to 0 on each open) |
| `selectedWvlIndex` | `number` | Currently selected wavelength index (reset to 0 on each open) |
| `selectedOrdering` | `ZernikeOrdering` | "noll" or "fringe" (reset to "fringe" on each open) |
| `data` | `ZernikeData \| undefined` | Fetched Zernike data |
| `loading` | `boolean` | Whether a fetch is in progress |
| `prevIsOpen` | `boolean` | Tracks open transition (false→true) |
| `openCount` | `number` | Increments on each open transition; drives the fetch effect |

## Key Behaviors

- On `isOpen` transition false→true: resets field index, wavelength index, and ordering to 0/"fringe", then triggers a data fetch.
- On any dropdown change (field, wavelength, ordering): fetches data with the new selection.
- Race condition guard: uses a request counter ref to discard stale results from prior fetches.
- Renders Zernike terms in a scrollable table; row count and index scheme depend on ordering:
  - Noll: 56 rows, first column "Noll j", uses `nollToNm(j)`
  - Fringe: `NUM_FRINGE_TERMS` (37) rows, first column "Fringe j", uses `fringeToNm(j)`
- Each row shows: j index, Z notation (MathJax), classical name via `classicalName(n, m)`, unnormalized coefficient, RMS-normalized coefficient.
- Summary section displays P-V WFE, RMS WFE, and Strehl ratio.
- Uses `<MathJax>` for Zernike notation; context provided by ancestor (`page.tsx`).
- **Loading states**:
  - Initial load (`loading && !data`): shows "Loading…" text, no table.
  - Re-fetch (`loading && data`): shows `<LoadingMask>` overlaid on the existing table (stale data stays visible behind the mask).
  - Idle (`!loading && data`): table visible, no mask.

## Layout

- Row 1: Field + Wavelength dropdowns in a flex row
- Row 2: Ordering dropdown (below Field+Wavelength)
- `relative` wrapper around the table area (needed for `LoadingMask` absolute positioning)
- Scrollable table area (`max-h-[calc(90dvh-20rem)] overflow-y-auto`) — viewport-relative height reserves ~20rem for static overhead (title, dropdowns, summary, button, padding), preventing double scrollbar when the modal approaches the `90dvh` cap
- Table: 5 columns (j | Notation | Classical Name | Non-normalized Term | RMS Normalized Term (waves))
  - First column header is "Noll j" or "Fringe j" depending on ordering
- Summary: P-V WFE, RMS WFE, Strehl ratio
- `<LoadingMask />` rendered inside the `relative` wrapper only when `loading && data`
- Ok button aligned right

## Usages

- Opened from the main page toolbar ("Zernike Terms" button), conditional on `seidelData` being available (same guard as the Seidel button).
