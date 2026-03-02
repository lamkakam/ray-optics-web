import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import type { Surfaces } from "@/lib/opticalModel";

const testSurfaces: Surfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      label: "Stop",
      curvatureRadius: -30,
      thickness: 3,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 8,
    },
  ],
};

describe("LensPrescriptionContainer", () => {
  const defaultProps = {
    initialSurfaces: testSurfaces,
    onSurfacesChange: jest.fn(),
    onFetchGlassList: jest.fn().mockResolvedValue([]),
  };

  it("renders the grid", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders Add Row button", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByText("Add Row")).toBeInTheDocument();
  });

  it("renders Delete Row button", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByText("Delete Row")).toBeInTheDocument();
  });

  it("renders Export JSON button", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
  });

  it("Add Row button is disabled when no row is selected", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByText("Add Row")).toBeDisabled();
  });

  it("Delete Row button is disabled when no row is selected", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByText("Delete Row")).toBeDisabled();
  });

  it("renders rows from initialSurfaces (object + 2 surfaces + image)", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });
});
