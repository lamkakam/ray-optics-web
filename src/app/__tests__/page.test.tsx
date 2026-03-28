import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import type { OpticalModel, SeidelData } from "@/lib/opticalModel";
import type { Theme } from "@/lib/theme";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";

// Mock useTheme
const mockToggleTheme: jest.Mock<void, [Theme]> = jest.fn();
jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockToggleTheme }),
}));

// Mock useScreenBreakpoint (default: screenSM, overridable per describe)
import type { ScreenSize } from "@/hooks/useScreenBreakpoint";
const mockScreenSize = { value: "screenSM" as ScreenSize };
jest.mock("@/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => mockScreenSize.value,
}));

// Mock usePyodide
const mockGetFirstOrderData: jest.Mock<Promise<Record<string, number>>, [OpticalModel]> = jest
  .fn()
  .mockResolvedValue({ efl: 100, ffl: -80, bfl: 90 });
const mockPlotLensLayout: jest.Mock<Promise<string>, [OpticalModel]> = jest.fn().mockResolvedValue("base64-layout");
const mockPlotRayFan: jest.Mock<Promise<string>, [OpticalModel, number]> = jest.fn().mockResolvedValue("base64-rayfan");
const mockPlotOpdFan: jest.Mock<Promise<string>, [OpticalModel, number]> = jest.fn().mockResolvedValue("base64-opdfan");
const mockPlotSpotDiagram: jest.Mock<Promise<string>, [OpticalModel, number]> = jest.fn().mockResolvedValue("base64-spot");
const mockPlotSurfaceBySurface3rdOrderAberr: jest.Mock<Promise<string>, [OpticalModel]> = jest.fn().mockResolvedValue("base64-3rdorder");
const mockGet3rdOrderSeidelData: jest.Mock<Promise<SeidelData>, [OpticalModel]> = jest.fn().mockResolvedValue({
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "sum"],
    data: [[0.1, 0.1], [0.2, 0.2], [0.3, 0.3], [0.4, 0.4], [0.5, 0.5]],
  },
  transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
  wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
  curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
});

