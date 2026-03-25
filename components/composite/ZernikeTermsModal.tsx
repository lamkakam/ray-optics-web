import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Table } from "@/components/micro/Table";
import { Label } from "@/components/micro/Label";
import { Select } from "@/components/micro/Select";
import type { SelectOption } from "@/components/micro/Select";
import { Paragraph } from "@/components/micro/Paragraph";
import { LoadingMask } from "@/components/micro/LoadingMask";
import {
  type ZernikeData,
  type ZernikeOrdering,
  NUM_NOLL_TERMS,
  NUM_FRINGE_TERMS,
  nollToNm,
  fringeToNm,
  zernikeNotation,
  classicalName,
} from "@/lib/zernikeData";

const ORDERING_OPTIONS: SelectOption[] = [
  { value: "noll", label: "Noll" },
  { value: "fringe", label: "Fringe" },
];

interface ZernikeTermsModalProps {
  readonly isOpen: boolean;
  readonly fieldOptions: readonly SelectOption[];
  readonly wavelengthOptions: readonly SelectOption[];
  readonly onFetchData: (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering) => Promise<ZernikeData>;
  readonly onClose: () => void;
}

export function ZernikeTermsModal({
  isOpen,
  fieldOptions,
  wavelengthOptions,
  onFetchData,
  onClose,
}: ZernikeTermsModalProps) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [selectedWvlIndex, setSelectedWvlIndex] = useState(0);
  const [selectedOrdering, setSelectedOrdering] = useState<ZernikeOrdering>("noll");
  const [data, setData] = useState<ZernikeData | undefined>();
  const [loading, setLoading] = useState(false);
  const requestCounter = useRef(0);

  // Track open transitions: prevIsOpen as state enables render-phase detection
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setOpenCount((c) => c + 1);
    setSelectedFieldIndex(0);
    setSelectedWvlIndex(0);
    setSelectedOrdering("noll");
  }
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

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
    if (openCount > 0) {
      fetchData(0, 0, "noll"); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [openCount, fetchData]);

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
    return Array.from({ length: numTerms }, (_, i) => {
      const j = i + 1;
      const [n, m] = toNm(j);
      return [
        String(j),
        <MathJax key={j} inline>{zernikeNotation(n, m)}</MathJax>,
        classicalName(n, m),
        data.coefficients[i].toFixed(6),
        data.rms_normalized_coefficients[i].toFixed(6),
      ];
    });
  }, [data, numTerms, toNm]);

  if (!isOpen) return null;

  return (
    <MathJaxContext>
      <Modal isOpen={isOpen} title="Zernike Terms" titleId="zernike-modal-title" size="4xl">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="zernike-field-select">Field</Label>
            <Select
              id="zernike-field-select"
              options={fieldOptions as SelectOption[]}
              value={selectedFieldIndex}
              onChange={handleFieldChange}
              type="compact"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="zernike-wvl-select">Wavelength</Label>
            <Select
              id="zernike-wvl-select"
              options={wavelengthOptions as SelectOption[]}
              value={selectedWvlIndex}
              onChange={handleWvlChange}
              type="compact"
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
              type="compact"
            />
          </div>
        </div>

        {loading && !data && <Paragraph>Loading…</Paragraph>}

        {data && (
          <div className="relative">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table headers={headers} rows={rows} />
            </div>
            <div className="flex gap-6 mt-4">
              <Paragraph>
                <strong>P-V WFE:</strong> {data.pv_wfe.toFixed(4)} waves
              </Paragraph>
              <Paragraph>
                <strong>RMS WFE:</strong> {data.rms_wfe.toFixed(4)} waves
              </Paragraph>
              <Paragraph>
                <strong>Strehl Ratio:</strong> {data.strehl_ratio.toFixed(4)}
              </Paragraph>
            </div>
            {loading && <LoadingMask />}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="primary" onClick={onClose}>Ok</Button>
        </div>
      </Modal>
    </MathJaxContext>
  );
}
