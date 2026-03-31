import React from "react";
import { render, screen } from "@testing-library/react";
import { GlassDetailPanel } from "@/features/glass-map/components/GlassDetailPanel";
import type { SelectedGlass } from "@/shared/lib/types/glassMap";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const selectedGlass: SelectedGlass = {
  catalogName: "Schott",
  glassName: "N-BK7",
  data: {
    refractiveIndexD: 1.5168,
    refractiveIndexE: 1.5190,
    abbeNumberD: 64.17,
    abbeNumberE: 63.96,
    partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
    dispersionCoeffKind: 'Sellmeier3T',
    dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
  },
};

describe("GlassDetailPanel", () => {
  it("renders placeholder when selectedGlass is undefined", () => {
    render(<GlassDetailPanel selectedGlass={undefined} />);
    expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
  });

  it("does not render glass name when selectedGlass is undefined", () => {
    render(<GlassDetailPanel selectedGlass={undefined} />);
    expect(screen.queryByText("N-BK7")).not.toBeInTheDocument();
  });

  it("renders catalog name when glass is selected", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("Schott")).toBeInTheDocument();
  });

  it("renders glass name when glass is selected", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("N-BK7")).toBeInTheDocument();
  });

  it("renders Nd value to 5 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("1.51680")).toBeInTheDocument();
  });

  it("renders Ne value to 5 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("1.51900")).toBeInTheDocument();
  });

  it("renders Vd value to 2 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("64.17")).toBeInTheDocument();
  });

  it("renders Ve value to 2 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("63.96")).toBeInTheDocument();
  });

  it("renders P_g_F value to 4 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("0.5349")).toBeInTheDocument();
  });

  it("renders P_F_d value to 4 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("0.4100")).toBeInTheDocument();
  });

  it("renders P_F_e value to 4 decimal places", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("0.4000")).toBeInTheDocument();
  });

  it("renders label cells with data-testid for all properties", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    for (const key of ["Nd", "Ne", "Vd", "Ve", "P_g_F", "P_F_d", "P_F_e"]) {
      expect(screen.getByTestId(`label-${key}`)).toBeInTheDocument();
    }
  });

  it("does not wrap its content in its own MathJaxContext when glass is selected", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });
});
