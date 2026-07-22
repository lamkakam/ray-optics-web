/**
# `features/lens-editor/components/SpecsConfiguratorPanel/SpecsConfiguratorPanel.tsx`

## Internal State

- `ApertureValueInput.valueStr: string` — local string draft of `pupilValue` held by a keyed child input. The child remounts when the committed `pupilValue` changes, so no prop-sync `useEffect` is needed. The draft is committed on `blur` if it parses to a valid number; otherwise it reverts to the last committed value.
*/
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
  /** Current aperture space (`"object"` / `"image"`) */
  readonly pupilSpace: PupilSpace;
  /** Current aperture type (`"epd"`, `"f/#"`, `"NA"`) */
  readonly pupilType: PupilType;
  /** Numeric aperture value */
  readonly pupilValue: number;
  /** Human-readable summary of field config (e.g. `"3 fields, 20° max"`) */
  readonly fieldSummary: string;
  /** Human-readable summary of wavelengths (e.g. `"3 wavelengths"`) */
  readonly wavelengthSummary: string;
  /** Partial update for aperture space, type, or value */
  readonly onApertureChange: (patch: AperturePatch) => void;
  /** Opens `FieldConfigModal` */
  readonly onOpenFieldModal: () => void;
  /** Opens `WavelengthConfigModal` */
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

/**
## Purpose

Presentational panel for editing optical system specifications: system aperture (type + value), visible Half-Field summary, and wavelength summary. Calls back to the container for all state changes; holds only a local draft string for the aperture value input.

## Key Behaviors

- Aperture dropdown selects from three pre-defined combinations of `pupilSpace`+`pupilType`.
- Half-Field and wavelength sections show their summaries as toggle-style buttons that open the respective modals.

## Usages

```tsx
import { SpecsConfiguratorPanel } from "@/features/lens-editor/components/SpecsConfiguratorPanel";

// In a container component (e.g., SpecsConfiguratorContainer)
const pupilSpace = useStore(store, (s) => s.pupilSpace);
const pupilType = useStore(store, (s) => s.pupilType);
const pupilValue = useStore(store, (s) => s.pupilValue);
const fieldSpace = useStore(store, (s) => s.fieldSpace);
const fieldType = useStore(store, (s) => s.fieldType);
const maxField = useStore(store, (s) => s.maxField);
const relativeFields = useStore(store, (s) => s.relativeFields);
const wavelengthWeights = useStore(store, (s) => s.wavelengthWeights);

const fieldSummary = `${relativeFields.length} field${relativeFields.length !== 1 ? "s" : ""}, ${maxField}${fieldType === "angle" ? "°" : "mm"} max`;
const wavelengthSummary = `${wavelengthWeights.length} wavelength${wavelengthWeights.length !== 1 ? "s" : ""}`;

const handleApertureChange = useCallback(
  (patch: { pupilSpace?: PupilSpace; pupilType?: PupilType; pupilValue?: number }) => {
    store.getState().setAperture(patch);
  },
  [store]
);

return (
  <SpecsConfiguratorPanel
    pupilSpace={pupilSpace}
    pupilType={pupilType}
    pupilValue={pupilValue}
    fieldSummary={fieldSummary}
    wavelengthSummary={wavelengthSummary}
    onApertureChange={handleApertureChange}
    onOpenFieldModal={() => store.getState().openFieldModal()}
    onOpenWavelengthModal={() => store.getState().openWavelengthModal()}
  />
);
```
*/
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
        <Header level={3} className="mb-2">Half-Field</Header>
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
