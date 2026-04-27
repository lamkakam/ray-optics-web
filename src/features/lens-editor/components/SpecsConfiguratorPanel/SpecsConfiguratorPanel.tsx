import React, { useState } from "react";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { Button } from "@/shared/components/primitives/Button";
import { Select } from "@/shared/components/primitives/Select";
import { Input } from "@/shared/components/primitives/Input";
import { Header } from "@/shared/components/primitives/Header";
import type { PupilSpace, PupilType } from "@/features/lens-editor/stores/specsConfiguratorStore";

interface AperturePatch {
  readonly pupilSpace?: PupilSpace;
  readonly pupilType?: PupilType;
  readonly pupilValue?: number;
}

interface SpecsConfiguratorPanelProps {
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

export function SpecsConfiguratorPanel({
  pupilSpace,
  pupilType,
  pupilValue,
  fieldSummary,
  wavelengthSummary,
  onApertureChange,
  onOpenFieldModal,
  onOpenWavelengthModal,
}: SpecsConfiguratorPanelProps) {
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

  return (
    <div className="max-w-[50vw] space-y-4">
      {/* System Aperture */}
      <section>
        <Header level={3} className="mb-2">System Aperture</Header>
        <div className="flex items-center gap-3">
          <Select
            aria-label="System aperture type"
            options={APERTURE_OPTIONS}
            value={currentDropdownValue}
            onChange={handleDropdownChange}
          />
          <ApertureValueInput
            key={pupilValue}
            pupilValue={pupilValue}
            onCommit={(value) => onApertureChange({ pupilValue: value })}
          />
        </div>
      </section>

      {/* Field */}
      <section>
        <Header level={3} className="mb-2">Field</Header>
        <Tooltip text="Click to configure field settings" position="top-start" noTouch>
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
        <Header level={3} className="mb-2">Wavelengths</Header>
        <Tooltip text="Click to configure wavelengths" position="top-start" noTouch>
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

interface ApertureValueInputProps {
  readonly pupilValue: number;
  readonly onCommit: (value: number) => void;
}

function ApertureValueInput({ pupilValue, onCommit }: ApertureValueInputProps) {
  const [valueStr, setValueStr] = useState(() => String(pupilValue));

  const handleValueBlur = () => {
    const trimmed = valueStr.trim();
    const parsed = Number(trimmed);
    if (trimmed !== "" && !isNaN(parsed)) {
      onCommit(parsed);
      return;
    }

    setValueStr(String(pupilValue));
  };

  return (
    <Input
      type="text"
      aria-label="Aperture value"
      value={valueStr}
      onChange={(e) => setValueStr(e.target.value)}
      onBlur={handleValueBlur}
    />
  );
}
