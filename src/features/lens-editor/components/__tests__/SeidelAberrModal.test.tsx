import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeidelAberrModal } from "@/features/lens-editor/components/SeidelAberrModal";
import type { SeidelData } from "@/shared/lib/types/opticalModel";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const mockData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.9],
      [0.6, 0.7, 1.3],
      [0.8, 0.9, 1.7],
      [1.0, 1.1, 2.1],
    ],
  },
  transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
  wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
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
    expect(screen.getByText("3rd Order Seidel Aberrations")).toBeInTheDocument();
  });

  it("renders 4 tabs with correct labels", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("tab", { name: "Surface by Surface" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Transverse" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wavefront" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Field Curvature" })).toBeInTheDocument();
  });

  it("default tab (Surface by Surface) shows a table", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("Surface by Surface tab has column headers for Seidel type labels S-I through S-V", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("columnheader", { name: "S-I" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "S-II" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "S-III" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "S-IV" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "S-V" })).toBeInTheDocument();
  });

  it("Surface by Surface tab shows surface labels S1, S2 and sum", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByRole("cell", { name: "S1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "S2" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "sum" })).toBeInTheDocument();
  });

  it("tab panel has a fixed height class for consistent modal size", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    const panel = screen.getByRole("tabpanel");
    expect(panel.className).toContain("h-72");
    expect(panel.className).toContain("overflow-y-auto");
  });

  it("table cells are read-only (no input inside the table)", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking Transverse tab shows full aberration label text", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Transverse" }));
    expect(screen.getByText("Transverse Spherical Aberration (TSA)")).toBeInTheDocument();
    expect(screen.getByText("Transverse Coma (TCO)")).toBeInTheDocument();
    expect(screen.getByText("Tangential Astigmatism (TAS)")).toBeInTheDocument();
    expect(screen.getByText("Sagittal Astigmatism (SAS)")).toBeInTheDocument();
    expect(screen.getByText("Petzval Blur (PTB)")).toBeInTheDocument();
    expect(screen.getByText("Distortion (DST)")).toBeInTheDocument();
  });

  it("clicking Wavefront tab shows wavefront aberration labels", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Wavefront" }));
    expect(screen.getByText("Spherical Aberration")).toBeInTheDocument();
    expect(screen.getByText("Coma")).toBeInTheDocument();
    expect(screen.getByText("Astigmatism")).toBeInTheDocument();
    // "Field Curvature" also appears as a tab label, so use getAllByText
    expect(screen.getAllByText("Field Curvature").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Distortion")).toBeInTheDocument();
  });

  it("clicking Field Curvature tab shows curvature aberration labels", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    expect(screen.getByText("Tangential Field Curvature (TCV)")).toBeInTheDocument();
    expect(screen.getByText("Sagittal Field Curvature (SCV)")).toBeInTheDocument();
    expect(screen.getByText("Petzval Curvature (PCV)")).toBeInTheDocument();
  });

  it("Field Curvature tab shows a 'Curvature Radius' column header", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Field Curvature" }));
    expect(screen.getByRole("columnheader", { name: "Curvature Radius" })).toBeInTheDocument();
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
