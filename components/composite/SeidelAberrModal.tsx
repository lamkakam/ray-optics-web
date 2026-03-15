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

const SUMMARY_COL_DEFS: ColDef[] = [
  { headerName: "Aberration", field: "_key", editable: false },
  {
    headerName: "Value",
    field: "_value",
    editable: false,
    valueFormatter: ({ value }) => (value as number).toPrecision(6),
  },
];

function summaryRowData(entries: Record<string, number>) {
  return Object.entries(entries).map(([key, value]) => ({ _key: key, _value: value }));
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

  const surfaceRowData = useMemo(() => {
    return surfaceBySurface.columns.map((surface, colIdx) => {
      const row: Record<string, unknown> = { _surface: surface };
      surfaceBySurface.index.forEach((aberrType, rowIdx) => {
        row[aberrType] = surfaceBySurface.data[rowIdx][colIdx];
      });
      return row;
    });
  }, [surfaceBySurface]);

  const surfaceColumnDefs: ColDef[] = useMemo(() => [
    { headerName: "Surface", field: "_surface", editable: false },
    ...surfaceBySurface.index.map((aberrType) => ({
      headerName: aberrType,
      field: aberrType,
      editable: false,
    })),
  ], [surfaceBySurface.index]);

  const transverseRowData = useMemo(() => summaryRowData(transverse), [transverse]);
  const wavefrontRowData = useMemo(() => summaryRowData(wavefront), [wavefront]);
  const curvatureRowData = useMemo(() => summaryRowData(curvature), [curvature]);

  const tabs: TabItem[] = useMemo(() => [
    {
      id: "surfaceBySurface",
      label: "Surface by Surface",
      content: (
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={surfaceRowData}
              columnDefs={surfaceColumnDefs}
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
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={transverseRowData}
              columnDefs={SUMMARY_COL_DEFS}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
            />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "wavefront",
      label: "Wavefront",
      content: (
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={wavefrontRowData}
              columnDefs={SUMMARY_COL_DEFS}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
            />
          </AgGridProvider>
        </div>
      ),
    },
    {
      id: "curvature",
      label: "Curvature",
      content: (
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={curvatureRowData}
              columnDefs={SUMMARY_COL_DEFS}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
            />
          </AgGridProvider>
        </div>
      ),
    },
  ], [gridTheme, surfaceRowData, surfaceColumnDefs, transverseRowData, wavefrontRowData, curvatureRowData]);

  return (
    <Modal isOpen={isOpen} title="3rd Order Seidel Aberrations" titleId="seidel-modal-title" size="4xl">
      <Tabs tabs={tabs} panelClassName="h-72 overflow-y-auto" />
      <div className="flex justify-end pt-4">
        <Button variant="primary" onClick={onClose}>Ok</Button>
      </div>
    </Modal>
  );
}