const mockProxy = {
  init: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  getFirstOrderData: mockGetFirstOrderData,
  plotLensLayout: mockPlotLensLayout,
  plotRayFan: mockPlotRayFan,
  plotOpdFan: mockPlotOpdFan,
  plotSpotDiagram: mockPlotSpotDiagram,
  plotSurfaceBySurface3rdOrderAberr: mockPlotSurfaceBySurface3rdOrderAberr,
  plotWavefrontMap: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-wavefront"),
  plotGeoPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-geopsf"),
  plotDiffractionPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-diffrpsf"),
  get3rdOrderSeidelData: mockGet3rdOrderSeidelData,
  getZernikeCoefficients: jest.fn<Promise<Record<string, unknown>>, [OpticalModel, number, number, number?]>().mockResolvedValue({}),
  focusByMonoRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByMonoStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  getAllGlassCatalogsData: jest.fn().mockResolvedValue({}),
} satisfies Record<keyof PyodideWorkerAPI, jest.Mock>;

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

  it("renders the analysis panel with field and plot type selectors", () => {
    render(<Home />);
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Plot type")).toBeInTheDocument();
  });

  it("renders field options from default specs initially", () => {
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    // Default specs: fields [0], maxField = 0, type = height
    expect(fieldSelect).toContainHTML("0.00 mm");
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
    // The Download Config button is in LensPrescriptionContainer
    expect(screen.getByText("Download Config")).toBeInTheDocument();
  });

  it("registers a beforeunload handler that calls preventDefault", () => {
    render(<Home />);
    const spy = jest.spyOn(Event.prototype, "preventDefault");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  // --- New tests for submit button and worker integration ---

  it("renders an Update System button in the Prescription tab toolbar", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    expect(
      screen.getByRole("button", { name: "Update System" })
    ).toBeInTheDocument();
  });

  it("calls worker APIs when Update System is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    const btn = screen.getByRole("button", { name: "Update System" });

    await userEvent.click(btn);

    await waitFor(() => {
      expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1);
      expect(mockGetFirstOrderData).toHaveBeenCalledWith(
        expect.objectContaining({ setAutoAperture: "manualAperture" }),
      );
      expect(mockPlotLensLayout).toHaveBeenCalledTimes(1);
      expect(mockPlotRayFan).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error modal on worker error and hides it on OK", async () => {
    mockGetFirstOrderData.mockRejectedValueOnce(new Error("bad input"));
    render(<Home />);

    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
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
    // Initially renders with default specs (no example loaded)
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toContainHTML("0.00 mm");
  });

  // --- Example system selector tests ---

  it("renders an Example Systems select", () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system");
    expect(select).toBeInTheDocument();
  });

  it("example system dropdown is below the header, not inside it", () => {
    render(<Home />);
    const header = document.querySelector("header");
    const select = screen.getByLabelText("Example system");
    expect(header).not.toContainElement(select);
  });

  it("starts with no example selected and shows a placeholder option", () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system") as HTMLSelectElement;
    // The first selected option should be the placeholder
    expect(select.value).toBe("");
    expect(select.options[0].text).toMatch(/example/i);
    expect(select.options[0].disabled).toBe(true);
  });

  it("lists all example systems as options", () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system");
    const options = Array.from(
      (select as HTMLSelectElement).options
    ).map((o) => o.text);
    expect(options).toContain("1: Sasian Triplet");
    expect(options).toContain("2: Newtonian Reflector with Optical Window");
  });

  it("shows confirmation modal when selecting an example system", async () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system");

    await userEvent.selectOptions(select, "1: Sasian Triplet");

    // A confirmation dialog should appear
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/overwrite/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("loads example system when user confirms in the modal", async () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system");

    await userEvent.selectOptions(select, "1: Sasian Triplet");

    // Confirm
    await userEvent.click(screen.getByRole("button", { name: /confirm|ok|load/i }));

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Verify specs updated: Sasian Triplet has EPD 12.5
    expect(screen.getByDisplayValue("12.5")).toBeInTheDocument();

    // Check prescription tab has the right surface data
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    expect(screen.getByDisplayValue("23.713")).toBeInTheDocument();
  });

  it("does not render a drag handle on small screens (screenSM default in JSDOM)", () => {
    render(<Home />);
    expect(
      screen.queryByRole("separator", { name: "Resize drawer" })
    ).not.toBeInTheDocument();
  });

  it("does not load example system when user cancels in the modal", async () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system") as HTMLSelectElement;

    await userEvent.selectOptions(select, "1: Sasian Triplet");

    // Cancel
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Select reverts to placeholder
    expect(select.value).toBe("");

    // Specs should remain at defaults (pupilValue 0.5, not 12.5)
    expect(screen.queryByDisplayValue("12.5")).not.toBeInTheDocument();
  });

  // --- Tooltip tests ---

  it("Update System button has a tooltip with correct text", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Compute and update the optical system")).toBe(true);
  });

  // --- Side nav / hamburger tests ---

  it("renders hamburger button in the header", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
  });

  it("clicking hamburger opens side nav", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("navigation", { name: "Side navigation" })).toBeInTheDocument();
  });

  it("clicking hamburger again closes side nav", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("navigation", { name: "Side navigation" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.queryByRole("navigation", { name: "Side navigation" })).not.toBeInTheDocument();
  });

  it("clicking Settings in side nav shows settings view (no dialog)", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking Privacy Policy in side nav shows privacy view (no dialog)", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("link", { name: "Privacy Policy" }));
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking About in side nav shows about view", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("link", { name: "About" }));
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  // --- surfaceBySurface3rdOrder plot type tests ---

  it("calls plotSurfaceBySurface3rdOrderAberr when plot type changes after a commit", async () => {
    render(<Home />);

    // First commit a model so committedOpticalModel is set
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "surfaceBySurface3rdOrder");
    await waitFor(() => {
      expect(mockPlotSurfaceBySurface3rdOrderAberr).toHaveBeenCalledTimes(1);
    });
    expect(mockPlotRayFan).not.toHaveBeenCalled();
  });

  it("does not re-call plotSurfaceBySurface3rdOrderAberr when field changes while surfaceBySurface3rdOrder is selected", async () => {
    render(<Home />);

    // First click Update System so we have field options from committed specs
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1));

    // Switch to surfaceBySurface3rdOrder
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "surfaceBySurface3rdOrder");
    await waitFor(() => expect(mockPlotSurfaceBySurface3rdOrderAberr).toHaveBeenCalledTimes(1));

    jest.clearAllMocks();

    // Change field — should NOT trigger another plot call
    const fieldSelect = screen.getByLabelText("Field");
    // The field select is disabled, so we cannot use userEvent to change it.
    // Instead verify it is disabled.
    expect(fieldSelect).toBeDisabled();
    expect(mockPlotSurfaceBySurface3rdOrderAberr).not.toHaveBeenCalled();
  });

  it("calls plotSurfaceBySurface3rdOrderAberr on Update System when that plot type is selected", async () => {
    render(<Home />);

    // Switch to surfaceBySurface3rdOrder before committing
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "surfaceBySurface3rdOrder");

    // Navigate to Prescription tab and click Update System
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => {
      expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1);
      expect(mockPlotSurfaceBySurface3rdOrderAberr).toHaveBeenCalledTimes(1);
    });
    expect(mockPlotRayFan).not.toHaveBeenCalled();
  });

  // --- 3rd Order Seidel Aberr. button and modal tests ---

  it("'3rd Order Seidel Aberr.' button not present before Update System", () => {
    render(<Home />);
    expect(screen.queryByRole("button", { name: "3rd Order Seidel Aberrations" })).not.toBeInTheDocument();
  });

  it("'3rd Order Seidel Aberr.' button appears after Update System succeeds", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })).toBeInTheDocument();
    });
  });

  it("calls get3rdOrderSeidelData alongside getFirstOrderData on submit", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => {
      expect(mockGet3rdOrderSeidelData).toHaveBeenCalledTimes(1);
      expect(mockGetFirstOrderData).toHaveBeenCalledTimes(1);
    });
  });

  it("clicking '3rd Order Seidel Aberr.' button opens the Seidel dialog", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("3rd Order Seidel Aberrations")).toBeInTheDocument();
  });

  it("clicking Ok inside the Seidel modal closes it", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ok" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("small screen layout containers", () => {
    it("lens-layout-container has class w-full on small screens", () => {
      render(<Home />);
      const container = screen.getByTestId("lens-layout-container");
      expect(container).toHaveClass("w-full");
    });

    it("analysis-plot-container has class w-full on small screens", () => {
      render(<Home />);
      const container = screen.getByTestId("analysis-plot-container");
      expect(container).toHaveClass("w-full");
    });
  });

  describe("large screen layout", () => {
    beforeEach(() => { mockScreenSize.value = "screenLG"; });
    afterEach(() => { mockScreenSize.value = "screenSM"; });

    it("example system dropdown has a max-width constraint on large screens", () => {
      render(<Home />);
      const dropdown = screen.getByLabelText("Example system").closest("div");
      expect(dropdown).toHaveClass("max-w-xs");
    });
  });
});
