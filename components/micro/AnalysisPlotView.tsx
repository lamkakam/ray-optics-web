import React from "react";
import { cx } from "@/components/ui/modalTokens";

export type PlotType = "rayFan" | "opdFan" | "spotDiagram";

interface FieldOption {
  readonly label: string;
  readonly value: number;
}

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

const PLOT_TYPE_LABELS: Record<PlotType, string> = {
  rayFan: "Ray Fan",
  opdFan: "OPD Fan",
  spotDiagram: "Spot Diagram",
};

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
  return (
    <div className={`flex ${autoHeight ? "" : "h-full "}min-h-0 flex-col gap-3`}>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="analysis-field-select" className={cx.label}>
            Field
          </label>
          <select
            id="analysis-field-select"
            aria-label="Field"
            className={cx.select}
            value={selectedFieldIndex}
            onChange={(e) => onFieldChange(Number(e.target.value))}
          >
            {fieldOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="analysis-plot-type-select" className={cx.label}>
            Plot type
          </label>
          <select
            id="analysis-plot-type-select"
            aria-label="Plot type"
            className={cx.select}
            value={selectedPlotType}
            onChange={(e) => onPlotTypeChange(e.target.value as PlotType)}
          >
            {(Object.keys(PLOT_TYPE_LABELS) as PlotType[]).map((key) => (
              <option key={key} value={key}>
                {PLOT_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={autoHeight ? "flex items-center justify-center" : "flex min-h-0 flex-1 items-center justify-center"}>
        {loading ? (
          <span className={`text-sm ${cx.placeholderTextColor}`}>
            Loading plot...
          </span>
        ) : plotImageBase64 ? (
          /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */
          <img
            src={`data:image/png;base64,${plotImageBase64}`}
            alt="Analysis plot"
            className={autoHeight ? "w-full h-auto" : "max-h-full max-w-full object-contain"}
          />
        ) : (
          <span className={`text-sm ${cx.placeholderTextColor}`}>
            No plot available
          </span>
        )}
      </div>
    </div>
  );
}
