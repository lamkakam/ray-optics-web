import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LensPrescriptionGrid } from "@/components/composite/LensPrescriptionGrid";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/lib/gridTypes";

const testRows: GridRow[] = [
  { id: OBJECT_ROW_ID, kind: "object", objectDistance: 1e10 },
  {
    id: "s1",
    kind: "surface",
    label: "Default",
    curvatureRadius: 50,
    thickness: 5,
    medium: "BK7",
    manufacturer: "Schott",
    semiDiameter: 10,
  },
  {
    id: "s2",
    kind: "surface",
    label: "Stop",
    curvatureRadius: -30,
    thickness: 3,
    medium: "F2",
    manufacturer: "Schott",
    semiDiameter: 8,
    aspherical: { conicConstant: -1.0 },
  },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

describe("LensPrescriptionGrid", () => {
  const defaultProps = {
    rows: testRows,
    onRowChange: jest.fn(),
    onOpenMediumModal: jest.fn(),
    onOpenAsphericalModal: jest.fn(),
    onAddRowAfter: jest.fn(),
    onDeleteRow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the AG Grid mock table", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders all rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("renders expected column headers", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    const headerTexts = Array.from(headers).map((h) => h.textContent);

    expect(headerTexts).toContain("Surface");
    expect(headerTexts).toContain("Radius");
    expect(headerTexts).toContain("Thickness");
    expect(headerTexts).toContain("Medium");
    expect(headerTexts).toContain("Semi-diam.");
  });

  it("has an aria-label on the wrapper", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByLabelText("Lens prescription editor")).toBeInTheDocument();
  });

  // --- Surface label column ---
  it("renders a select dropdown for surface rows in the Surface column", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const selects = screen.getAllByRole("combobox", { name: "Surface label" });
    expect(selects).toHaveLength(2); // two surface rows
  });

  it("renders 'Object' text for object row in the Surface column", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByText("Object")).toBeInTheDocument();
  });

  it("renders 'Image' text for image row in the Surface column", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByText("Image")).toBeInTheDocument();
  });

  it("calls onRowChange when surface label is changed", async () => {
    const onRowChange = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onRowChange={onRowChange} />);
    const selects = screen.getAllByRole("combobox", { name: "Surface label" });

    await userEvent.selectOptions(selects[0], "Stop");

    expect(onRowChange).toHaveBeenCalledWith("s1", { label: "Stop" });
  });

  // --- Medium column ---
  it("renders medium buttons for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });
    expect(mediumButtons).toHaveLength(2); // two surface rows
  });

  it("calls onOpenMediumModal when medium button is clicked", async () => {
    const onOpenMediumModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenMediumModal={onOpenMediumModal} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });

    await userEvent.click(mediumButtons[0]);

    expect(onOpenMediumModal).toHaveBeenCalledWith("s1");
  });

  // --- Aspherical column ---
  it("renders aspherical checkboxes for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox", { name: "Edit aspherical parameters" });
    expect(checkboxes).toHaveLength(2); // two surface rows
  });

  it("calls onOpenAsphericalModal when aspherical checkbox is clicked", async () => {
    const onOpenAsphericalModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenAsphericalModal={onOpenAsphericalModal} />);
    const checkboxes = screen.getAllByRole("checkbox", { name: "Edit aspherical parameters" });

    await userEvent.click(checkboxes[1]); // s2 has aspherical

    expect(onOpenAsphericalModal).toHaveBeenCalledWith("s2");
  });

  // --- Numeric columns (Radius, Thickness, Semi-diam.) ---
  it("renders text inputs for editable numeric cells", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    // object: thickness (objectDistance) (1)
    // s1: radius, thickness, semi-diam (3)
    // s2: radius, thickness, semi-diam (3)
    // image: radius (1)
    expect(inputs).toHaveLength(8);
  });

  it("calls onRowChange when a numeric cell value changes", async () => {
    const onRowChange = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onRowChange={onRowChange} />);
    const inputs = screen.getAllByRole("textbox");

    // Second textbox should be s1 radius (value 50) — first is object thickness
    await userEvent.clear(inputs[1]);
    await userEvent.type(inputs[1], "100");
    await userEvent.tab();

    expect(onRowChange).toHaveBeenCalledWith("s1", { curvatureRadius: 100 });
  });

  // --- Object row thickness (object distance) ---
  it("renders a thickness input for the Object row", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    // First textbox is object's thickness (objectDistance = 1e10)
    expect(inputs[0]).toHaveValue("10000000000");
  });

  it("calls onRowChange with objectDistance when Object thickness changes", async () => {
    const onRowChange = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onRowChange={onRowChange} />);
    const inputs = screen.getAllByRole("textbox");

    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "500.5");
    await userEvent.tab();

    expect(onRowChange).toHaveBeenCalledWith(OBJECT_ROW_ID, { objectDistance: 500.5 });
  });

  // --- Cell click delegation (clicking empty space in a cell) ---
  it("focuses the input when clicking cell area around a NumberCell", async () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    const cellWrapper = inputs[1].closest("[data-cell-wrapper]")!;
    expect(cellWrapper).toBeInTheDocument();

    await userEvent.click(cellWrapper);

    expect(inputs[1]).toHaveFocus();
  });

  it("focuses the select when clicking cell area around a SurfaceLabelCell", async () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const selects = screen.getAllByRole("combobox", { name: "Surface label" });
    const cellWrapper = selects[0].closest("[data-cell-wrapper]")!;
    expect(cellWrapper).toBeInTheDocument();

    await userEvent.click(cellWrapper);

    expect(selects[0]).toHaveFocus();
  });

  it("opens medium modal when clicking cell area around the medium button", async () => {
    const onOpenMediumModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenMediumModal={onOpenMediumModal} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });
    const cellWrapper = mediumButtons[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenMediumModal).toHaveBeenCalledWith("s1");
  });

  it("opens aspherical modal when clicking cell area around the checkbox", async () => {
    const onOpenAsphericalModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenAsphericalModal={onOpenAsphericalModal} />);
    const checkboxes = screen.getAllByRole("checkbox", { name: "Edit aspherical parameters" });
    const cellWrapper = checkboxes[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenAsphericalModal).toHaveBeenCalledWith("s1");
  });

  // --- Add/Delete row buttons ---
  it("renders a '+' button for object and surface rows but not image", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });
    // object: 1, s1: 1, s2: 1, image: 0
    expect(addButtons).toHaveLength(3);
  });

  it("renders a '-' button only for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });
    // s1: 1, s2: 1
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls onAddRowAfter when '+' button is clicked on object row", async () => {
    const onAddRowAfter = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onAddRowAfter={onAddRowAfter} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[0]); // first '+' is for object row

    expect(onAddRowAfter).toHaveBeenCalledWith(OBJECT_ROW_ID);
  });

  it("calls onAddRowAfter when '+' button is clicked on surface row", async () => {
    const onAddRowAfter = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onAddRowAfter={onAddRowAfter} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[1]); // second '+' is for s1

    expect(onAddRowAfter).toHaveBeenCalledWith("s1");
  });

  it("calls onDeleteRow when '-' button is clicked on surface row", async () => {
    const onDeleteRow = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onDeleteRow={onDeleteRow} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });

    await userEvent.click(deleteButtons[0]); // first '-' is for s1

    expect(onDeleteRow).toHaveBeenCalledWith("s1");
  });
});
