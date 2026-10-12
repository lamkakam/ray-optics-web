import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeidelAberrModal } from "@/features/lens-editor/components/SeidelAberrModal";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const mockData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V", "C-I", "C-II"],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.9],
      [0.6, 0.7, 1.3],
      [0.8, 0.9, 1.7],
      [1.0, 1.1, 2.1],
      [0.011, 0.012, 0.023],
      [0.031, -0.032, -0.001],
    ],
  },
  transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
  wavefront: {
    aberrTypes: [
      "W040",
      "W131",
      "W222",
      "W220P",
      "W220",
      "W311",
      "W020",
      "W111",
    ],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.01, 0.09, 0.1],
      [0.12, 0.08, 0.2],
      [0.13, 0.17, 0.3],
      [0.05, 0.1, 0.15],
      [0.14, 0.26, 0.4],
      [0.15, 0.35, 0.5],
      [0.4, 0.51, 0.91],
      [-0.25, -0.33, -0.58],
    ],
  },
  curvature: { TCV: 0.1, SCV: 0.2, PCV: 0 },
};

const defaultProps = {
  isOpen: true,
  data: mockData,
  onClose: jest.fn(),
};

describe("SeidelAberrModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<SeidelAberrModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the title '3rd Order Seidel Aberrations'", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(
      screen.getByText("3rd Order Seidel Aberrations"),
    ).toBeInTheDocument();
  });

  it("renders 4 tabs with surface-by-surface tabs first", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(
      screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label")),
    ).toEqual([
      "Seidel (surface by surface)",
      "Wavefront (surface by surface)",
      "Transverse",
      "Field Curvature",
    ]);
  });

  it("default tab (Seidel surface by surface) shows a table", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("Surface by Surface tab has column headers for Seidel type labels S-I through S-V", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(
      screen.getByRole("columnheader", { name: "S-I" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "S-II" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "S-III" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "S-IV" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "S-V" }),
    ).toBeInTheDocument();
  });

  it("Surface by Surface tab shows primary chromatic coefficients C-I and C-II", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(
      screen.getByRole("columnheader", { name: "C-I" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "C-II" }),
    ).toBeInTheDocument();
    const sumRow = screen.getByRole("cell", { name: "sum" }).closest("tr");
    expect(sumRow).toHaveTextContent("0.023000");
    expect(sumRow).toHaveTextContent("-0.001000");
  });

  it("Surface by Surface tab shows surface labels S1, S2 and sum", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("cell", { name: "S1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "S2" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "sum" })).toBeInTheDocument();
  });

  it("table cells are read-only (no input inside the table)", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking Transverse tab shows full aberration label text", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Transverse" }));
    expect(
      screen.getByText("Transverse Spherical Aberration (TSA)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Transverse Coma (TCO)")).toBeInTheDocument();
    expect(
      screen.getByText("Tangential Astigmatism (TAS)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sagittal Astigmatism (SAS)")).toBeInTheDocument();
    expect(screen.getByText("Petzval Blur (PTB)")).toBeInTheDocument();
    expect(screen.getByText("Distortion (DST)")).toBeInTheDocument();
  });

  it("clicking Wavefront tab shows surface-by-surface columns with Petzval Curvature before Field Curvature", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("tab", { name: "Wavefront (surface by surface)" }),
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "Surface",
      "Spherical Aberration",
      "Coma",
      "Astigmatism",
      "Petzval Curvature",
      "Field Curvature",
      "Distortion",
      "Primary Axial Chromatic Aberr.",
      "Primary Lateral Chromatic Aberr.",
    ]);
  });

  it("clicking Wavefront tab shows one row per surface plus the sum", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("tab", { name: "Wavefront (surface by surface)" }),
    );
    const cellsOf = (label: string) =>
      Array.from(
        screen.getByRole("cell", { name: label }).closest("tr")!.cells,
        (cell) => cell.textContent,
      );
    expect(cellsOf("S1")).toEqual([
      "S1",
      "0.010000",
      "0.120000",
      "0.130000",
      "0.050000",
      "0.140000",
      "0.150000",
      "0.400000",
      "-0.250000",
    ]);
    expect(cellsOf("sum")).toEqual([
      "sum",
      "0.100000",
      "0.200000",
      "0.300000",
      "0.150000",
      "0.400000",
      "0.500000",
      "0.910000",
      "-0.580000",
    ]);
  });

  it("explains how the primary chromatic terms depend on the wavelengths", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByText(/first and last wavelengths/)).toBeInTheDocument();
    expect(screen.getByText(/at least 3 wavelengths/)).toBeInTheDocument();
  });

  it("clicking Field Curvature tab shows curvature aberration labels", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    expect(
      screen.getByText("Tangential Field Curvature (TCV)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sagittal Field Curvature (SCV)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Petzval Curvature (PCV)")).toBeInTheDocument();
  });

  it("Field Curvature tab shows a 'Curvature Radius' column header", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    expect(
      screen.getByRole("columnheader", { name: "Curvature Radius" }),
    ).toBeInTheDocument();
  });

  it("non-zero curvature value shows 1/value in Curvature Radius column", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    // TCV = 0.1, so 1/0.1 = 10.000000
    expect(screen.getByText((1 / 0.1).toFixed(6))).toBeInTheDocument();
  });

  it("zero curvature value shows 'Infinite' in Curvature Radius column", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    // PCV = 0, so Curvature Radius = "Infinite"
    expect(screen.getByText("Infinite")).toBeInTheDocument();
  });

  it("renders an Ok button", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Ok" })).toBeInTheDocument();
  });

  it("calls onClose when Ok is clicked", async () => {
    const onClose = jest.fn();
    render(<SeidelAberrModal {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not wrap its content in its own MathJaxContext", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });
});
