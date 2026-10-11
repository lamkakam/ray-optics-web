import { useMemo } from "react";
import { MathJax } from "better-react-mathjax";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Table } from "@/shared/components/primitives/Table";
import { Tabs } from "@/shared/components/primitives/Tabs";
import type { TabItem } from "@/shared/components/primitives/Tabs";
import type {
  SeidelData,
  SeidelSurfaceBySurfaceData,
  AberrationTypeToLabel,
} from "@/features/lens-editor/types/seidelData";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface SeidelAberrModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Seidel aberration data from the Pyodide worker (`get_3rd_order_seidel_data`) */
  readonly data: SeidelData;
  /** Called when the OK button is clicked */
  readonly onClose: () => void;
}

const commonValueFormatter = (value: number) => value.toFixed(6);

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
  W220P: "Petzval Curvature",
  W220: "Field Curvature",
  W311: "Distortion",
  W020: "Primary Axial Chromatic Aberr.",
  W111: "Primary Lateral Chromatic Aberr.",
  TCV: "Tangential Field Curvature (TCV)",
  SCV: "Sagittal Field Curvature (SCV)",
  PCV: "Petzval Curvature (PCV)",
};

/** Scroll container for a tab's table; it fills the fixed-height panel so both scrollbars stay inside the visible panel. */
const TAB_CONTENT_CLASS_NAME = "h-full overflow-auto pt-2";

/** Builds surface-by-surface table headers and rows, one row per surface label with one column per aberration type. */
function buildSurfaceBySurfaceTable(
  { aberrTypes, surfaceLabels, data }: SeidelSurfaceBySurfaceData,
  headerLabel: (aberrType: string) => string = (aberrType) => aberrType,
) {
  return {
    headers: ["Surface", ...aberrTypes.map(headerLabel)],
    rows: surfaceLabels.map((label, colIdx) => [
      label,
      ...aberrTypes.map((_, rowIdx) =>
        commonValueFormatter(data[rowIdx][colIdx]),
      ),
    ]),
  };
}

/**
 * Modal that displays third-order Seidel and primary chromatic aberration data in a four-tab layout: Seidel (surface by surface), Wavefront (surface by surface), Transverse, and Field Curvature. Uses MathJax for a disclaimer about the approximation's scope.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Table data for all four tabs is derived with `useMemo` to avoid recomputing on unrelated renders.
 * - Both surface-by-surface tabs show one row per surface label (aspheric contributions already merged into their surface) plus `sum`.
 * - Seidel (surface by surface) columns follow `surfaceBySurface.aberrTypes`, so the primary chromatic coefficients `C-I` and `C-II` appear after `S-I`..`S-V`.
 * - Wavefront (surface by surface) columns follow `wavefront.aberrTypes`, labelled via `ABERRATION_TYPE_TO_LABEL`: Spherical Aberration, Coma, Astigmatism, Petzval Curvature (`W220P`), Field Curvature (`W220`), Distortion, then the primary chromatic terms `W020` ("Primary Axial Chromatic Aberr.") and `W111` ("Primary Lateral Chromatic Aberr.").
 * - A note explains that the chromatic terms use the first and last wavelengths and need at least 3 wavelengths.
 * - Aberration type keys (e.g. `"TSA"`, `"W040"`) are mapped to human-readable labels via `ABERRATION_TYPE_TO_LABEL`.
 * - Field Curvature tab includes a Curvature Radius column (reciprocal of value; `"Infinite"` when value is 0).
 * - Each tab's table sits in a scroll container that fills the fixed-height tab panel, so the horizontal scrollbar of a wide table stays visible at the bottom of the panel.
 * - Uses `<MathJax inline>` for LaTeX rendering; `MathJaxContext` is provided by the ancestor (`page.tsx`).
 *
 *
 *
 * ## Modal Footer
 *
 * - The Ok action is passed to `Modal.footer` so it remains fixed while Seidel aberration content scrolls.
 */
export function SeidelAberrModal({
  isOpen,
  data,
  onClose,
}: SeidelAberrModalProps) {
  const { surfaceBySurface, transverse, wavefront, curvature } = data;

  const seidelTable = useMemo(
    () => buildSurfaceBySurfaceTable(surfaceBySurface),
    [surfaceBySurface],
  );

  const wavefrontTable = useMemo(
    () =>
      buildSurfaceBySurfaceTable(
        wavefront,
        (aberrType) => ABERRATION_TYPE_TO_LABEL[aberrType] ?? aberrType,
      ),
    [wavefront],
  );

  const transverseRows = useMemo(
    () =>
      Object.entries(transverse).map(([key, val]) => [
        ABERRATION_TYPE_TO_LABEL[key],
        val.toFixed(6),
      ]),
    [transverse],
  );

  const curvatureRows = useMemo(
    () =>
      Object.entries(curvature).map(([key, val]) => [
        ABERRATION_TYPE_TO_LABEL[key],
        val.toFixed(6),
        val === 0 ? "Infinite" : (1 / val).toFixed(6),
      ]),
    [curvature],
  );

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "surfaceBySurface",
        label: "Seidel (surface by surface)",
        content: (
          <div className={TAB_CONTENT_CLASS_NAME}>
            <Table headers={seidelTable.headers} rows={seidelTable.rows} />
          </div>
        ),
      },
      {
        id: "wavefront",
        label: "Wavefront (surface by surface)",
        content: (
          <div className={TAB_CONTENT_CLASS_NAME}>
            <Table
              headers={wavefrontTable.headers}
              rows={wavefrontTable.rows}
            />
          </div>
        ),
      },
      {
        id: "transverse",
        label: "Transverse",
        content: (
          <div className={TAB_CONTENT_CLASS_NAME}>
            <Table headers={["Aberration", "Value"]} rows={transverseRows} />
          </div>
        ),
      },
      {
        id: "curvature",
        label: "Field Curvature",
        content: (
          <div className={TAB_CONTENT_CLASS_NAME}>
            <Table
              headers={["Aberration", "Value", "Curvature Radius"]}
              rows={curvatureRows}
            />
          </div>
        ),
      },
    ],
    [seidelTable, wavefrontTable, transverseRows, curvatureRows],
  );

  return (
    <Modal
      isOpen={isOpen}
      title="3rd Order Seidel Aberrations"
      titleId="seidel-modal-title"
      size="4xl"
      footer={
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Ok
          </Button>
        </div>
      }
    >
      <Paragraph className="mb-4">
        Note: Third-order Seidel aberration approximation only captures the
        effect of higher-order aspheric surface up to the 4th order ({" "}
        <MathJax inline>{`\\(r^{4}\\)`}</MathJax> and its term{" "}
        <MathJax inline>{`\\(a_{4}\\)`}</MathJax>). The effect of higher-order
        polynomial terms such as{" "}
        <MathJax inline>{`\\(a_{6}, a_{8}\\)`}</MathJax> or higher is outside
        the scope of this approximation.
      </Paragraph>
      <Paragraph className="mb-4">
        Primary chromatic aberrations (C-I, C-II, Primary Axial Chromatic Aberr.
        and Primary Lateral Chromatic Aberr.) use the refractive index
        difference between the first and last wavelengths in the list, and are
        zero unless at least 3 wavelengths are defined.
      </Paragraph>
      <Tabs tabs={tabs} panelClassName="h-72" />
    </Modal>
  );
}
