import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import type { Surfaces } from "@/lib/opticalModel";

jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

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
  };

  it("renders the grid", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders Export JSON button with primary button styling", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    const btn = screen.getByText("Export JSON");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("rounded-lg", "bg-blue-600");
  });

  it("renders rows from initialSurfaces (object + 2 surfaces + image)", () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("adds a row when '+' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[1]); // '+' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("deletes a row when '-' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });

    await userEvent.click(deleteButtons[0]); // '-' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });
});
