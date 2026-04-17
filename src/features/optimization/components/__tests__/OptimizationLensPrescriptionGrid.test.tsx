import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/shared/lib/types/gridTypes";
import type { RadiusMode, AsphereOptimizationState } from "@/features/optimization/stores/optimizationStore";
import { OptimizationLensPrescriptionGrid } from "@/features/optimization/components/OptimizationLensPrescriptionGrid";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

const surfaceRow: GridRow = {
  id: "surface-1",
  kind: "surface",
  label: "Default",
  curvatureRadius: 50,
  thickness: 5,
  medium: "BK7",
  manufacturer: "Schott",
  semiDiameter: 10,
};

const objectRow: GridRow = {
  id: OBJECT_ROW_ID,
  kind: "object",
  objectDistance: 1e10,
  medium: "air",
  manufacturer: "",
};

const imageRow: GridRow = {
  id: IMAGE_ROW_ID,
  kind: "image",
  curvatureRadius: 0,
};

describe("OptimizationLensPrescriptionGrid", () => {
  it("renders the expected headers and forwards modal open actions", async () => {
    const user = userEvent.setup();
    const onOpenRadiusModal = jest.fn();
    const onOpenThicknessModal = jest.fn();
    const onOpenMediumModal = jest.fn();
    const onOpenAsphericalModal = jest.fn();
    const onOpenAsphereVarModalMock = jest.fn();
    const onOpenDecenterModal = jest.fn();
    const onOpenDiffractionGratingModal = jest.fn();
    const constantModes: RadiusMode[] = [{ surfaceIndex: 1, mode: "constant" }];
    const asphereStates: AsphereOptimizationState[] = [
      {
        surfaceIndex: 1,
        type: undefined,
        lockedType: false,
        conic: { mode: "constant" },
        toricSweep: { mode: "constant" },
        coefficients: Array.from({ length: 10 }, () => ({ mode: "constant" as const })),
      },
    ];

    render(
      <OptimizationLensPrescriptionGrid
        rows={[{ id: "optimization-row-1", radiusSurfaceIndex: 1, thicknessSurfaceIndex: 1, row: surfaceRow }]}
        radiusModes={constantModes}
        thicknessModes={constantModes}
        asphereStates={asphereStates}
        onOpenRadiusModal={onOpenRadiusModal}
        onOpenThicknessModal={onOpenThicknessModal}
        onOpenMediumModal={onOpenMediumModal}
        onOpenAsphericalModal={onOpenAsphericalModal}
        onOpenAsphereVarModal={onOpenAsphereVarModalMock}
        onOpenDecenterModal={onOpenDecenterModal}
        onOpenDiffractionGratingModal={onOpenDiffractionGratingModal}
      />,
    );

    expect(screen.getByTestId("optimization-lens-prescription-grid")).not.toHaveClass("overflow-y-auto");

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Index",
      "Surface",
      "Radius of Curvature",
      "Var.",
      "Thickness",
      "Var.",
      "Medium",
      "Semi-diam.",
      "Asph.",
      "Var.",
      "Tilt & Decenter",
      "Diffraction Grating",
    ]);

    expect(screen.getAllByText("Var.")).toHaveLength(3);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Semi-diam.")).toBeInTheDocument();
    expect(screen.getByText("Asph.")).toBeInTheDocument();
    expect(screen.getByText("Tilt & Decenter")).toBeInTheDocument();
    expect(screen.getByText("Diffraction Grating")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Radius mode for surface 1" }));
    expect(onOpenRadiusModal).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Thickness mode for surface 1" }));
    expect(onOpenThicknessModal).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Edit medium" }));
    expect(onOpenMediumModal).toHaveBeenCalledWith(surfaceRow);

    await user.click(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    expect(onOpenAsphericalModal).toHaveBeenCalledWith(surfaceRow);

    await user.click(screen.getByRole("button", { name: "Asphere mode for surface 1" }));
    expect(onOpenAsphereVarModalMock).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Edit decenter and tilt" }));
    expect(onOpenDecenterModal).toHaveBeenCalledWith(surfaceRow);

    await user.click(screen.getByRole("button", { name: "Edit diffraction grating" }));
    expect(onOpenDiffractionGratingModal).toHaveBeenCalledWith(surfaceRow);
  });

  it("shows surface indices only for real surface rows", () => {
    const radiusModes: RadiusMode[] = [
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
    ];
    const thicknessModes: RadiusMode[] = [{ surfaceIndex: 1, mode: "constant" }];
    const asphereStates: AsphereOptimizationState[] = [
      {
        surfaceIndex: 1,
        type: undefined,
        lockedType: false,
        conic: { mode: "constant" },
        toricSweep: { mode: "constant" },
        coefficients: Array.from({ length: 10 }, () => ({ mode: "constant" as const })),
      },
    ];

    render(
      <OptimizationLensPrescriptionGrid
        rows={[
          { id: "optimization-row-0", radiusSurfaceIndex: undefined, thicknessSurfaceIndex: undefined, row: objectRow },
          { id: "optimization-row-1", radiusSurfaceIndex: 1, thicknessSurfaceIndex: 1, row: surfaceRow },
          { id: "optimization-row-2", radiusSurfaceIndex: 2, thicknessSurfaceIndex: undefined, row: imageRow },
        ]}
        radiusModes={radiusModes}
        thicknessModes={thicknessModes}
        asphereStates={asphereStates}
        onOpenRadiusModal={jest.fn()}
        onOpenThicknessModal={jest.fn()}
        onOpenMediumModal={jest.fn()}
        onOpenAsphericalModal={jest.fn()}
        onOpenAsphereVarModal={jest.fn()}
        onOpenDecenterModal={jest.fn()}
        onOpenDiffractionGratingModal={jest.fn()}
      />,
    );

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(Array.from(rows[0].querySelectorAll("td"), (cell) => cell.textContent)).toEqual([
      "",
      "Object",
      "",
      "",
      "10000000000",
      "",
      "air",
      "",
      "",
      "",
      "",
      "",
    ]);
    expect(Array.from(rows[1].querySelectorAll("td"), (cell) => cell.textContent)).toEqual([
      "1",
      "Default",
      "50",
      "Set",
      "5",
      "Set",
      "BK7",
      "10",
      "—",
      "Set",
      "—",
      "—",
    ]);
    expect(Array.from(rows[2].querySelectorAll("td"), (cell) => cell.textContent)).toEqual([
      "",
      "Image",
      "0",
      "Set",
      "",
      "",
      "",
      "",
      "",
      "",
      "—",
      "",
    ]);
  });

  it("uses view-oriented tooltip copy for optimization-only inspection cells", async () => {
    const user = userEvent.setup();
    const constantModes: RadiusMode[] = [{ surfaceIndex: 1, mode: "constant" }];
    const asphereStates: AsphereOptimizationState[] = [
      {
        surfaceIndex: 1,
        type: undefined,
        lockedType: false,
        conic: { mode: "constant" },
        toricSweep: { mode: "constant" },
        coefficients: Array.from({ length: 10 }, () => ({ mode: "constant" as const })),
      },
    ];

    render(
      <OptimizationLensPrescriptionGrid
        rows={[{ id: "optimization-row-1", radiusSurfaceIndex: 1, thicknessSurfaceIndex: 1, row: surfaceRow }]}
        radiusModes={constantModes}
        thicknessModes={constantModes}
        asphereStates={asphereStates}
        onOpenRadiusModal={jest.fn()}
        onOpenThicknessModal={jest.fn()}
        onOpenMediumModal={jest.fn()}
        onOpenAsphericalModal={jest.fn()}
        onOpenAsphereVarModal={jest.fn()}
        onOpenDecenterModal={jest.fn()}
        onOpenDiffractionGratingModal={jest.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Edit medium" }));
    expect(screen.getByText("Click to view medium or glass")).toHaveClass("opacity-100");

    await user.unhover(screen.getByRole("button", { name: "Edit medium" }));
    await user.hover(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    expect(screen.getByText("Click to view aspherical parameters")).toHaveClass("opacity-100");

    await user.unhover(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    await user.hover(screen.getByRole("button", { name: "Edit diffraction grating" }));
    expect(screen.getByText("Click to view diffraction grating")).toHaveClass("opacity-100");
  });
});
