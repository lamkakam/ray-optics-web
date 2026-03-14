import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/styleTokens";
import { Label } from "@/components/micro/Label";
import { Select, type SelectOption } from "@/components/micro/Select";
import { Paragraph } from "@/components/micro/Paragraph";

export type PlotType = "rayFan" | "opdFan" | "spotDiagram" | "surfaceBySurface3rdOrder";

type FieldOption = SelectOption & { readonly value: number };

interface AnalysisPlotViewProps {
  readonly fieldOptions: readonly FieldOption[];
  readonly selectedFieldIndex: number;
  readonly selectedPlotType: PlotType;
  readonly plotImageBase64?: string;
  readonly loading?: boolean;
  readonly onFieldChange: (fieldIndex: number) => void;
  readonly onPlotTypeChange: (plotType: PlotType) => void;
  readonly autoHeight?: boolean;
}

export interface PlotTypeConfig {
  readonly label: string;
  readonly fieldDependent: boolean;
}

export const PLOT_TYPE_CONFIG: Record<PlotType, PlotTypeConfig> = {
  rayFan:                   { label: "Ray Fan",                             fieldDependent: true  },
  opdFan:                   { label: "OPD Fan",                             fieldDependent: true  },
  spotDiagram:              { label: "Spot Diagram",                        fieldDependent: true  },
  surfaceBySurface3rdOrder: { label: "Surface by Surface 3rd Order Aberr.", fieldDependent: false },
};

const PLOT_TYPE_OPTIONS: SelectOption[] = (Object.keys(PLOT_TYPE_CONFIG) as PlotType[]).map(
  (key) => ({ value: key, label: PLOT_TYPE_CONFIG[key].label })
);

export function AnalysisPlotView({
  fieldOptions,
  selectedFieldIndex,
  selectedPlotType,
  plotImageBase64,
  loading,
  onFieldChange,
  onPlotTypeChange,
  autoHeight,
}: AnalysisPlotViewProps) {
  const fieldDisabled = !PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent;

  return (
    <div className={`flex ${autoHeight ? "" : "h-full "}min-h-0 flex-col gap-3`}>
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="analysis-field-select">
            Field
          </Label>
          <Select
            id="analysis-field-select"
            aria-label="Field"
            options={fieldOptions}
            value={selectedFieldIndex}
            disabled={fieldDisabled}
            onChange={(e) => onFieldChange(Number(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="analysis-plot-type-select">
            Plot type
          </Label>
          <Select
            id="analysis-plot-type-select"
            aria-label="Plot type"
            options={PLOT_TYPE_OPTIONS}
            value={selectedPlotType}
            onChange={(e) => onPlotTypeChange(e.target.value as PlotType)}
          />
        </div>
      </div>

      <div className={autoHeight ? "flex items-center justify-center" : "flex min-h-0 flex-1 items-center justify-center"}>
        {loading ? (
          <Paragraph variant="placeholder">
            Loading plot...
          </Paragraph>
        ) : plotImageBase64 ? (
          /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */
          <img
            src={`data:image/png;base64,${plotImageBase64}`}
            alt="Analysis plot"
            className={autoHeight ? "w-full h-auto" : "max-h-full max-w-full object-contain"}
          />
        ) : (
          <Paragraph variant="placeholder">
            No plot available
          </Paragraph>
        )}
      </div>
    </div>
  );
}
