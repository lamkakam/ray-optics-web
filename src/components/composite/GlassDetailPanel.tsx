"use client";

import React from "react";
import type { SelectedGlass } from "@/lib/glassMap";

interface GlassDetailPanelProps {
  readonly selectedGlass: SelectedGlass | undefined;
}

export function GlassDetailPanel({ selectedGlass }: GlassDetailPanelProps) {
  if (!selectedGlass) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        Select a glass point on the chart to see details.
      </div>
    );
  }

  const { catalogName, glassName, data } = selectedGlass;
  const { refractiveIndexD, refractiveIndexE, abbeNumberD, abbeNumberE, partialDispersions } = data;

  const rows: { label: string; value: string }[] = [
    { label: "Nd", value: String(refractiveIndexD) },
    { label: "Ne", value: String(refractiveIndexE) },
    { label: "Vd", value: String(abbeNumberD) },
    { label: "Ve", value: String(abbeNumberE) },
  ];

  if (partialDispersions.P_g_F !== undefined) {
    rows.push({ label: "P_g,F", value: String(partialDispersions.P_g_F) });
  }
  if (partialDispersions.P_F_d !== undefined) {
    rows.push({ label: "P_F,d", value: String(partialDispersions.P_F_d) });
  }
  if (partialDispersions.P_F_e !== undefined) {
    rows.push({ label: "P_F,e", value: String(partialDispersions.P_F_e) });
  }

  return (
    <div className="p-4">
      <div className="mb-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {catalogName}
        </span>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{glassName}</h3>
      </div>
      <table className="text-sm w-full">
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1 pr-4 text-gray-500 dark:text-gray-400 font-medium">{label}</td>
              <td className="py-1 text-gray-900 dark:text-white">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
