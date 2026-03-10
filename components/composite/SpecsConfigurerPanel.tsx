import React, { useState, useEffect } from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Tooltip } from "@/components/micro/Tooltip";
import { Button } from "@/components/micro/Button";
import type { PupilSpace, PupilType } from "@/store/specsConfigurerStore";

interface AperturePatch {
  readonly pupilSpace?: PupilSpace;
  readonly pupilType?: PupilType;
  readonly pupilValue?: number;
}

interface SpecsConfigurerPanelProps {
  readonly pupilSpace: PupilSpace;
  readonly pupilType: PupilType;
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
  pupilSpace: PupilSpace;
  pupilType: PupilType;
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
    const trimmed = valueStr.trim();
    const parsed = Number(trimmed);
    if (trimmed !== "" && !isNaN(parsed)) {
      onApertureChange({ pupilValue: parsed });
    } else {
      setValueStr(String(pupilValue));
    }
  };

  return (
    <div className="max-w-[50vw] space-y-4">
      {/* System Aperture */}
      <section>
        <h3 className={`mb-2 text-sm font-semibold ${cx.text.color.heading}`}>
          System Aperture
        </h3>
        <div className="flex items-center gap-3">
          <select
            aria-label="System aperture type"
            className={`${cx.select.style.base} ${cx.select.color.default} ${cx.select.size.default}`}
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
            className={`${cx.input.style.base} ${cx.input.color.default} ${cx.input.size.default}`}
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            onBlur={handleValueBlur}
          />
        </div>
      </section>

      {/* Field */}
      <section>
        <h3 className={`mb-2 text-sm font-semibold ${cx.text.color.heading}`}>
          Field
        </h3>
        <Tooltip text="Click to configure field settings" position="bottom">
          <Button
            variant="toggle"
            aria-label="Configure field"
            className="w-full text-left"
            onClick={onOpenFieldModal}
          >
            {fieldSummary}
          </Button>
        </Tooltip>
      </section>

      {/* Wavelengths */}
      <section>
        <h3 className={`mb-2 text-sm font-semibold ${cx.text.color.heading}`}>
          Wavelengths
        </h3>
        <Tooltip text="Click to configure wavelengths" position="bottom">
          <Button
            variant="toggle"
            aria-label="Configure wavelengths"
            className="w-full text-left"
            onClick={onOpenWavelengthModal}
          >
            {wavelengthSummary}
          </Button>
        </Tooltip>
      </section>
    </div>
  );
}
