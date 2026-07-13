import {
  createApertureColumn,
  createMediumColumn,
  createSemiDiameterColumn,
  createThicknessColumn,
  LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS,
  lensPrescriptionGridIndexColumnDef,
} from "@/shared/lib/lens-prescription-grid";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { ValueGetterParams } from "ag-grid-community";

const getGridRow = (row: GridRow) => row;

describe("lens prescription grid column widths", () => {
  it("keeps common prescription column widths in the shared source", () => {
    expect(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS).toMatchObject({
      thickness: 130,
      medium: 115,
      semiDiameter: 115,
      aperture: 115,
    });
  });

  it("applies shared widths to common column builders", () => {
    expect(createThicknessColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.thickness);
    expect(createMediumColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.medium);
    expect(createSemiDiameterColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.semiDiameter);
    expect(createApertureColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aperture);
  });

  it("keeps the shared Index column pinned left with its shared width", () => {
    expect(lensPrescriptionGridIndexColumnDef).toMatchObject({
      headerName: "Index",
      pinned: "left",
      width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.index,
    });
  });

  it("returns the formatted aperture label from the aperture value getter", () => {
    const row: GridRow = {
      kind: "surface",
      id: "surface-1",
      label: "Default",
      curvatureRadius: 10,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
      clear_aperture: { shape: "annular", obstructionRadius: 1.25, offsetX: -1, offsetY: 2 },
      edge_aperture: { shape: "circular", radius: 3.5, offsetX: 0.5, offsetY: -0.75 },
    };
    const column = createApertureColumn({ getGridRow });
    const valueGetter = column.valueGetter;

    expect(typeof valueGetter).toBe("function");
    if (typeof valueGetter !== "function") return;

    expect(valueGetter({ data: row } as ValueGetterParams<GridRow>)).toBe(
      "Annu obs 1.25, offset (-1, 2); Edge Cir 3.5, offset (0.5, -0.75)",
    );
  });

  it("blanks and disables semi-diameter for rectangular clear apertures", () => {
    const row: GridRow = {
      kind: "surface",
      id: "surface-1",
      label: "Default",
      curvatureRadius: 10,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0,
      clear_aperture: {
        shape: "rectangular",
        xHalfWidth: 4,
        yHalfWidth: 2,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
      },
    };
    const onSemiDiameterChange = jest.fn();
    const column = createSemiDiameterColumn({ getGridRow, onSemiDiameterChange });

    expect(typeof column.valueGetter).toBe("function");
    expect(typeof column.editable).toBe("function");
    if (typeof column.valueGetter !== "function" || typeof column.editable !== "function") return;

    expect(column.valueGetter({ data: row } as ValueGetterParams<GridRow>)).toBeUndefined();
    expect(column.editable({ data: row } as never)).toBe(false);
  });

  it("shows computed values in auto mode, including rectangular apertures, with manual fallback", () => {
    const rectangularRow: GridRow = {
      kind: "surface", id: "surface-1", label: "Default", curvatureRadius: 10,
      thickness: 2, medium: "air", manufacturer: "", semiDiameter: 6,
      clear_aperture: { shape: "rectangular", xHalfWidth: 4, yHalfWidth: 2, rotation: 0, offsetX: 0, offsetY: 0 },
    };
    const autoColumn = createSemiDiameterColumn({
      getGridRow,
      semiDiameterReadonly: true,
      computedSemiDiameters: { "surface-1": 4.472, "surface-2": 8.5 },
    });
    const fallbackRow = { ...rectangularRow, id: "new-surface", clear_aperture: undefined };

    expect(typeof autoColumn.valueGetter).toBe("function");
    if (typeof autoColumn.valueGetter !== "function") return;
    expect(autoColumn.valueGetter({ data: rectangularRow } as ValueGetterParams<GridRow>)).toBe(4.472);
    expect(autoColumn.valueGetter({ data: fallbackRow } as ValueGetterParams<GridRow>)).toBe(6);
  });
});
