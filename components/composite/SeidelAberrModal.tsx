import React, { useMemo } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, themeQuartz, colorSchemeLight, colorSchemeDark } from "ag-grid-community";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Tabs } from "@/components/micro/Tabs";
import type { TabItem } from "@/components/micro/Tabs";
import { useTheme } from "@/components/ThemeProvider";
import type { SeidelData } from "@/lib/opticalModel";

interface SeidelAberrModalProps {
  readonly isOpen: boolean;
  readonly data: SeidelData;
  readonly onClose: () => void;
}

function SummaryTable({ entries }: { entries: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Object.entries(entries).map(([key, value]) => (
          <tr key={key} className="border-b border-gray-200 dark:border-gray-700">
            <td className="py-1 pr-4 font-medium">{key}</td>
            <td className="py-1 font-mono">{value.toPrecision(6)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SeidelAberrModal({ isOpen, data, onClose }: SeidelAberrModalProps) {
  const { theme } = useTheme();
  const gridTheme = useMemo(
    () =>
      theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight),
    [theme],
  );

  const { surfaceBySurface, transverse, wavefront, curvature } = data;

  const rowData = useMemo(() => {
    return surfaceBySurface.index.map((aberrType, rowIdx) => {
      const row: Record<string, unknown> = { _type: aberrType };
      surfaceBySurface.columns.forEach((col, colIdx) => {
        row[col] = surfaceBySurface.data[rowIdx][colIdx];
      });
      return row;
    });
  }, [surfaceBySurface]);

  const columnDefs: ColDef[] = useMemo(() => [
    { headerName: "Aberration", field: "_type", editable: false },
    ...surfaceBySurface.columns.map((col) => ({
      headerName: col,
      field: col,
      editable: false,
    })),
  ], [surfaceBySurface.columns]);

  const tabs: TabItem[] = useMemo(() => [
    {
      id: "surfaceBySurface",
      label: "Surface by Surface",
      content: (
        <div className="pt-2">
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              domLayout="autoHeight"
            />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "transverse",
      label: "Transverse",
      content: (
        <div className="pt-2">
          <SummaryTable entries={transverse} />
        </div>
      ),
    },
    {
      id: "wavefront",
      label: "Wavefront",
      content: (
        <div className="pt-2">
          <SummaryTable entries={wavefront} />
        </div>
      ),
    },
    {
      id: "curvature",
      label: "Curvature",
      content: (
        <div className="pt-2">
          <SummaryTable entries={curvature} />
        </div>
      ),
    },
  ], [gridTheme, rowData, columnDefs, transverse, wavefront, curvature]);

  return (
    <Modal isOpen={isOpen} title="3rd Order Seidel Aberrations" titleId="seidel-modal-title" size="4xl">
      <Tabs tabs={tabs} />
      <div className="flex justify-end pt-4">
        <Button variant="primary" onClick={onClose}>Ok</Button>
      </div>
    </Modal>
  );
}
