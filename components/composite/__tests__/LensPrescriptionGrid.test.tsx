import React from "react";
import { render, screen } from "@testing-library/react";
import { LensPrescriptionGrid } from "@/components/composite/LensPrescriptionGrid";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/lib/gridTypes";

const testRows: GridRow[] = [
  { id: OBJECT_ROW_ID, kind: "object", objectDistance: 1e10 },
  {
    id: "s1",
    kind: "surface",
    label: "Default",
    curvatureRadius: 50,
    thickness: 5,
    medium: "BK7",
    manufacturer: "Schott",
    semiDiameter: 10,
  },
  {
    id: "s2",
    kind: "surface",
    label: "Stop",
    curvatureRadius: -30,
    thickness: 3,
    medium: "F2",
    manufacturer: "Schott",
    semiDiameter: 8,
    aspherical: { conicConstant: -1.0 },
  },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

describe("LensPrescriptionGrid", () => {
  const defaultProps = {
    rows: testRows,
    onRowChange: jest.fn(),
    onOpenMediumModal: jest.fn(),
    onOpenAsphericalModal: jest.fn(),
    onRowSelected: jest.fn(),
  };

  it("renders the AG Grid mock table", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders all rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("renders expected column headers", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    const headerTexts = Array.from(headers).map((h) => h.textContent);

    expect(headerTexts).toContain("Surface");
    expect(headerTexts).toContain("Radius");
    expect(headerTexts).toContain("Thickness");
    expect(headerTexts).toContain("Medium");
    expect(headerTexts).toContain("Semi-diam.");
  });

  it("has an aria-label on the wrapper", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByLabelText("Lens prescription editor")).toBeInTheDocument();
  });
});
