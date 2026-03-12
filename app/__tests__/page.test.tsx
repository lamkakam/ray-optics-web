import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock useTheme
const mockToggleTheme = jest.fn();
jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: mockToggleTheme }),
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
    // Initially renders with default specs (no example loaded)
    render(<Home />);
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toContainHTML("0.00 mm");
  });

  // --- Example system selector tests ---

  it("renders an Example Systems select to the left of Update System", () => {
    render(<Home />);
    const select = screen.getByLabelText("Example system");
    const updateBtn = screen.getByRole("button", { name: "Update System" });
    expect(select).toBeInTheDocument();
    // Select should come before the button in DOM order
    expect(
      select.compareDocumentPosition(updateBtn) &
      Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  // --- Settings modal tests ---

  it("renders a settings button in the header", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: "Settings" })
    ).toBeInTheDocument();
  });

  it("opens settings modal when settings button is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("settings modal has title 'Settings'", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Settings");
  });

  it("settings modal contains a theme select", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });

  it("settings modal contains an Ok button", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: "Ok" })).toBeInTheDocument();
  });

  it("settings modal closes when Ok is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("theme select defaults to current theme", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    const themeSelect = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(themeSelect.value).toBe("light");
  });

  it("selecting a different theme option calls toggleTheme", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("selecting the same theme option does not call toggleTheme", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "light");
    expect(mockToggleTheme).not.toHaveBeenCalled();
  });
});
