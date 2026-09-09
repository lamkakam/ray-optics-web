import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MathJax } from "better-react-mathjax";
import { Button } from "@/shared/components/primitives/Button";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
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
import type { ZernikeData, ZernikeOrdering, ZernikePupilSpace } from "@/features/lens-editor/types/zernikeData";

const ORDERING_OPTIONS: SelectOption[] = [
  { value: "fringe", label: "Fringe" },
  { value: "noll", label: "Noll" },
];
const PUPIL_SPACE_OPTIONS: SelectOption[] = [
  { value: "entrance", label: "Entrance pupil (normalized)" },
  { value: "exit", label: "Reference sphere (projected)" },
];

interface ZernikeTermsModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Options for the Half-Field dropdown */
  readonly fieldOptions: readonly SelectOption[];
  /** Options for the Wavelength dropdown */
  readonly wavelengthOptions: readonly SelectOption[];
  /** Whether the model has finite image space and can support exit-pupil fitting. */
  readonly isFiniteImageSpace: boolean;
  /** Callback to fetch Zernike data. Called on open and on any dropdown change. */
  readonly onFetchData: (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering, pupilSpace: ZernikePupilSpace) => Promise<ZernikeData>;
  /** Called when the Ok button is clicked */
  readonly onClose: () => void;
}

