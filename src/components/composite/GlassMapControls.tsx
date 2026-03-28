"use client";

import React from "react";
import { CATALOG_NAMES, CATALOG_COLOR_MAP } from "@/lib/glassMap";
import type { AbbeLine, CatalogName, GlassMapPlotType, PartialDispersionType } from "@/lib/glassMap";

interface GlassMapControlsProps {
  readonly plotType: GlassMapPlotType;
  readonly abbeLine: AbbeLine;
  readonly partialDispersionType: PartialDispersionType;
  readonly enabledCatalogs: Record<CatalogName, boolean>;
  readonly onPlotTypeChange: (t: GlassMapPlotType) => void;
  readonly onAbbeLineChange: (l: AbbeLine) => void;
  readonly onPartialDispersionTypeChange: (t: PartialDispersionType) => void;
  readonly onToggleCatalog: (name: CatalogName) => void;
}

export function GlassMapControls({
  plotType,
  abbeLine,
  partialDispersionType,
  enabledCatalogs,
  onPlotTypeChange,
  onAbbeLineChange,
  onPartialDispersionTypeChange,
  onToggleCatalog,
}: GlassMapControlsProps) {
  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Plot type */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Plot Type
        </legend>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="plotType"
              value="refractiveIndex"
              checked={plotType === "refractiveIndex"}
              onChange={() => onPlotTypeChange("refractiveIndex")}
            />
            Refractive Index
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="plotType"
              value="partialDispersion"
              checked={plotType === "partialDispersion"}
              onChange={() => onPlotTypeChange("partialDispersion")}
            />
            Partial Dispersion
          </label>
        </div>
      </fieldset>

      {/* Abbe line */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Abbe Line
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="abbeLine"
              value="d"
              checked={abbeLine === "d"}
              onChange={() => onAbbeLineChange("d")}
            />
            d
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="abbeLine"
              value="e"
              checked={abbeLine === "e"}
              onChange={() => onAbbeLineChange("e")}
            />
            e
          </label>
        </div>
      </fieldset>

      {/* Partial dispersion type (only for partialDispersion plot) */}
      {plotType === "partialDispersion" && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Partial Dispersion
          </legend>
          <div className="flex flex-col gap-1">
            {([
              { value: "P_F_d" as PartialDispersionType, label: "P_F,d" },
              { value: "P_F_e" as PartialDispersionType, label: "P_F,e" },
              { value: "P_g_F" as PartialDispersionType, label: "P_g,F" },
            ] as const).map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="partialDispersionType"
                  value={value}
                  checked={partialDispersionType === value}
                  onChange={() => onPartialDispersionTypeChange(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
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
