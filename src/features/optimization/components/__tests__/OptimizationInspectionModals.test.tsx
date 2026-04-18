import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlassCatalogContext, type GlassCatalogContextValue } from "@/shared/components/providers/GlassCatalogProvider";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import { OptimizationInspectionModals } from "@/features/optimization/components/OptimizationInspectionModals";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockGlassData = {
  refractiveIndexD: 1.5,
  refractiveIndexE: 1.5,
  abbeNumberD: 50,
  abbeNumberE: 50,
  partialDispersions: {
    P_F_e: 0.5,
    P_F_d: 0.5,
    P_g_F: 0.5,
  },
  dispersionCoeffKind: "Sellmeier3T" as const,
  dispersionCoeffs: [1, 2, 3],
};

const glassCatalogValue: GlassCatalogContextValue = {
  catalogs: {
    CDGM: { "H-K9L": mockGlassData },
    Hikari: {},
    Hoya: {},
    Ohara: { "S-FPL53": mockGlassData },
    Schott: { "N-SK11": mockGlassData },
    Sumita: {},
    Special: {},
  },
  error: undefined,
  isLoaded: true,
  isLoading: false,
  preload: jest.fn(),
};

function renderInspectionModals(props: React.ComponentProps<typeof OptimizationInspectionModals>) {
  return render(
    <GlassCatalogContext.Provider value={glassCatalogValue}>
      <OptimizationInspectionModals {...props} />
    </GlassCatalogContext.Provider>,
  );
}

describe("OptimizationInspectionModals", () => {
  it("refreshes the read-only aspherical modal when a different surface row is selected", async () => {
    const user = userEvent.setup();
    const conicRow: GridRow = {
      id: "surface-1",
      kind: "surface",
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10,
      aspherical: {
        kind: "Conic",
        conicConstant: -1,
      },
    };
    const evenAsphereRow: GridRow = {
      id: "surface-2",
      kind: "surface",
      label: "Default",
      curvatureRadius: 40,
      thickness: 4,
      medium: "air",
      manufacturer: "",
      semiDiameter: 9,
      aspherical: {
        kind: "EvenAspherical",
        conicConstant: 0,
        polynomialCoefficients: [0, 2.696e-10, -2.41e-14, -3.237e-18],
      },
    };

    const { rerender } = renderInspectionModals({
      mediumModalRow: undefined,
      asphericalModalRow: conicRow,
      decenterModalRow: undefined,
      diffractionGratingModalRow: undefined,
      onCloseMediumModal: jest.fn(),
      onCloseAsphericalModal: jest.fn(),
      onCloseDecenterModal: jest.fn(),
      onCloseDiffractionGratingModal: jest.fn(),
    });

    expect(screen.getByLabelText("Type")).toHaveValue("Conic");
    expect(screen.queryByLabelText("a2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    rerender(
      <GlassCatalogContext.Provider value={glassCatalogValue}>
        <OptimizationInspectionModals
          mediumModalRow={undefined}
          asphericalModalRow={evenAsphereRow}
          decenterModalRow={undefined}
          diffractionGratingModalRow={undefined}
          onCloseMediumModal={jest.fn()}
          onCloseAsphericalModal={jest.fn()}
          onCloseDecenterModal={jest.fn()}
          onCloseDiffractionGratingModal={jest.fn()}
        />
      </GlassCatalogContext.Provider>,
    );

    expect(screen.getByLabelText("Type")).toHaveValue("EvenAspherical");
    expect(screen.getByLabelText("a2")).toBeInTheDocument();
    expect(screen.getByLabelText("a4")).toHaveValue("2.696e-10");
  });

  it("refreshes the read-only medium modal when a different row is selected", () => {
    const firstMediumRow: GridRow = {
      id: "surface-1",
      kind: "surface",
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "N-SK11",
      manufacturer: "Schott",
      semiDiameter: 10,
    };
    const secondMediumRow: GridRow = {
      id: "surface-2",
      kind: "surface",
      label: "Default",
      curvatureRadius: 40,
      thickness: 4,
      medium: "S-FPL53",
      manufacturer: "Ohara",
      semiDiameter: 9,
    };

    const { rerender } = renderInspectionModals({
      mediumModalRow: firstMediumRow,
      asphericalModalRow: undefined,
      decenterModalRow: undefined,
      diffractionGratingModalRow: undefined,
      onCloseMediumModal: jest.fn(),
      onCloseAsphericalModal: jest.fn(),
      onCloseDecenterModal: jest.fn(),
      onCloseDiffractionGratingModal: jest.fn(),
    });

    expect(screen.getByLabelText("Manufacturer")).toHaveValue("Schott");
    expect(screen.getByLabelText("Glass")).toHaveValue("N-SK11");

    rerender(
      <GlassCatalogContext.Provider value={glassCatalogValue}>
        <OptimizationInspectionModals
          mediumModalRow={secondMediumRow}
          asphericalModalRow={undefined}
          decenterModalRow={undefined}
          diffractionGratingModalRow={undefined}
          onCloseMediumModal={jest.fn()}
          onCloseAsphericalModal={jest.fn()}
          onCloseDecenterModal={jest.fn()}
          onCloseDiffractionGratingModal={jest.fn()}
        />
      </GlassCatalogContext.Provider>,
    );

    expect(screen.getByLabelText("Manufacturer")).toHaveValue("Ohara");
    expect(screen.getByLabelText("Glass")).toHaveValue("S-FPL53");
  });
});
