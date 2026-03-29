"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { SelectedGlass } from "@/lib/glassMap";
import { Table } from "@/components/micro/Table";

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
    { key: "Nd", label: <MathJax inline>{`\\(N_d\\)`}</MathJax>, value: String(refractiveIndexD) },
    { key: "Ne", label: <MathJax inline>{`\\(N_e\\)`}</MathJax>, value: String(refractiveIndexE) },
    { key: "Vd", label: <MathJax inline>{`\\(V_d\\)`}</MathJax>, value: String(abbeNumberD) },
    { key: "Ve", label: <MathJax inline>{`\\(V_e\\)`}</MathJax>, value: String(abbeNumberE) },
  ];

  if (partialDispersions.P_g_F !== undefined) {
    rows.push({ key: "P_g_F", label: <MathJax inline>{`\\(P_{g,F}\\)`}</MathJax>, value: String(partialDispersions.P_g_F) });
  }
  if (partialDispersions.P_F_d !== undefined) {
    rows.push({ key: "P_F_d", label: <MathJax inline>{`\\(P_{F,d}\\)`}</MathJax>, value: String(partialDispersions.P_F_d) });
  }
  if (partialDispersions.P_F_e !== undefined) {
    rows.push({ key: "P_F_e", label: <MathJax inline>{`\\(P_{F,e}\\)`}</MathJax>, value: String(partialDispersions.P_F_e) });
  }

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
