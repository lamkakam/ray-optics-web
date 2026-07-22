/**
# `features/lens-editor/components/ZernikeTermsModal/ZernikeTermsModal.tsx`

## Internal State

| State | Type | Description |
|-------|------|-------------|
| `selectedFieldIndex` | `number` | Currently selected field index (reset to 0 on each open) |
| `selectedWvlIndex` | `number` | Currently selected wavelength index (initialized from `committedSpecs.wavelengths.referenceIndex` on each open) |
| `selectedOrdering` | `ZernikeOrdering` | "noll" or "fringe" (reset to "fringe" on each open) |
| `data` | `ZernikeData \| undefined` | Fetched Zernike data |
| `loading` | `boolean` | Whether a fetch is in progress |
| `requestCounter` | `MutableRefObject<number>` | Monotonic request id used to ignore stale async results |

## Layout

- Row 1: Half-Field + Wavelength dropdowns in a flex row
- Row 2: Ordering dropdown (below Half-Field + Wavelength)
- `relative` wrapper around the table area (needed for `LoadingMask` absolute positioning)
- Scrollable table area (`max-h-[clamp(5rem,calc(90dvh-26rem),32rem)] overflow-y-auto`) — viewport-relative height reserves ~26rem for static overhead (title, dropdowns, summary chips, fixed footer, and modal padding), preventing the table from pushing modal content beyond the dialog height on smaller screens. The clamp keeps at least 5rem of table space when the viewport is tight and caps the table at 32rem on larger screens.
- Table: 5 columns (j | Notation | Classical Name | Non-normalized Term | RMS Normalized Term (waves))
  - First column header is "Noll j" or "Fringe j" depending on ordering
- Summary: wrapping flex row of `Chip` components for P-V WFE, RMS WFE, and Strehl ratio
- `<LoadingMask />` rendered inside the `relative` wrapper only when `loading && data`
- Ok button aligned right

## Modal Footer

- The Ok action is passed to `Modal.footer` so it remains fixed while Zernike result content scrolls.
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MathJax } from "better-react-mathjax";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Table } from "@/shared/components/primitives/Table";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import type { SelectOption } from "@/shared/components/primitives/Select";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Chip } from "@/shared/components/primitives/Chip";
import { LoadingMask } from "@/shared/components/primitives/LoadingMask";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import {
  NUM_NOLL_TERMS,
  NUM_FRINGE_TERMS,
  nollToNm,
  fringeToNm,
  zernikeNotation,
  classicalName,
} from "@/features/lens-editor/lib/zernikeData";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";

const ORDERING_OPTIONS: SelectOption[] = [
  { value: "fringe", label: "Fringe" },
  { value: "noll", label: "Noll" },
];

/**
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
| `fieldOptions` | `readonly SelectOption[]` | Yes | Options for the Half-Field dropdown |
| `wavelengthOptions` | `readonly SelectOption[]` | Yes | Options for the Wavelength dropdown |
| `onFetchData` | `(fieldIndex, wvlIndex, ordering) => Promise<ZernikeData>` | Yes | Callback to fetch Zernike data. Called on open and on any dropdown change. |
| `onClose` | `() => void` | Yes | Called when the Ok button is clicked |
*/
interface ZernikeTermsModalProps {
  readonly isOpen: boolean;
  readonly fieldOptions: readonly SelectOption[];
  readonly wavelengthOptions: readonly SelectOption[];
  readonly onFetchData: (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering) => Promise<ZernikeData>;
  readonly onClose: () => void;
}

