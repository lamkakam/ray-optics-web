import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import type { RadiusMode } from "@/features/optimization/stores/optimizationStore";
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

describe("OptimizationLensPrescriptionGrid", () => {
  it("renders the expected headers and forwards modal open actions", async () => {
    const user = userEvent.setup();
    const onOpenRadiusModal = jest.fn();
    const onOpenThicknessModal = jest.fn();
    const onOpenMediumModal = jest.fn();
    const onOpenAsphericalModal = jest.fn();
    const onOpenDecenterModal = jest.fn();
    const onOpenDiffractionGratingModal = jest.fn();
    const constantModes: RadiusMode[] = [{ surfaceIndex: 1, mode: "constant" }];

    render(
      <OptimizationLensPrescriptionGrid
        rows={[{ id: "optimization-row-1", radiusSurfaceIndex: 1, thicknessSurfaceIndex: 1, row: surfaceRow }]}
        radiusModes={constantModes}
        thicknessModes={constantModes}
        onOpenRadiusModal={onOpenRadiusModal}
        onOpenThicknessModal={onOpenThicknessModal}
        onOpenMediumModal={onOpenMediumModal}
        onOpenAsphericalModal={onOpenAsphericalModal}
        onOpenDecenterModal={onOpenDecenterModal}
        onOpenDiffractionGratingModal={onOpenDiffractionGratingModal}
      />,
    );

    expect(screen.getByTestId("optimization-lens-prescription-grid")).not.toHaveClass("overflow-y-auto");

    expect(screen.getAllByText("Var.")).toHaveLength(2);
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

    await user.click(screen.getByRole("button", { name: "Edit decenter and tilt" }));
    expect(onOpenDecenterModal).toHaveBeenCalledWith(surfaceRow);

    await user.click(screen.getByRole("button", { name: "Edit diffraction grating" }));
    expect(onOpenDiffractionGratingModal).toHaveBeenCalledWith(surfaceRow);
  });

  it("uses view-oriented tooltip copy for optimization-only inspection cells", async () => {
    const user = userEvent.setup();
    const constantModes: RadiusMode[] = [{ surfaceIndex: 1, mode: "constant" }];

    render(
      <OptimizationLensPrescriptionGrid
        rows={[{ id: "optimization-row-1", radiusSurfaceIndex: 1, thicknessSurfaceIndex: 1, row: surfaceRow }]}
        radiusModes={constantModes}
        thicknessModes={constantModes}
        onOpenRadiusModal={jest.fn()}
        onOpenThicknessModal={jest.fn()}
        onOpenMediumModal={jest.fn()}
        onOpenAsphericalModal={jest.fn()}
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
