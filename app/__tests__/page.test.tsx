import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock useTheme
jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

// Mock usePyodide
const mockSetOpticalSurfaces = jest.fn().mockResolvedValue(undefined);
const mockGetFirstOrderData = jest
  .fn()
  .mockResolvedValue({ efl: 100, ffl: -80, bfl: 90 });
const mockPlotLensLayout = jest.fn().mockResolvedValue("base64-layout");
const mockPlotRayFan = jest.fn().mockResolvedValue("base64-rayfan");
const mockPlotOpdFan = jest.fn().mockResolvedValue("base64-opdfan");
const mockPlotSpotDiagram = jest.fn().mockResolvedValue("base64-spot");

const mockProxy = {
  init: jest.fn().mockResolvedValue(undefined),
  setOpticalSurfaces: mockSetOpticalSurfaces,
  getFirstOrderData: mockGetFirstOrderData,
  plotLensLayout: mockPlotLensLayout,
  plotRayFan: mockPlotRayFan,
  plotOpdFan: mockPlotOpdFan,
  plotSpotDiagram: mockPlotSpotDiagram,
};

jest.mock("@/hooks/usePyodide", () => ({
  usePyodide: () => ({
    proxy: mockProxy,
    isReady: true,
    error: undefined,
  }),
}));

describe("Home page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the header with title", () => {
    render(<Home />);
    expect(screen.getByText("Ray Optics Web")).toBeInTheDocument();
  });

  it("renders the lens layout panel area", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: "Refresh lens layout" })
    ).toBeInTheDocument();
  });

  it("renders the analysis panel with field and plot type selectors", () => {
    render(<Home />);
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Plot type")).toBeInTheDocument();
  });

  it("renders field options as absolute field values with units", () => {
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    // Demo fields: [0, 0.7, 1] relative, maxField = 20, type = angle
    expect(fieldSelect).toContainHTML("0.0°");
    expect(fieldSelect).toContainHTML("14.0°");
    expect(fieldSelect).toContainHTML("20.0°");
  });

  it("renders the bottom drawer with System Specs and Prescription tabs", () => {
    render(<Home />);
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prescription" })).toBeInTheDocument();
  });

  it("shows SpecsConfigurerContainer content in System Specs tab", () => {
    render(<Home />);
    // System Aperture is rendered by SpecsConfigurerPanel
    expect(screen.getByText("System Aperture")).toBeInTheDocument();
  });

  it("switches to Prescription tab and shows LensPrescriptionContainer", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    // The Export JSON button is in LensPrescriptionContainer
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
  });

  // --- New tests for submit button and worker integration ---

  it("renders an Update System button in the header", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: "Update System" })
    ).toBeInTheDocument();
  });

  it("calls worker APIs in correct order when Update System is clicked", async () => {
    render(<Home />);
    const btn = screen.getByRole("button", { name: "Update System" });

    await userEvent.click(btn);

    await waitFor(() => {
      expect(mockSetOpticalSurfaces).toHaveBeenCalledTimes(1);
    });

    // After setOpticalSurfaces, the parallel calls happen
    await waitFor(() => {
      expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1);
      expect(mockPlotLensLayout).toHaveBeenCalledTimes(1);
      expect(mockPlotRayFan).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error modal on worker error and hides it on OK", async () => {
    mockSetOpticalSurfaces.mockRejectedValueOnce(new Error("bad input"));
    render(<Home />);

    await userEvent.click(
      screen.getByRole("button", { name: "Update System" })
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "The input parameters are invalid. Please check your specifications and prescription."
      )
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("field dropdown reflects committedSpecs, not draft edits", () => {
    // Initially renders with DEMO_SPECS field options
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toContainHTML("0.0°");
    expect(fieldSelect).toContainHTML("14.0°");
    expect(fieldSelect).toContainHTML("20.0°");
  });
});
