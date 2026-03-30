import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlassMapControls } from "@/components/composite/GlassMapControls";
import type { CatalogName } from "@/lib/glassMap";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
import { CATALOG_NAMES } from "@/lib/glassMap";

const allEnabled: Record<CatalogName, boolean> = {
  CDGM: true,
  Hikari: true,
  Hoya: true,
  Ohara: true,
  Schott: true,
  Sumita: true,
};

const defaultProps = {
  plotType: "refractiveIndex" as const,
  abbeNumCenterLine: "d" as const,
  partialDispersionType: "P_g_F" as const,
  enabledCatalogs: allEnabled,
  onPlotTypeChange: jest.fn(),
  onAbbeNumCenterLineChange: jest.fn(),
  onPartialDispersionTypeChange: jest.fn(),
  onToggleCatalog: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("GlassMapControls", () => {
  it("renders plot type radios", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.getByRole("radio", { name: /refractive index/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /partial dispersion/i })).toBeInTheDocument();
  });

  it("refractive index radio is checked when plotType=refractiveIndex", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.getByRole("radio", { name: /refractive index/i })).toBeChecked();
  });

  it("partial dispersion radio is checked when plotType=partialDispersion", () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    expect(screen.getByRole("radio", { name: /partial dispersion/i })).toBeChecked();
  });

  it("calls onPlotTypeChange with partialDispersion when clicked", async () => {
    render(<GlassMapControls {...defaultProps} />);
    await userEvent.click(screen.getByRole("radio", { name: /partial dispersion/i }));
    expect(defaultProps.onPlotTypeChange).toHaveBeenCalledWith("partialDispersion");
  });

  it("calls onPlotTypeChange with refractiveIndex when clicked", async () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    await userEvent.click(screen.getByRole("radio", { name: /refractive index/i }));
    expect(defaultProps.onPlotTypeChange).toHaveBeenCalledWith("refractiveIndex");
  });

  it("renders d/e radios for abbeLine", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.getByRole("radio", { name: /\bd\b/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /\be\b/i })).toBeInTheDocument();
  });

  it("d radio is checked when abbeLine=d", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.getByRole("radio", { name: /\bd\b/i })).toBeChecked();
  });

  it("e radio is checked when abbeNumCenterLine=e", () => {
    render(<GlassMapControls {...defaultProps} abbeNumCenterLine="e" />);
    expect(screen.getByRole("radio", { name: /\be\b/i })).toBeChecked();
  });

  it("calls onAbbeNumCenterLineChange with e when e radio clicked", async () => {
    render(<GlassMapControls {...defaultProps} />);
    await userEvent.click(screen.getByRole("radio", { name: /\be\b/i }));
    expect(defaultProps.onAbbeNumCenterLineChange).toHaveBeenCalledWith("e");
  });

  it("shows partial dispersion type selector when plotType=partialDispersion", () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    expect(screen.getByRole("radio", { name: /P_F,d/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /P_F,e/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /P_g,F/i })).toBeInTheDocument();
  });

  it("hides partial dispersion type selector when plotType=refractiveIndex", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.queryByRole("radio", { name: /P_g,F/i })).not.toBeInTheDocument();
  });

  it("calls onPartialDispersionTypeChange with P_F_d when clicked", async () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    await userEvent.click(screen.getByRole("radio", { name: /P_F,d/i }));
    expect(defaultProps.onPartialDispersionTypeChange).toHaveBeenCalledWith("P_F_d");
  });

  it("renders a checkbox for each catalog", () => {
    render(<GlassMapControls {...defaultProps} />);
    for (const name of CATALOG_NAMES) {
      expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
    }
  });

  it("CDGM checkbox is checked when enabled", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.getByRole("checkbox", { name: "CDGM" })).toBeChecked();
  });

  it("CDGM checkbox is unchecked when disabled", () => {
    render(<GlassMapControls {...defaultProps} enabledCatalogs={{ ...allEnabled, CDGM: false }} />);
    expect(screen.getByRole("checkbox", { name: "CDGM" })).not.toBeChecked();
  });

  it("calls onToggleCatalog with catalog name when checkbox clicked", async () => {
    render(<GlassMapControls {...defaultProps} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Schott" }));
    expect(defaultProps.onToggleCatalog).toHaveBeenCalledWith("Schott");
  });

  it("does not wrap its content in its own MathJaxContext", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });
});
