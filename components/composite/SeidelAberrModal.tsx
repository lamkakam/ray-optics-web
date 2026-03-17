import React, { useMemo } from "react";
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Table } from "@/components/micro/Table";
import { Tabs } from "@/components/micro/Tabs";
import type { TabItem } from "@/components/micro/Tabs";
import type { SeidelData, AberrationTypeToLabel } from "@/lib/opticalModel";
import { Paragraph } from "../micro/Paragraph";

interface SeidelAberrModalProps {
  readonly isOpen: boolean;
  readonly data: SeidelData;
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
  W220: "Field Curvature",
  W311: "Distortion",
  TCV: "Tangential Field Curvature (TCV)",
  SCV: "Sagittal Field Curvature (SCV)",
  PCV: "Petzval Curvature (PCV)",
};

export function SeidelAberrModal({ isOpen, data, onClose }: SeidelAberrModalProps) {
  const { surfaceBySurface, transverse, wavefront, curvature } = data;

  const surfaceHeaders = useMemo(
    () => ["Surface", ...surfaceBySurface.aberrTypes],
    [surfaceBySurface.aberrTypes],
  );

  const surfaceRows = useMemo(
    () =>
      surfaceBySurface.surfaceLabels.map((label, colIdx) => [
        label,
        ...surfaceBySurface.aberrTypes.map((_, rowIdx) =>
          commonValueFormatter(surfaceBySurface.data[rowIdx][colIdx]),
        ),
      ]),
    [surfaceBySurface],
  );

  const transverseRows = useMemo(
    () => Object.entries(transverse).map(([key, val]) => [ABERRATION_TYPE_TO_LABEL[key], val.toFixed(6)]),
    [transverse],
  );

  const wavefrontRows = useMemo(
    () => Object.entries(wavefront).map(([key, val]) => [ABERRATION_TYPE_TO_LABEL[key], val.toFixed(6)]),
    [wavefront],
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
        label: "Surface by Surface",
        content: (
          <div className="pt-2 overflow-x-auto">
            <Table headers={surfaceHeaders} rows={surfaceRows} />
          </div>
        ),
      },
      {
        id: "transverse",
        label: "Transverse",
        content: (
          <div className="pt-2 overflow-x-auto">
            <Table headers={["Aberration", "Value"]} rows={transverseRows} />
          </div>
        ),
      },
      {
        id: "wavefront",
        label: "Wavefront",
        content: (
          <div className="pt-2 overflow-x-auto">
            <Table headers={["Aberration", "Value"]} rows={wavefrontRows} />
          </div>
        ),
      },
      {
        id: "curvature",
        label: "Field Curvature",
        content: (
          <div className="pt-2 overflow-x-auto">
            <Table headers={["Aberration", "Value", "Curvature Radius"]} rows={curvatureRows} />
          </div>
        ),
      },
    ],
    [surfaceHeaders, surfaceRows, transverseRows, wavefrontRows, curvatureRows],
  );

  return (
    <MathJaxContext>
      <Modal isOpen={isOpen} title="3rd Order Seidel Aberrations" titleId="seidel-modal-title" size="4xl">
        <Paragraph className="mb-4">
          Note: Third-order Seidel aberration approximation only captures the effect of
          higher-order aspheric surface up to the 4th order
          ({" "}<MathJax inline>{`\\(r^{4}\\)`}</MathJax>{" "} and its term {" "}<MathJax inline>{`\\(a_{4}\\)`}</MathJax>).
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
