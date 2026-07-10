import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LensPrescriptionGrid } from "../";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Theme } from "@/shared/tokens/theme";

// Mock useTheme — default to light
const mockToggleTheme = jest.fn();
let mockTheme: Theme = "light";
jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: mockTheme, toggleTheme: mockToggleTheme }),
}));

const testRows: GridRow[] = [
  { id: OBJECT_ROW_ID, kind: "object", objectDistance: 1e10, medium: "air", manufacturer: "" },
  {
    id: "s1",
    kind: "surface",
    label: "Default",
    curvatureRadius: 50,
    thickness: 5,
    medium: "BK7",
    manufacturer: "Schott",
    semiDiameter: 10,
    decenter: {
      coordinateSystemStrategy: "decenter",
      alpha: 0,
      beta: 0,
      gamma: 0,
      offsetX: 0,
      offsetY: 1,
    },
    diffractionGrating: { lpmm: 600, order: 1 },
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
    aspherical: { kind: "Conic", conicConstant: -1.0 },
  },
  { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
];

describe("LensPrescriptionGrid", () => {
  const defaultProps = {
    rows: testRows,
    onRowChange: jest.fn(),
    onOpenMediumModal: jest.fn(),
    onOpenAsphericalModal: jest.fn(),
    onOpenDecenterModal: jest.fn(),
    onOpenDiffractionGratingModal: jest.fn(),
    onOpenApertureModal: jest.fn(),
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

  it("uses normal AG Grid layout with responsive fixed grid heights", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);

    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "normal");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-suppress-touch", "true");
    expect(screen.getByLabelText("Lens prescription editor")).toHaveClass(
      "ag-grid-touch-scroll",
      "h-[calc(100vh-160px)]",
      "min-[1440px]:flex-1",
      "min-[1440px]:min-h-[200px]",
    );
  });

  it("allows native two-axis panning on AG Grid viewports for coarse pointers", () => {
    const globalStyles = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(globalStyles).toContain(".ag-grid-touch-scroll .ag-header-viewport");
    expect(globalStyles).toContain(".ag-grid-touch-scroll .ag-body-viewport");
    expect(globalStyles).toContain(".ag-grid-touch-scroll .ag-center-cols-viewport");
    expect(globalStyles).toMatch(/\.ag-grid-touch-scroll[\s\S]*touch-action:\s*pan-x pan-y;/);
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

    expect(headerTexts.slice(0, 3)).toEqual(["", "Index", "Surface"]);
    expect(headerTexts).toContain("Surface");
    expect(headerTexts).toContain("Radius of Curvature");
    expect(headerTexts).toContain("Thickness");
    expect(headerTexts).toContain("Medium");
    expect(headerTexts).toContain("Semi-diam.");
    expect(headerTexts.slice(headerTexts.indexOf("Semi-diam."), headerTexts.indexOf("Semi-diam.") + 2)).toEqual([
      "Semi-diam.",
      "Aperture",
    ]);
    expect(headerTexts).toContain("Tilt & Decenter");
    expect(headerTexts).toContain("Diffraction Grating");
  });

  it("pins the Index column to the left", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");

    expect(headers[1]).toHaveTextContent("Index");
    expect(headers[1]).toHaveAttribute("data-pinned", "left");
  });

  it("renders blank index cells for object and image rows and one-based indices for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    const indexValues = Array.from(rows, (row) => row.querySelectorAll("td")[1].textContent);

    expect(indexValues).toEqual(["", "1", "2", ""]);
  });

  it("renumbers surface indices continuously after inserting a surface row", () => {
    const insertedRows: GridRow[] = [
      testRows[0],
      testRows[1],
      {
        id: "inserted",
        kind: "surface",
        label: "Default",
        curvatureRadius: 12,
        thickness: 2,
        medium: "air",
        manufacturer: "",
        semiDiameter: 6,
      },
      testRows[2],
      testRows[3],
    ];
    const { rerender } = render(<LensPrescriptionGrid {...defaultProps} />);

    rerender(<LensPrescriptionGrid {...defaultProps} rows={insertedRows} />);

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    const indexValues = Array.from(rows, (row) => row.querySelectorAll("td")[1].textContent);
    expect(indexValues).toEqual(["", "1", "2", "3", ""]);
  });

  it("renumbers surface indices continuously after deleting a surface row", () => {
    const deletedRows: GridRow[] = [testRows[0], testRows[2], testRows[3]];
    const { rerender } = render(<LensPrescriptionGrid {...defaultProps} />);

    rerender(<LensPrescriptionGrid {...defaultProps} rows={deletedRows} />);

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    const indexValues = Array.from(rows, (row) => row.querySelectorAll("td")[1].textContent);
    expect(indexValues).toEqual(["", "1", ""]);
  });

  it("has an aria-label on the wrapper", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByLabelText("Lens prescription editor")).toBeInTheDocument();
  });

  // --- Surface label column ---
  it("renders a select dropdown for surface rows in the Surface column", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const selects = screen.getAllByRole("combobox", { name: "Surface" });
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
    const selects = screen.getAllByRole("combobox", { name: "Surface" });

    await userEvent.selectOptions(selects[0], "Stop");

    expect(onRowChange).toHaveBeenCalledWith("s1", { label: "Stop" });
  });

  // --- Medium column ---
  it("renders medium buttons for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });
    expect(mediumButtons).toHaveLength(3); // object row + two surface rows
  });

  it("calls onOpenMediumModal when medium button is clicked", async () => {
    const onOpenMediumModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenMediumModal={onOpenMediumModal} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });

    await userEvent.click(mediumButtons[0]);

    expect(onOpenMediumModal).toHaveBeenCalledWith(OBJECT_ROW_ID);
  });

  it("renders the object row medium value in the Medium column", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    expect(screen.getByText("air")).toBeInTheDocument();
  });

  it("opens the surface row medium modal when the second medium button is clicked", async () => {
    const onOpenMediumModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenMediumModal={onOpenMediumModal} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });

    await userEvent.click(mediumButtons[1]);

    expect(onOpenMediumModal).toHaveBeenCalledWith("s1");
  });

  // --- Aspherical column ---
  it("renders aspherical buttons for surface rows", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const buttons = screen.getAllByRole("button", { name: "Edit aspherical parameters" });
    expect(buttons).toHaveLength(2); // two surface rows
  });

  it("renders text labels for aspherical, decenter, and diffraction grating cells", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    const s1Cells = rows[1].querySelectorAll("td");
    const s2Cells = rows[2].querySelectorAll("td");

    expect(Array.from([s1Cells[8], s1Cells[9], s1Cells[10]], (cell) => cell.textContent)).toEqual([
      "None",
      "decenter",
      "600 lp/mm",
    ]);
    expect(Array.from([s2Cells[8], s2Cells[9], s2Cells[10]], (cell) => cell.textContent)).toEqual([
      "Conic",
      "None",
      "None",
    ]);
  });

  it("calls onOpenAsphericalModal when aspherical button is clicked", async () => {
    const onOpenAsphericalModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenAsphericalModal={onOpenAsphericalModal} />);
    const buttons = screen.getAllByRole("button", { name: "Edit aspherical parameters" });

    await userEvent.click(buttons[1]); // s2 has aspherical

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

  it("commits a pending numeric edit before another grid action is handled", async () => {
    const user = userEvent.setup();
    const onRowChange = jest.fn();
    const onOpenMediumModal = jest.fn();
    render(
      <LensPrescriptionGrid
        {...defaultProps}
        onRowChange={onRowChange}
        onOpenMediumModal={onOpenMediumModal}
      />
    );
    const inputs = screen.getAllByRole("textbox");

    await user.clear(inputs[1]);
    await user.type(inputs[1], "125");
    await user.click(screen.getAllByRole("button", { name: "Edit medium" })[1]);

    expect(onRowChange).toHaveBeenCalledWith("s1", { curvatureRadius: 125 });
    expect(onOpenMediumModal).toHaveBeenCalledWith("s1");
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
  it("opens medium modal when clicking cell area around the medium button", async () => {
    const onOpenMediumModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenMediumModal={onOpenMediumModal} />);
    const mediumButtons = screen.getAllByRole("button", { name: "Edit medium" });
    const cellWrapper = mediumButtons[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenMediumModal).toHaveBeenCalledWith(OBJECT_ROW_ID);
  });

  it("opens aspherical modal when clicking cell area around the aspherical button", async () => {
    const onOpenAsphericalModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenAsphericalModal={onOpenAsphericalModal} />);
    const buttons = screen.getAllByRole("button", { name: "Edit aspherical parameters" });
    const cellWrapper = buttons[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenAsphericalModal).toHaveBeenCalledWith("s1");
  });

  it("opens aperture modal when clicking the aperture button and surrounding cell area", async () => {
    const onOpenApertureModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenApertureModal={onOpenApertureModal} />);
    const buttons = screen.getAllByRole("button", { name: "Edit aperture" });

    await userEvent.click(buttons[0]);
    expect(onOpenApertureModal).toHaveBeenCalledWith("s1");

    const cellWrapper = buttons[1].closest("[data-cell-wrapper]")!;
    await userEvent.click(cellWrapper);
    expect(onOpenApertureModal).toHaveBeenCalledWith("s2");
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

  // --- Decenter column ---
  it("renders decenter buttons for surface rows and image row", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const decenterButtons = screen.getAllByRole("button", { name: "Edit decenter and tilt" });
    expect(decenterButtons).toHaveLength(3); // two surface rows + image row
  });

  it("calls onOpenDecenterModal when decenter button is clicked on a surface row", async () => {
    const onOpenDecenterModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenDecenterModal={onOpenDecenterModal} />);
    const decenterButtons = screen.getAllByRole("button", { name: "Edit decenter and tilt" });

    await userEvent.click(decenterButtons[0]);

    expect(onOpenDecenterModal).toHaveBeenCalledWith("s1");
  });

  it("calls onOpenDecenterModal when decenter button is clicked on image row", async () => {
    const onOpenDecenterModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenDecenterModal={onOpenDecenterModal} />);
    const decenterButtons = screen.getAllByRole("button", { name: "Edit decenter and tilt" });

    await userEvent.click(decenterButtons[2]); // last button is image row

    expect(onOpenDecenterModal).toHaveBeenCalledWith(IMAGE_ROW_ID);
  });

  it("opens decenter modal when clicking cell area around the decenter button", async () => {
    const onOpenDecenterModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenDecenterModal={onOpenDecenterModal} />);
    const decenterButtons = screen.getAllByRole("button", { name: "Edit decenter and tilt" });
    const cellWrapper = decenterButtons[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenDecenterModal).toHaveBeenCalledWith("s1");
  });

  it("opens decenter modal when clicking cell area around the image row decenter button", async () => {
    const onOpenDecenterModal = jest.fn();
    render(<LensPrescriptionGrid {...defaultProps} onOpenDecenterModal={onOpenDecenterModal} />);
    const decenterButtons = screen.getAllByRole("button", { name: "Edit decenter and tilt" });
    const cellWrapper = decenterButtons[2].closest("[data-cell-wrapper]")!; // image row

    await userEvent.click(cellWrapper);

    expect(onOpenDecenterModal).toHaveBeenCalledWith(IMAGE_ROW_ID);
  });

  // --- Diffraction Grating column ---
  it("renders diffraction grating buttons for surface rows only", () => {
    render(<LensPrescriptionGrid {...defaultProps} />);
    const gratingButtons = screen.getAllByRole("button", { name: "Edit diffraction grating" });
    expect(gratingButtons).toHaveLength(2);
  });

  it("calls onOpenDiffractionGratingModal when grating button is clicked", async () => {
    const onOpenDiffractionGratingModal = jest.fn();
    render(
      <LensPrescriptionGrid
        {...defaultProps}
        onOpenDiffractionGratingModal={onOpenDiffractionGratingModal}
      />
    );
    const gratingButtons = screen.getAllByRole("button", { name: "Edit diffraction grating" });

    await userEvent.click(gratingButtons[0]);

    expect(onOpenDiffractionGratingModal).toHaveBeenCalledWith("s1");
  });

  it("opens diffraction grating modal when clicking cell area around the grating button", async () => {
    const onOpenDiffractionGratingModal = jest.fn();
    render(
      <LensPrescriptionGrid
        {...defaultProps}
        onOpenDiffractionGratingModal={onOpenDiffractionGratingModal}
      />
    );
    const gratingButtons = screen.getAllByRole("button", { name: "Edit diffraction grating" });
    const cellWrapper = gratingButtons[0].closest("[data-cell-wrapper]")!;

    await userEvent.click(cellWrapper);

    expect(onOpenDiffractionGratingModal).toHaveBeenCalledWith("s1");
  });

  // --- semiDiameterReadonly prop ---
  it("renders semi-diam inputs for surface rows when semiDiameterReadonly is false (default)", () => {
    render(<LensPrescriptionGrid {...defaultProps} semiDiameterReadonly={false} />);
    const inputs = screen.getAllByRole("textbox");
    // object: thickness (1), s1: radius, thickness, semi-diam (3), s2: radius, thickness, semi-diam (3), image: radius (1) = 8
    expect(inputs).toHaveLength(8);
  });

  it("renders no semi-diam inputs for surface rows when semiDiameterReadonly is true", () => {
    render(<LensPrescriptionGrid {...defaultProps} semiDiameterReadonly={true} />);
    const inputs = screen.getAllByRole("textbox");
    // object: thickness (1), s1: radius, thickness (2), s2: radius, thickness (2), image: radius (1) = 6
    expect(inputs).toHaveLength(6);
  });

  // --- AG Grid theme integration ---
  it("passes light theme to AG Grid when ThemeProvider is light", () => {
    mockTheme = "light";
    render(<LensPrescriptionGrid {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid.dataset.theme).toBe("quartz+colorSchemeLight");
  });

  it("passes dark theme to AG Grid when ThemeProvider is dark", () => {
    mockTheme = "dark";
    render(<LensPrescriptionGrid {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid.dataset.theme).toBe("quartz+colorSchemeDark");
  });
});