/**
 * Modal that displays Zernike polynomial coefficients for a selected Half-Field, wavelength, ordering, and Zernike fit coordinate system. Data is fetched lazily when the modal opens or when any dropdown selection changes.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Reads `SpecsConfiguratorStore` via `useSpecsConfiguratorStore()` inside the mounted modal content and uses `store.getState().committedSpecs.wavelengths.referenceIndex` as the initial wavelength index. This is intentionally imperative/non-reactive: the modal is initialized from the last committed optical system when it opens.
 * - Mount-on-open: reopening mounts fresh selection state, including the internal `entrance` selection shown as Entrance pupil (normalized).
 * - The Zernike fit-coordinate selector is disabled for infinite image space; its internal `entrance` and `exit` values remain unchanged.
 * - On any dropdown change (field, wavelength, ordering, or fit coordinates): fetches data with the new selection.
 * - After opening, the Wavelength dropdown is user-controlled; later committed-spec changes do not reset the selection until the modal is closed and reopened.
 * - All requests share error handling: latest failures clear results and loading and
 *   show calculation context in ErrorModal. Dismissal preserves usable selectors;
 *   a new request clears the error. Stale successes/failures and completions after
 *   unmount are ignored through an invalidated request counter.
 * - Renders Zernike terms in a scrollable table; row count and index scheme depend on the frontend ordering selection:
 * - Noll: 56 rows, first column "Noll j", uses `nollToNm(j)`
 * - Fringe: `NUM_FRINGE_TERMS` (37) rows, first column "Fringe j", uses `fringeToNm(j)`
 * - Each row shows: j index, Z notation (MathJax), classical name via `classicalName(n, m)`, unnormalized coefficient, RMS-normalized coefficient.
 * - The selected ordering is passed through `onFetchData`; the worker converts it to explicit `(n, m)` terms before calling Python.
 * - Imports `ZernikeData` and `ZernikeOrdering` from `features/lens-editor/types/zernikeData`, and Zernike runtime constants/helpers from `features/lens-editor/lib/zernikeData`.
 * - Summary section displays direct P-V/RMS WFE, fit residual RMS, projected
 *   pupil coverage, and the displayed `Approx. Strehl` metric as `Chip`
 *   components. The value uses the existing `strehl_ratio` field and its
 *   four-decimal formatting.
 * - Uses `<MathJax>` for Zernike notation; context provided by ancestor (`page.tsx`).
 * - **Loading states**:
 * - Initial load (`loading && !data`): shows "Loading…" text, no table.
 * - Re-fetch (`loading && data`): shows `<LoadingMask>` overlaid on the existing table (stale data stays visible behind the mask).
 * - Idle (`!loading && data`): table visible, no mask.
 *
 *
 *
 * ## Layout
 *
 * - Row 1: Half-Field and Wavelength dropdowns in a flex row
 * - Row 2: Zernike fit coordinates dropdown with fit-coordinate help text beneath its selector
 * - Row 3: Ordering dropdown
 * - `relative` wrapper around the table area (needed for `LoadingMask` absolute positioning)
 * - Scrollable table area (`max-h-[clamp(5rem,calc(90dvh-26rem),32rem)] overflow-y-auto`) — viewport-relative height reserves ~26rem for static overhead (title, dropdowns, summary chips, fixed footer, and modal padding), preventing the table from pushing modal content beyond the dialog height on smaller screens. The clamp keeps at least 5rem of table space when the viewport is tight and caps the table at 32rem on larger screens.
 * - Table: 5 columns (j | Notation | Classical Name | Non-normalized Term | RMS Normalized Term (waves))
 * - First column header is "Noll j" or "Fringe j" depending on ordering
 * - Summary: wrapping flex row of direct wavefront, fit, support, and approximate Strehl metrics
 * - `<LoadingMask />` rendered inside the `relative` wrapper only when `loading && data`
 * - Ok button aligned right
 *
 * ## Modal Footer
 *
 * - The Ok action is passed to `Modal.footer` so it remains fixed while Zernike result content scrolls.
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
  isFiniteImageSpace,
  onFetchData,
  onClose,
}: Omit<ZernikeTermsModalProps, "isOpen">) {
  const specsStore = useSpecsConfiguratorStore();
  const committedReferenceWvlIndex = specsStore.getState().committedSpecs.wavelengths.referenceIndex;
  /** Field index reset to zero whenever the modal opens. */
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  /** Wavelength index reset to the committed reference whenever the modal opens. */
  const [selectedWvlIndex, setSelectedWvlIndex] = useState(committedReferenceWvlIndex);
  /** Zernike ordering reset to Fringe whenever the modal opens. */
  const [selectedOrdering, setSelectedOrdering] = useState<ZernikeOrdering>("fringe");
  /** Fit-coordinate value reset to the internal `entrance` selection whenever the modal opens. */
  const [selectedPupilSpace, setSelectedPupilSpace] = useState<ZernikePupilSpace>("entrance");
  /** Most recently fetched coefficient payload. */
  const [data, setData] = useState<ZernikeData | undefined>();
  /** Whether a coefficient request is in progress. */
  const [loading, setLoading] = useState(true);
  /** Latest calculation failure, dismissed independently of the coefficient modal. */
  const [error, setError] = useState<string | undefined>();
  /** Monotonic request id used to discard stale asynchronous results. */
  const requestCounter = useRef(0);

  /** Fetch every selection through one recoverable, latest-request-only path. */
  const fetchData = useCallback(
    async (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering, pupilSpace: ZernikePupilSpace) => {
      const requestId = ++requestCounter.current;
      setLoading(true);
      setError(undefined);
      try {
        const result = await onFetchData(fieldIndex, wvlIndex, ordering, pupilSpace);
        if (requestCounter.current === requestId) setData(result);
      } catch (reason: unknown) {
        if (requestCounter.current !== requestId) return;
        setData(undefined);
        const detail = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unknown calculation failure.";
        setError(`Zernike calculation failed (field index ${fieldIndex}, wavelength index ${wvlIndex}, ${ordering}): ${detail}`);
      } finally {
        if (requestCounter.current === requestId) setLoading(false);
      }
    },
    [onFetchData],
  );

  useEffect(() => {
    void fetchData(0, committedReferenceWvlIndex, "fringe", "entrance");
    return () => { requestCounter.current += 1; };
  }, [committedReferenceWvlIndex, fetchData]);

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedFieldIndex(idx);
      fetchData(idx, selectedWvlIndex, selectedOrdering, selectedPupilSpace);
    },
    [fetchData, selectedWvlIndex, selectedOrdering, selectedPupilSpace],
  );

  const handleWvlChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedWvlIndex(idx);
      fetchData(selectedFieldIndex, idx, selectedOrdering, selectedPupilSpace);
    },
    [fetchData, selectedFieldIndex, selectedOrdering, selectedPupilSpace],
  );

  const handleOrderingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const ord = e.target.value as ZernikeOrdering;
      setSelectedOrdering(ord);
      fetchData(selectedFieldIndex, selectedWvlIndex, ord, selectedPupilSpace);
    },
    [fetchData, selectedFieldIndex, selectedWvlIndex, selectedPupilSpace],
  );

  const handlePupilSpaceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const pupilSpace = e.target.value as ZernikePupilSpace;
    setSelectedPupilSpace(pupilSpace);
    fetchData(selectedFieldIndex, selectedWvlIndex, selectedOrdering, pupilSpace);
  }, [fetchData, selectedFieldIndex, selectedOrdering, selectedWvlIndex]);

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
    <>
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
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="zernike-pupil-space-select">Zernike fit coordinates</Label>
              <Select id="zernike-pupil-space-select" aria-label="Zernike fit coordinates" options={PUPIL_SPACE_OPTIONS} value={selectedPupilSpace} onChange={handlePupilSpaceChange} disabled={!isFiniteImageSpace} />
            </div>
            <Paragraph variant="caption">
              Changes the fitting coordinates and sample weighting; the OPD reference remains unchanged. Entrance pupil uses uniform sample weights. Projected reference sphere uses projected-area weights.
            </Paragraph>
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
                <strong>Fit Residual RMS:</strong> {data.fit_residual_rms.toFixed(4)} waves
              </Chip>
              <Chip>
                <strong>Pupil Coverage:</strong> {(100 * data.support_coverage).toFixed(1)}%
              </Chip>
              <Chip>
                <strong>Approx. Strehl:</strong> {data.strehl_ratio.toFixed(4)}
              </Chip>
            </div>
            {loading && <LoadingMask />}
          </div>
        )}
      </Modal>
      <ErrorModal isOpen={error !== undefined} message={error} onClose={() => setError(undefined)} />
    </>
  );
}
