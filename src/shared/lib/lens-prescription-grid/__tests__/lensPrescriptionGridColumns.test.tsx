import {
  createApertureColumn,
  createCommentColumn,
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
      comment: 200,
      medium: 115,
      semiDiameter: 115,
      aperture: 115,
    });
  });

  it("applies shared widths to common column builders", () => {
    expect(createThicknessColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.thickness);
    expect(createCommentColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.comment);
    expect(createMediumColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.medium);
    expect(createSemiDiameterColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.semiDiameter);
    expect(createApertureColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aperture);
  });

  it("creates an explicitly text-edited comment column for physical surfaces only", () => {
    const onCommentChange = jest.fn();
    const column = createCommentColumn({ getGridRow, onCommentChange });
    const physicalRow: GridRow = {
      kind: "surface", id: "surface-1", label: "Default", comment: "Front element",
      curvatureRadius: 10, thickness: 2, medium: "air", manufacturer: "", semiDiameter: 5,
    };
    const objectRow: GridRow = {
      kind: "object", id: "object", objectDistance: 1e10, medium: "air", manufacturer: "",
    };
    const imageRow: GridRow = { kind: "image", id: "image", curvatureRadius: 0 };

    expect(column.cellEditor).toBe("agTextCellEditor");
    expect(typeof column.valueGetter).toBe("function");
    expect(typeof column.editable).toBe("function");
    expect(typeof column.valueSetter).toBe("function");
    if (typeof column.valueGetter !== "function" || typeof column.editable !== "function" || typeof column.valueSetter !== "function") return;

    expect(column.valueGetter({ data: physicalRow } as ValueGetterParams<GridRow>)).toBe("Front element");
    expect(column.valueGetter({ data: { ...physicalRow, comment: undefined } } as ValueGetterParams<GridRow>)).toBe("");
    expect(column.valueGetter({ data: objectRow } as ValueGetterParams<GridRow>)).toBe("");
    expect(column.valueGetter({ data: imageRow } as ValueGetterParams<GridRow>)).toBe("");
    expect(column.editable({ data: physicalRow } as never)).toBe(true);
    expect(column.editable({ data: objectRow } as never)).toBe(false);
    expect(column.editable({ data: imageRow } as never)).toBe(false);

    expect(column.valueSetter({ data: physicalRow, newValue: "Updated" } as never)).toBe(true);
    expect(onCommentChange).toHaveBeenCalledWith(physicalRow, "Updated");
  });

  it("keeps the comment column read-only when no change callback is supplied", () => {
    const column = createCommentColumn({ getGridRow });
    const row: GridRow = {
      kind: "surface", id: "surface-1", label: "Default", curvatureRadius: 10,
      thickness: 2, medium: "air", manufacturer: "", semiDiameter: 5,
    };

    expect(typeof column.editable).toBe("function");
    if (typeof column.editable !== "function") return;
    expect(column.editable({ data: row } as never)).toBe(false);
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
