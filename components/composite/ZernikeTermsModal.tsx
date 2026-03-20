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
  NUM_NOLL_TERMS,
  nollToNm,
  zernikeNotation,
  NOLL_CLASSICAL_NAMES,
} from "@/lib/zernikeData";

interface ZernikeTermsModalProps {
  readonly isOpen: boolean;
  readonly fieldOptions: readonly SelectOption[];
  readonly wavelengthOptions: readonly SelectOption[];
  readonly onFetchData: (fieldIndex: number, wvlIndex: number) => Promise<ZernikeData>;
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
  }
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const fetchData = useCallback(
    (fieldIndex: number, wvlIndex: number) => {
      requestCounter.current += 1;
      const requestId = requestCounter.current;
      setLoading(true);
      onFetchData(fieldIndex, wvlIndex).then((result) => {
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
      fetchData(0, 0); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [openCount, fetchData]);

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedFieldIndex(idx);
      fetchData(idx, selectedWvlIndex);
    },
    [fetchData, selectedWvlIndex],
  );

  const handleWvlChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setSelectedWvlIndex(idx);
      fetchData(selectedFieldIndex, idx);
    },
    [fetchData, selectedFieldIndex],
  );

  const headers = useMemo(
    () => ["Noll j", "Notation", "Classical Name", "Coeff (waves)", "RMS Coeff (waves)"],
    [],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: NUM_NOLL_TERMS }, (_, i) => {
      const j = i + 1;
      const [n, m] = nollToNm(j);
      return [
        String(j),
        <MathJax key={j} inline>{zernikeNotation(n, m)}</MathJax>,
        NOLL_CLASSICAL_NAMES[j] ?? "",
        data.coefficients[i].toFixed(6),
        data.rms_normalized_coefficients[i].toFixed(6),
      ];
    });
  }, [data]);

  if (!isOpen) return null;

  return (
    <MathJaxContext>
      <Modal isOpen={isOpen} title="Zernike Terms" titleId="zernike-modal-title" size="4xl">
        <div className="flex items-center gap-4 mb-4">
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
