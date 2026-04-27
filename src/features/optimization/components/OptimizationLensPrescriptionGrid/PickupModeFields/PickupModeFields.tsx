"use client";

import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select, type SelectOption } from "@/shared/components/primitives/Select";

interface PickupExtraField {
  readonly idSuffix: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly value: string;
  readonly options?: ReadonlyArray<SelectOption>;
  readonly onChange: (value: string) => void;
}

interface PickupModeFieldsProps {
  readonly idPrefix: string;
  readonly sourceSurfaceLabel?: string;
  readonly sourceSurfaceAriaLabel: string;
  readonly sourceSurfaceValue: string;
  readonly sourceSurfaceOptions?: ReadonlyArray<SelectOption>;
  readonly onSourceSurfaceChange: (value: string) => void;
  readonly scaleLabel?: string;
  readonly scaleAriaLabel: string;
  readonly scaleValue: string;
  readonly onScaleChange: (value: string) => void;
  readonly offsetLabel?: string;
  readonly offsetAriaLabel: string;
  readonly offsetValue: string;
  readonly onOffsetChange: (value: string) => void;
  readonly extraField?: PickupExtraField;
  readonly className?: string;
  readonly scaleOffsetLayout?: "stacked" | "two-column";
}

export function PickupModeFields({
  idPrefix,
  sourceSurfaceLabel = "Source surface index",
  sourceSurfaceAriaLabel,
  sourceSurfaceValue,
  sourceSurfaceOptions,
  onSourceSurfaceChange,
  scaleLabel = "scale",
  scaleAriaLabel,
  scaleValue,
  onScaleChange,
  offsetLabel = "offset",
  offsetAriaLabel,
  offsetValue,
  onOffsetChange,
  extraField,
  className,
  scaleOffsetLayout = "stacked",
}: PickupModeFieldsProps) {
  return (
    <div className={className ?? "grid gap-4"}>
      <div>
        <Label htmlFor={`${idPrefix}-source`}>{sourceSurfaceLabel}</Label>
        {sourceSurfaceOptions === undefined ? (
          <Input
            id={`${idPrefix}-source`}
            aria-label={sourceSurfaceAriaLabel}
            value={sourceSurfaceValue}
            onChange={(event) => onSourceSurfaceChange(event.target.value)}
          />
        ) : (
          <Select
            id={`${idPrefix}-source`}
            aria-label={sourceSurfaceAriaLabel}
            value={sourceSurfaceValue}
            options={sourceSurfaceOptions}
            onChange={(event) => onSourceSurfaceChange(event.target.value)}
          />
        )}
      </div>

      {extraField ? (
        <div>
          <Label htmlFor={`${idPrefix}-${extraField.idSuffix}`}>{extraField.label}</Label>
          {extraField.options === undefined ? (
            <Input
              id={`${idPrefix}-${extraField.idSuffix}`}
              aria-label={extraField.ariaLabel}
              value={extraField.value}
              onChange={(event) => extraField.onChange(event.target.value)}
            />
          ) : (
            <Select
              id={`${idPrefix}-${extraField.idSuffix}`}
              aria-label={extraField.ariaLabel}
              value={extraField.value}
              options={extraField.options}
              onChange={(event) => extraField.onChange(event.target.value)}
            />
          )}
        </div>
      ) : null}

      <div className={scaleOffsetLayout === "two-column" ? "grid gap-3 md:grid-cols-2" : "grid gap-4"}>
        <div>
          <Label htmlFor={`${idPrefix}-scale`}>{scaleLabel}</Label>
          <Input
            id={`${idPrefix}-scale`}
            aria-label={scaleAriaLabel}
            value={scaleValue}
            onChange={(event) => onScaleChange(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-offset`}>{offsetLabel}</Label>
          <Input
            id={`${idPrefix}-offset`}
            aria-label={offsetAriaLabel}
            value={offsetValue}
            onChange={(event) => onOffsetChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
