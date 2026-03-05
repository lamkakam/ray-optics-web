import React, { useState, useEffect } from "react";
import { cx } from "@/components/ui/modalTokens";

interface AperturePatch {
  readonly pupilSpace?: "object" | "image";
  readonly pupilType?: "epd" | "f/#" | "NA";
  readonly pupilValue?: number;
}

interface SpecsConfigurerPanelProps {
  readonly pupilSpace: "object" | "image";
  readonly pupilType: "epd" | "f/#" | "NA";
  readonly pupilValue: number;
  readonly fieldSummary: string;
  readonly wavelengthSummary: string;
  readonly onApertureChange: (patch: AperturePatch) => void;
  readonly onOpenFieldModal: () => void;
  readonly onOpenWavelengthModal: () => void;
}

const APERTURE_OPTIONS: readonly {
  label: string;
  value: string;
  pupilSpace: "object" | "image";
  pupilType: "epd" | "f/#" | "NA";
}[] = [
  { label: "Entrance Pupil Diameter", value: "object:epd", pupilSpace: "object", pupilType: "epd" },
  { label: "Image Space F/#", value: "image:f/#", pupilSpace: "image", pupilType: "f/#" },
  { label: "Object Space NA", value: "object:NA", pupilSpace: "object", pupilType: "NA" },
];

export function SpecsConfigurerPanel({
  pupilSpace,
  pupilType,
  pupilValue,
  fieldSummary,
  wavelengthSummary,
  onApertureChange,
  onOpenFieldModal,
  onOpenWavelengthModal,
}: SpecsConfigurerPanelProps) {
  const [valueStr, setValueStr] = useState(String(pupilValue));

  useEffect(() => {
    setValueStr(String(pupilValue));
  }, [pupilValue]);

  const currentDropdownValue = `${pupilSpace}:${pupilType}`;

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = APERTURE_OPTIONS.find((o) => o.value === e.target.value);
    if (option) {
      onApertureChange({
        pupilSpace: option.pupilSpace,
        pupilType: option.pupilType,
      });
    }
  };

  const handleValueBlur = () => {
    const parsed = parseFloat(valueStr);
    if (!isNaN(parsed)) {
      onApertureChange({ pupilValue: parsed });
    }
  };

  return (
    <div className="max-w-[50vw] space-y-4">
      {/* System Aperture */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          System Aperture
        </h3>
        <div className="flex items-center gap-3">
          <select
            aria-label="System aperture type"
            className={cx.select}
            value={currentDropdownValue}
            onChange={handleDropdownChange}
          >
            {APERTURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            aria-label="Aperture value"
            className={cx.input}
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            onBlur={handleValueBlur}
          />
        </div>
      </section>

      {/* Field */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Field
        </h3>
        <button
          type="button"
          aria-label="Configure field"
          className={cx.btnToggle + " w-full text-left"}
          onClick={onOpenFieldModal}
        >
          {fieldSummary}
        </button>
      </section>

      {/* Wavelengths */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Wavelengths
        </h3>
        <button
          type="button"
          aria-label="Configure wavelengths"
          className={cx.btnToggle + " w-full text-left"}
          onClick={onOpenWavelengthModal}
        >
          {wavelengthSummary}
        </button>
      </section>
    </div>
  );
}
