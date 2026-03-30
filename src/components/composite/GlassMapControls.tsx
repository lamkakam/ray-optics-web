"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import { CATALOG_NAMES, CATALOG_COLOR_MAP } from "@/lib/glassMap";
import type { AbbeNumCenterLine, CatalogName, GlassMapPlotType, PartialDispersionType } from "@/lib/glassMap";
import { RadioInput } from "@/components/micro/RadioInput";
import type { RadioOption } from "@/components/micro/RadioInput";

interface GlassMapControlsProps {
  readonly plotType: GlassMapPlotType;
  readonly abbeNumCenterLine: AbbeNumCenterLine;
  readonly partialDispersionType: PartialDispersionType;
  readonly enabledCatalogs: Record<CatalogName, boolean>;
  readonly onPlotTypeChange: (t: GlassMapPlotType) => void;
  readonly onAbbeNumCenterLineChange: (l: AbbeNumCenterLine) => void;
  readonly onPartialDispersionTypeChange: (t: PartialDispersionType) => void;
  readonly onToggleCatalog: (name: CatalogName) => void;
}

const PLOT_TYPE_OPTIONS: ReadonlyArray<RadioOption<GlassMapPlotType>> = [
  { value: "refractiveIndex", label: "Refractive Index" },
  { value: "partialDispersion", label: "Partial Dispersion" },
];

const ABBE_LINE_OPTIONS: ReadonlyArray<RadioOption<AbbeNumCenterLine>> = [
  { value: "d", label: "d", labelNode: <MathJax inline>{`\\(d\\)`}</MathJax> },
  { value: "e", label: "e", labelNode: <MathJax inline>{`\\(e\\)`}</MathJax> },
];

const PARTIAL_DISPERSION_OPTIONS: ReadonlyArray<RadioOption<PartialDispersionType>> = [
  { value: "P_F_d", label: "P_F,d", labelNode: <MathJax inline>{`\\(P_{F,d}\\)`}</MathJax> },
  { value: "P_F_e", label: "P_F,e", labelNode: <MathJax inline>{`\\(P_{F,e}\\)`}</MathJax> },
  { value: "P_g_F", label: "P_g,F", labelNode: <MathJax inline>{`\\(P_{g,F}\\)`}</MathJax> },
];

export function GlassMapControls({
  plotType,
  abbeNumCenterLine,
  partialDispersionType,
  enabledCatalogs,
  onPlotTypeChange,
  onAbbeNumCenterLineChange,
  onPartialDispersionTypeChange,
  onToggleCatalog,
}: GlassMapControlsProps) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <RadioInput
        name="plotType"
        label="Plot Type"
        options={PLOT_TYPE_OPTIONS}
        value={plotType}
        onChange={onPlotTypeChange}
      />

      <RadioInput
        name="abbeLine"
        label="Centre Wavelength"
        options={ABBE_LINE_OPTIONS}
        value={abbeNumCenterLine}
        onChange={onAbbeNumCenterLineChange}
      />

      {plotType === "partialDispersion" && (
        <RadioInput
          name="partialDispersionType"
          label="Partial Dispersion"
          options={PARTIAL_DISPERSION_OPTIONS}
          value={partialDispersionType}
          onChange={onPartialDispersionTypeChange}
        />
      )}

      {/* Catalog filter */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Catalogs
        </legend>
        <div className="flex flex-col gap-1">
          {CATALOG_NAMES.map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={enabledCatalogs[name]}
                onChange={() => onToggleCatalog(name)}
                aria-label={name}
              />
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: CATALOG_COLOR_MAP[name] }}
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
