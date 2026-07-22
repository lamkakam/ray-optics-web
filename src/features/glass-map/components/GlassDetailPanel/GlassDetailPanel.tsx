"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { SelectedGlass } from "@/features/glass-map/types/glassMap";
import { Table } from "@/shared/components/primitives/Table";

interface GlassDetailPanelProps {
  /** Glass to display; `undefined` shows placeholder */
  readonly selectedGlass: SelectedGlass | undefined;
}

type Row = { key: string; label: React.ReactNode; value: string };

/**
 * Displays details for the currently selected glass point. Shows a placeholder when no glass is selected.
 *
 * @remarks
 * ## Behavior
 * - When `selectedGlass` is `undefined`: renders "Select a glass point on the chart to see details."
 * - When `selectedGlass` is set: renders catalog name, glass name, and a property table with:
 * - N_d, N_e, V_d, V_e
 * - P_{g,F}
 * - P_{F,d}
 * - P_{F,e}
 * - Numeric formatting: refractive indices (N_d, N_e) to **5 decimal places**, Abbe numbers (V_d, V_e) to **2 decimal places**, partial dispersions to **4 decimal places**.
 * - All property labels are rendered via `MathJax inline` for proper subscript notation (e.g. `\(N_d\)`, `\(P_{g,F}\)`).
 * - **The component does not own a `MathJaxContext`** — the context is provided by the parent (`GlassMapView`).
 * - Each label cell contains a `<span data-testid="label-{key}">` (e.g. `label-Nd`, `label-P_gF`) for testing.
 * - Property table is rendered using the `Table` micro-component (`headers={[]}`, rows are `[labelSpan, value]` pairs).
 */
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

  const rows: Row[] = [
    { key: "Nd", label: <MathJax inline>{`\\(n_d\\)`}</MathJax>, value: refractiveIndexD.toFixed(5) },
    { key: "Ne", label: <MathJax inline>{`\\(n_e\\)`}</MathJax>, value: refractiveIndexE.toFixed(5) },
    { key: "Vd", label: <MathJax inline>{`\\(V_d\\)`}</MathJax>, value: abbeNumberD.toFixed(2) },
    { key: "Ve", label: <MathJax inline>{`\\(V_e\\)`}</MathJax>, value: abbeNumberE.toFixed(2) },
    { key: "P_gF", label: <MathJax inline>{`\\(P_{g,F}\\)`}</MathJax>, value: partialDispersions.P_gF.toFixed(4) },
    { key: "P_Fd", label: <MathJax inline>{`\\(P_{F,d}\\)`}</MathJax>, value: partialDispersions.P_Fd.toFixed(4) },
    { key: "P_fe", label: <MathJax inline>{`\\(P_{F,e}\\)`}</MathJax>, value: partialDispersions.P_fe.toFixed(4) },
  ];

  const tableRows = rows.map(({ key, label, value }) => [
    <span key="label" data-testid={`label-${key}`}>{label}</span>,
    value,
  ] as const);

  return (
    <div className="p-4">
      <div className="mb-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {catalogName}
        </span>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{glassName}</h3>
      </div>
      <Table headers={[]} rows={tableRows} />
    </div>
  );
}
