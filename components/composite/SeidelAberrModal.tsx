import React, { useMemo } from "react";
import { AgGridReact, AgGridProvider, type CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Tabs } from "@/components/micro/Tabs";
import type { TabItem } from "@/components/micro/Tabs";
import { useAgGridTheme } from "@/hooks/useAgGridTheme";
import type { SeidelData, AberrationTypeToLabel } from "@/lib/opticalModel";
import { Paragraph } from "../micro/Paragraph";

interface SeidelAberrModalProps {
  readonly isOpen: boolean;
  readonly data: SeidelData;
  readonly onClose: () => void;
}

const commonValueFormatter = (value: number) => value.toPrecision(6);

const ABERRATION_TYPE_TO_LABEL: AberrationTypeToLabel = {
  TSA: "Transverse Spherical Aberration (TSA)",
  TCO: "Transverse Coma (TCO)",
  TAS: "Tangential Astigmatism (TAS)",
  SAS: "Sagittal Astigmatism (SAS)",
  PTB: "Petzval Blur (PTB)",
  DST: "Distortion (DST)",
  W040: "Spherical Aberration",
  W131: "Coma",
  W222: "Astigmatism",
  W220: "Field Curvature",
  W311: "Distortion",
  TCV: "Tangential Field Curvature (TCV)",
  SCV: "Sagittal Field Curvature (SCV)",
  PCV: "Petzval Curvature (PCV)",
};

const CommonCellRendererForSummaryTable = (params: CustomCellRendererProps<{ _key: string; _value: number }, string>): React.ReactNode => {
  const key = params.data?._key;
  if (key === undefined || key === null) {
    return "";
  }

  return ABERRATION_TYPE_TO_LABEL[key];
};

const SUMMARY_COL_DEFS: ColDef<{ _key: string; _value: number }, string | number>[] = [
  {
    headerName: "Aberration",
    field: "_key",
    editable: false,
    cellRenderer: CommonCellRendererForSummaryTable,
    flex: 1,
  },
  {
    headerName: "Value",
    field: "_value",
    editable: false,
    valueFormatter: ({ value }) => commonValueFormatter(value as number),
  },
];

const CURVATURE_COL_DEFS: ColDef<{ _key: string; _value: number }, string | number>[] = [
  {
    headerName: "Aberration",
    field: "_key",
    editable: false,
    cellRenderer: CommonCellRendererForSummaryTable,
    flex: 1,
  },
  {
    headerName: "Value",
    field: "_value",
    editable: false,
    valueFormatter: ({ value }) => commonValueFormatter(value as number),
  },
  {
    headerName: "Curvature Radius",
    field: "_value",
    editable: false,
    valueFormatter: ({ value }) => {
      const v = value as number;
      return v === 0 ? "Infinite" : (1 / v).toPrecision(6);
    },
  },
];

function summaryRowData(entries: Record<string, number>) {
  return Object.entries(entries).map(([key, value]) => ({ _key: key, _value: value }));
}

export function SeidelAberrModal({ isOpen, data, onClose }: SeidelAberrModalProps) {
  const gridTheme = useAgGridTheme();

  const { surfaceBySurface, transverse, wavefront, curvature } = data;

  const surfaceRowData = useMemo(() => {
    return surfaceBySurface.surfaceLabels.map((surface, colIdx) => {
      const row: Record<string, string | number> = { _surface: surface };
      surfaceBySurface.aberrTypes.forEach((aberrType, rowIdx) => {
        row[aberrType] = commonValueFormatter(surfaceBySurface.data[rowIdx][colIdx]);
      });
      return row;
    });
  }, [surfaceBySurface]);

  const surfaceColumnDefs: ColDef[] = useMemo(() => [
    { headerName: "Surface", field: "_surface", editable: false },
    ...surfaceBySurface.aberrTypes.map((aberrType) => ({
      headerName: aberrType,
      field: aberrType,
      editable: false,
    })),
  ], [surfaceBySurface.aberrTypes]);

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
      label: "Field Curvature",
      content: (
        <div className="pt-2" style={{ width: "100%", height: "100%" }}>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={curvatureRowData}
              columnDefs={CURVATURE_COL_DEFS}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
            />
          </AgGridProvider>
        </div>
      ),
    },
  ], [gridTheme, surfaceRowData, surfaceColumnDefs, transverseRowData, wavefrontRowData, curvatureRowData]);

  return (
    <MathJaxContext>
      <Modal isOpen={isOpen} title="3rd Order Seidel Aberrations" titleId="seidel-modal-title" size="4xl">
        <Paragraph className="mb-4">
          Note: Third-order Seidel aberration approximation only captures the effect of
          higher-order aspheric surface up to the 4th order
          ({" "}<MathJax inline>{`\\(r_{4}\\)`}</MathJax>{" "} and its term {" "}<MathJax inline>{`\\(a_{4}\\)`}</MathJax>).
          The effect of higher-order polynomial terms
          such as {" "}<MathJax inline>{`\\(a_{6}, a_{8}\\)`}</MathJax>{" "} or higher
          is outside the scope of this approximation.
        </Paragraph>
        <Tabs tabs={tabs} panelClassName="h-72 overflow-y-auto" />
        <div className="flex justify-end pt-4">
          <Button variant="primary" onClick={onClose}>Ok</Button>
        </div>
      </Modal>
    </MathJaxContext>
  );
}
