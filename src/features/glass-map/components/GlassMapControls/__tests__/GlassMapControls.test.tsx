import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlassMapControls } from "@/features/glass-map/components/GlassMapControls";
import type { CatalogName } from "@/features/glass-map/types/glassMap";
import { CATALOG_COLOR_MAP } from "@/features/glass-map/lib/glassMap";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";

const allEnabled: Record<CatalogName, boolean> = {
  CDGM: true,
  Hikari: true,
  Hoya: true,
  Ohara: true,
  Schott: true,
  Sumita: true,
  Special: true,
  Custom: true,
};

const defaultProps = {
  plotType: "refractiveIndex" as const,
  abbeNumCenterLine: "d" as const,
  partialDispersionType: "P_gF" as const,
  enabledCatalogs: allEnabled,
  onPlotTypeChange: jest.fn(),
  onAbbeNumCenterLineChange: jest.fn(),
  onPartialDispersionTypeChange: jest.fn(),
  onToggleCatalog: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

function getOptionsGrid(label: string): Element {
  const optionsGrid = screen.getByRole("group", { name: label }).querySelector(":scope > div");
  if (!optionsGrid) {
    throw new Error(`Options grid for ${label} not found`);
  }
  return optionsGrid;
}

describe("GlassMapControls", () => {
  it("renders plot type options in two columns", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Plot Type")).toHaveClass("grid-cols-2");
  });

  it("renders plot type options with compact layout", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Plot Type")).toHaveClass("inline-grid", "gap-x-6", "gap-y-1");
  });

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

  it("renders centre wavelength options in two columns", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Centre Wavelength")).toHaveClass("grid-cols-2");
  });

  it("renders centre wavelength options with compact layout", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Centre Wavelength")).toHaveClass("inline-grid", "gap-x-6", "gap-y-1");
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

  it("renders partial dispersion options in three columns", () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    expect(getOptionsGrid("Partial Dispersion")).toHaveClass("grid-cols-3");
  });

  it("renders partial dispersion options with compact layout", () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    expect(getOptionsGrid("Partial Dispersion")).toHaveClass("inline-grid", "gap-x-6", "gap-y-1");
  });

  it("hides partial dispersion type selector when plotType=refractiveIndex", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.queryByRole("radio", { name: /P_g,F/i })).not.toBeInTheDocument();
  });

  it("calls onPartialDispersionTypeChange with P_Fd when clicked", async () => {
    render(<GlassMapControls {...defaultProps} plotType="partialDispersion" />);
    await userEvent.click(screen.getByRole("radio", { name: /P_F,d/i }));
    expect(defaultProps.onPartialDispersionTypeChange).toHaveBeenCalledWith("P_Fd");
  });

  it("renders a checkbox for each catalog", () => {
    render(<GlassMapControls {...defaultProps} />);
    for (const name of CATALOG_NAMES) {
      expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
    }
  });

  it("renders catalog checkboxes in three columns", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Catalogs")).toHaveClass("grid-cols-3");
  });

  it("renders catalog checkboxes with compact layout", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(getOptionsGrid("Catalogs")).toHaveClass("inline-grid", "gap-x-6", "gap-y-1");
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

  it("renders the colored dot next to each catalog checkbox", () => {
    render(<GlassMapControls {...defaultProps} />);
    const dot = screen.getByTestId("catalog-dot-Schott");
    expect(dot).toHaveStyle({ backgroundColor: CATALOG_COLOR_MAP.Schott });
  });

  it("does not wrap its content in its own MathJaxContext", () => {
    render(<GlassMapControls {...defaultProps} />);
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });
});
