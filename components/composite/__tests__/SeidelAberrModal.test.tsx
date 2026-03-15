import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeidelAberrModal } from "@/components/composite/SeidelAberrModal";
import type { SeidelData } from "@/lib/opticalModel";

jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const mockData: SeidelData = {
  surfaceBySurface: {
    index: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    columns: ["S1", "S2", "sum"],
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
  curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
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
    expect(screen.getByRole("tab", { name: "Curvature" })).toBeInTheDocument();
  });

  it("default tab (Surface by Surface) shows ag-grid", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("ag-grid has column headers for Seidel type labels S-I through S-V", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    const headerTexts = within(grid).getAllByRole("columnheader").map((th) => th.textContent);
    expect(headerTexts).toContain("S-I");
    expect(headerTexts).toContain("S-II");
    expect(headerTexts).toContain("S-III");
    expect(headerTexts).toContain("S-IV");
    expect(headerTexts).toContain("S-V");
  });

  it("ag-grid rows show surface labels S1, S2 and sum", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    const cellTexts = within(grid).getAllByRole("cell").map((td) => td.textContent);
    expect(cellTexts).toContain("S1");
    expect(cellTexts).toContain("S2");
    expect(cellTexts).toContain("sum");
  });

  it("tab panel has a fixed height class for consistent modal size", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    const panel = screen.getByRole("tabpanel");
    expect(panel.className).toContain("h-72");
    expect(panel.className).toContain("overflow-y-auto");
  });

  it("ag-grid cells are read-only (no input inside the grid)", () => {
    render(<SeidelAberrModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    expect(within(grid).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking Transverse tab shows ag-grid with TSA/TCO/TAS/SAS/PTB/DST keys", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Transverse" }));
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toBeInTheDocument();
    expect(within(grid).getByText("TSA")).toBeInTheDocument();
    expect(within(grid).getByText("TCO")).toBeInTheDocument();
    expect(within(grid).getByText("TAS")).toBeInTheDocument();
    expect(within(grid).getByText("SAS")).toBeInTheDocument();
    expect(within(grid).getByText("PTB")).toBeInTheDocument();
    expect(within(grid).getByText("DST")).toBeInTheDocument();
  });

  it("clicking Wavefront tab shows ag-grid with W040/W131/W222/W220/W311 keys", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Wavefront" }));
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toBeInTheDocument();
    expect(within(grid).getByText("W040")).toBeInTheDocument();
    expect(within(grid).getByText("W131")).toBeInTheDocument();
    expect(within(grid).getByText("W222")).toBeInTheDocument();
    expect(within(grid).getByText("W220")).toBeInTheDocument();
    expect(within(grid).getByText("W311")).toBeInTheDocument();
  });

  it("clicking Curvature tab shows ag-grid with TCV/SCV/PCV keys", async () => {
    render(<SeidelAberrModal {...defaultProps} />);
    await userEvent.click(screen.getByRole("tab", { name: "Curvature" }));
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toBeInTheDocument();
    expect(within(grid).getByText("TCV")).toBeInTheDocument();
    expect(within(grid).getByText("SCV")).toBeInTheDocument();
    expect(within(grid).getByText("PCV")).toBeInTheDocument();
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
});
