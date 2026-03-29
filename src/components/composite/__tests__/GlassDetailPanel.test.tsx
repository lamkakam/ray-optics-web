import React from "react";
import { render, screen } from "@testing-library/react";
import { GlassDetailPanel } from "@/components/composite/GlassDetailPanel";
import type { SelectedGlass } from "@/lib/glassMap";

const selectedGlass: SelectedGlass = {
  catalogName: "Schott",
  glassName: "N-BK7",
  data: {
    refractiveIndexD: 1.5168,
    refractiveIndexE: 1.5190,
    abbeNumberD: 64.17,
    abbeNumberE: 63.96,
    dispersionCoefficients: { A0: 2.0, A1: -0.01 },
    partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
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

  it("renders Nd value", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("1.5168")).toBeInTheDocument();
  });

  it("renders Ne value", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("1.519")).toBeInTheDocument();
  });

  it("renders Vd value", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("64.17")).toBeInTheDocument();
  });

  it("renders Ve value", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("63.96")).toBeInTheDocument();
  });

  it("renders P_g_F value", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    expect(screen.getByText("0.5349")).toBeInTheDocument();
  });

  it("renders label cells with data-testid for all properties", () => {
    render(<GlassDetailPanel selectedGlass={selectedGlass} />);
    for (const key of ["Nd", "Ne", "Vd", "Ve", "P_g_F", "P_F_d", "P_F_e"]) {
      expect(screen.getByTestId(`label-${key}`)).toBeInTheDocument();
    }
  });
});
