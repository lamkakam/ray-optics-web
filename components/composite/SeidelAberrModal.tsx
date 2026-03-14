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
    return surfaceBySurface.columns.map((surface, colIdx) => {
      const row: Record<string, unknown> = { _surface: surface };
      surfaceBySurface.index.forEach((aberrType, rowIdx) => {
        row[aberrType] = surfaceBySurface.data[rowIdx][colIdx];
      });
      return row;
    });
  }, [surfaceBySurface]);

  const columnDefs: ColDef[] = useMemo(() => [
    { headerName: "Surface", field: "_surface", editable: false },
    ...surfaceBySurface.index.map((aberrType) => ({
      headerName: aberrType,
      field: aberrType,
      editable: false,
    })),
  ], [surfaceBySurface.index]);

  const tabs: TabItem[] = useMemo(() => [
    {
      id: "surfaceBySurface",
      label: "Surface by Surface",
      content: (
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
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
      <Tabs tabs={tabs} panelClassName="h-72 overflow-y-auto" />
      <div className="flex justify-end pt-4">
        <Button variant="primary" onClick={onClose}>Ok</Button>
      </div>
    </Modal>
  );
}