/**
## Purpose

Modal that displays Zernike polynomial coefficients for a selected Half-Field, wavelength, and ordering (Noll or Fringe). Data is fetched lazily when the modal opens or when any dropdown selection changes.

## Key Behaviors

- Reads `SpecsConfiguratorStore` via `useSpecsConfiguratorStore()` inside the mounted modal content and uses `store.getState().committedSpecs.wavelengths.referenceIndex` as the initial wavelength index. This is intentionally imperative/non-reactive: the modal is initialized from the last committed optical system when it opens.
- Mount-on-open: when `isOpen=false`, the component returns `null`; reopening mounts a fresh inner editor with default selection state (`0`, latest committed reference wavelength index, `"fringe"`).
- On mount, fetches data once for `(field=0, wavelength=committed reference index, ordering="fringe")`.
- On any dropdown change (field, wavelength, ordering): fetches data with the new selection.
- After opening, the Wavelength dropdown is user-controlled; later committed-spec changes do not reset the selection until the modal is closed and reopened.
- Race condition guard: uses a request counter ref to discard stale results from prior fetches.
- Renders Zernike terms in a scrollable table; row count and index scheme depend on the frontend ordering selection:
  - Noll: 56 rows, first column "Noll j", uses `nollToNm(j)`
  - Fringe: `NUM_FRINGE_TERMS` (37) rows, first column "Fringe j", uses `fringeToNm(j)`
- Each row shows: j index, Z notation (MathJax), classical name via `classicalName(n, m)`, unnormalized coefficient, RMS-normalized coefficient.
- The selected ordering is passed through `onFetchData`; the worker converts it to explicit `(n, m)` terms before calling Python.
- Imports `ZernikeData` and `ZernikeOrdering` from `features/lens-editor/types/zernikeData`, and Zernike runtime constants/helpers from `features/lens-editor/lib/zernikeData`.
- Summary section displays P-V WFE, RMS WFE, and Strehl ratio as `Chip` components.
- Uses `<MathJax>` for Zernike notation; context provided by ancestor (`page.tsx`).
- **Loading states**:
  - Initial load (`loading && !data`): shows "Loading…" text, no table.
  - Re-fetch (`loading && data`): shows `<LoadingMask>` overlaid on the existing table (stale data stays visible behind the mask).
  - Idle (`!loading && data`): table visible, no mask.

## Usages

```tsx
import { NUM_FRINGE_TERMS, NUM_NOLL_TERMS } from "@/features/lens-editor/lib/zernikeData";
import { ZernikeTermsModal } from "@/features/lens-editor/components/ZernikeTermsModal";
import type { ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";

// In a page component (e.g., LensEditor)
const [zernikeModalOpen, setZernikeModalOpen] = useState(false);

const handleFetchZernikeData = useCallback(
  async (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering) => {
    if (!proxy) throw new Error("Pyodide not ready");
    const committedOpticalModel = lensStore.getState().committedOpticalModel;
    if (!committedOpticalModel) throw new Error("No optical model computed yet");
    const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
    return proxy.getZernikeCoefficients(committedOpticalModel, fieldIndex, wvlIndex, imagePoint, numTerms, ordering);
  },
  [proxy, lensStore]
);

return (
  <>
    <ZernikeTermsModal
      isOpen={zernikeModalOpen}
      fieldOptions={specsStore.getState().getFieldOptions()}
      wavelengthOptions={specsStore.getState().getWavelengthOptions()}
      onFetchData={handleFetchZernikeData}
      onClose={() => setZernikeModalOpen(false)}
    />
  </>
);
```
*/
export function ZernikeTermsModal({
  isOpen,
  ...props
}: ZernikeTermsModalProps) {
  if (!isOpen) {
    return null;
  }

  return <ZernikeTermsModalContent key="zernike-terms-modal" {...props} />;
}

