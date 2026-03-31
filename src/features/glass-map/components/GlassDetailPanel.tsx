"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { SelectedGlass } from "@/shared/lib/types/glassMap";
import { Table } from "@/shared/components/primitives/Table";

interface GlassDetailPanelProps {
  readonly selectedGlass: SelectedGlass | undefined;
}

type Row = { key: string; label: React.ReactNode; value: string };

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
    { key: "P_g_F", label: <MathJax inline>{`\\(P_{g,F}\\)`}</MathJax>, value: partialDispersions.P_g_F.toFixed(4) },
    { key: "P_F_d", label: <MathJax inline>{`\\(P_{F,d}\\)`}</MathJax>, value: partialDispersions.P_F_d.toFixed(4) },
    { key: "P_F_e", label: <MathJax inline>{`\\(P_{F,e}\\)`}</MathJax>, value: partialDispersions.P_F_e.toFixed(4) },
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