function ZernikeTermsModalContent({
  fieldOptions,
  wavelengthOptions,
  onFetchData,
  onClose,
}: Omit<ZernikeTermsModalProps, "isOpen">) {
  const specsStore = useSpecsConfiguratorStore();
  const committedReferenceWvlIndex = specsStore.getState().committedSpecs.wavelengths.referenceIndex;
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [selectedWvlIndex, setSelectedWvlIndex] = useState(committedReferenceWvlIndex);
  const [selectedOrdering, setSelectedOrdering] = useState<ZernikeOrdering>("fringe");
  const [data, setData] = useState<ZernikeData | undefined>();
  const [loading, setLoading] = useState(true);
  const requestCounter = useRef(0);

  const fetchData = useCallback(
    (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering) => {
      requestCounter.current += 1;
      const requestId = requestCounter.current;
      setLoading(true);
      onFetchData(fieldIndex, wvlIndex, ordering).then((result) => {
        if (requestCounter.current === requestId) {
          setData(result);
          setLoading(false);
        }
      });
    },
    [onFetchData],
  );

  useEffect(() => {
    requestCounter.current += 1;
    const requestId = requestCounter.current;

    onFetchData(0, committedReferenceWvlIndex, "fringe").then((result) => {
      if (requestCounter.current === requestId) {
        setData(result);
        setLoading(false);
      }
    });
  }, [committedReferenceWvlIndex, onFetchData]);

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedFieldIndex(idx);
      fetchData(idx, selectedWvlIndex, selectedOrdering);
    },
    [fetchData, selectedWvlIndex, selectedOrdering],
  );

  const handleWvlChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedWvlIndex(idx);
      fetchData(selectedFieldIndex, idx, selectedOrdering);
    },
    [fetchData, selectedFieldIndex, selectedOrdering],
  );

  const handleOrderingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const ord = e.target.value as ZernikeOrdering;
      setSelectedOrdering(ord);
      fetchData(selectedFieldIndex, selectedWvlIndex, ord);
    },
    [fetchData, selectedFieldIndex, selectedWvlIndex],
  );

  const numTerms = selectedOrdering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
  const toNm = selectedOrdering === "noll" ? nollToNm : fringeToNm;
  const firstColHeader = selectedOrdering === "noll" ? "Noll j" : "Fringe j";

  const headers = useMemo(
    () => [firstColHeader, "Notation", "Classical Name", "Non-normalized Term", "RMS Normalized Term (waves)"],
    [firstColHeader],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: Math.min(numTerms, data.coefficients.length) }, (_, i) => {
      const j = i + 1;
      const [n, m] = toNm(j);
      return [
        String(j),
        <MathJax key={`${n}-${m}`} inline>{zernikeNotation(n, m)}</MathJax>,
        classicalName(n, m),
        data.coefficients[i].toFixed(6),
        data.rms_normalized_coefficients[i].toFixed(6),
      ];
    });
  }, [data, numTerms, toNm]);

  return (
    <Modal
      isOpen={true}
      title="Zernike Terms"
      titleId="zernike-modal-title"
      size="4xl"
      footer={(
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>Ok</Button>
        </div>
      )}
    >
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="zernike-field-select">Half-Field</Label>
            <Select
              id="zernike-field-select"
              aria-label="Half-Field"
              options={fieldOptions as SelectOption[]}
              value={selectedFieldIndex}
              onChange={handleFieldChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="zernike-wvl-select">Wavelength</Label>
            <Select
              id="zernike-wvl-select"
              options={wavelengthOptions as SelectOption[]}
              value={selectedWvlIndex}
              onChange={handleWvlChange}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="zernike-ordering-select">Ordering</Label>
            <Select
              id="zernike-ordering-select"
              options={ORDERING_OPTIONS}
              value={selectedOrdering}
              onChange={handleOrderingChange}
            />
          </div>
        </div>

        {loading && !data && <Paragraph>Loading…</Paragraph>}

        {data && (
          <div className="relative">
            <div data-testid="zernike-table-scroll" className="max-h-[clamp(5rem,calc(90dvh-26rem),32rem)] overflow-y-auto">
              <Table headers={headers} rows={rows} />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Chip>
                <strong>P-V WFE:</strong> {data.pv_wfe.toFixed(4)} waves
              </Chip>
              <Chip>
                <strong>RMS WFE:</strong> {data.rms_wfe.toFixed(4)} waves
              </Chip>
              <Chip>
                <strong>Strehl Ratio:</strong> {data.strehl_ratio.toFixed(4)}
              </Chip>
            </div>
            {loading && <LoadingMask />}
          </div>
        )}
      </Modal>
  );
}
