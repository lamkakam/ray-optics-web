import {
  createApertureColumn,
  createAsphericalColumn,
  createCommentColumn,
  createDecenterColumn,
  createDiffractionGratingColumn,
  createLensPrescriptionCommonColumns,
  createMediumColumn,
  createRadiusOfCurvatureColumn,
  createSemiDiameterColumn,
  createSurfaceColumn,
  createThicknessColumn,
  lensPrescriptionGridIndexColumnDef,
  lensPrescriptionGridDefaultColDef,
  numberValueParser,
} from "@/shared/lib/lens-prescription-grid";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { ValueGetterParams } from "ag-grid-community";
import { fireEvent, render, screen } from "@testing-library/react";

const getGridRow = (row: GridRow) => row;

/** Representative rows used to exercise every shared column callback branch. */
const rows = {
  object: {
    kind: "object",
    id: "row-object",
    objectDistance: 1e10,
    medium: "air",
    manufacturer: "",
  } satisfies GridRow,
  image: {
    kind: "image",
    id: "row-image",
    curvatureRadius: -8,
    decenter: { coordinateSystemStrategy: "reverse", alpha: 1, beta: 2, gamma: 3, offsetX: 4, offsetY: 5 },
  } satisfies GridRow,
  surface: {
    kind: "surface",
    id: "surface-1",
    label: "Stop",
    comment: "Front element",
    curvatureRadius: 12,
    thickness: 2,
    medium: "N-BK7",
    manufacturer: "Schott",
    semiDiameter: 5,
    aspherical: { kind: "Conic", conicConstant: -1 },
    decenter: { coordinateSystemStrategy: "bend", alpha: 1, beta: 2, gamma: 3, offsetX: 4, offsetY: 5 },
    diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
  } satisfies GridRow,
};

/** Invokes a callback-valued AG Grid property while preserving literal fallback values. */
function invokeColumnCallback(callback: unknown, params: unknown): unknown {
  return typeof callback === "function" ? callback(params) : callback;
}

describe("lens prescription grid columns", () => {

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
    expect(column.editable({ data: undefined } as never)).toBe(false);

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

  it("keeps the shared Index column pinned left", () => {
    expect(lensPrescriptionGridIndexColumnDef).toMatchObject({
      headerName: "Index",
      pinned: "left",
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

  it("keeps shared grid defaults non-sortable and immovable", () => {
    expect(lensPrescriptionGridDefaultColDef).toEqual({ sortable: false, suppressMovable: true });
  });

  it("keeps the common column order stable for the lens editor", () => {
    expect(createLensPrescriptionCommonColumns({ getGridRow }).map((column) => column.headerName)).toEqual([
      "Surface",
      "Comment",
      "Radius of Curvature",
      "Thickness",
      "Medium",
      "Semi-diam.",
      "Aperture",
      "Asph.",
      "Tilt & Decenter",
      "Diffraction Grating",
    ]);
  });

  it.each([
    ["  -1.25e+2 ", -125],
    ["1e-3", 0.001],
    ["0", 0],
    ["12.34", 12.34],
    ["1e12", 1e12],
    ["1e+12", 1e12],
  ])("parses trimmed finite numeric input %s", (newValue, expected) => {
    expect(numberValueParser({ newValue, oldValue: 7 })).toBe(expected);
  });

  it.each(["", "   ", "+1", ".5", "1.", "1e", "1e+", "1e+3x", "x1", "Infinity", "NaN"]) (
    "preserves the old value for invalid numeric input %s",
    (newValue) => {
      expect(numberValueParser({ newValue, oldValue: 7 })).toBe(7);
    },
  );

  it("preserves the old value when a syntactically valid number is outside finite limits", () => {
    expect(numberValueParser({ newValue: "1e309", oldValue: 7 })).toBe(7);
  });

  it("handles an omitted editor value as invalid input", () => {
    expect(numberValueParser({ newValue: undefined as unknown as string, oldValue: 7 })).toBe(7);
  });

  it("returns the expected value for every row kind in the display columns", () => {
    const value = (column: { valueGetter?: unknown }, data: GridRow | undefined) => {
      if (typeof column.valueGetter !== "function") throw new Error("Expected a value getter");
      return column.valueGetter({ data } as ValueGetterParams<GridRow>);
    };

    expect(value(createSurfaceColumn({ getGridRow }), rows.object)).toBe("Object");
    expect(value(createSurfaceColumn({ getGridRow }), rows.image)).toBe("Image");
    expect(value(createSurfaceColumn({ getGridRow }), rows.surface)).toBe("Stop");
    expect(value(createSurfaceColumn({ getGridRow }), undefined)).toBe("");

    expect(value(createCommentColumn({ getGridRow }), rows.surface)).toBe("Front element");
    expect(value(createCommentColumn({ getGridRow }), rows.object)).toBe("");
    expect(value(createCommentColumn({ getGridRow }), rows.image)).toBe("");
    expect(value(createCommentColumn({ getGridRow }), undefined)).toBe("");

    expect(value(createRadiusOfCurvatureColumn({ getGridRow }), rows.object)).toBeUndefined();
    expect(value(createRadiusOfCurvatureColumn({ getGridRow }), rows.image)).toBe(-8);
    expect(value(createRadiusOfCurvatureColumn({ getGridRow }), rows.surface)).toBe(12);
    expect(value(createRadiusOfCurvatureColumn({ getGridRow }), undefined)).toBeUndefined();

    expect(value(createThicknessColumn({ getGridRow }), rows.object)).toBe(1e10);
    expect(value(createThicknessColumn({ getGridRow }), rows.image)).toBeUndefined();
    expect(value(createThicknessColumn({ getGridRow }), rows.surface)).toBe(2);
    expect(value(createThicknessColumn({ getGridRow }), undefined)).toBeUndefined();

    expect(value(createMediumColumn({ getGridRow }), rows.object)).toBe("air");
    expect(value(createMediumColumn({ getGridRow }), rows.image)).toBeUndefined();
    expect(value(createMediumColumn({ getGridRow }), rows.surface)).toBe("N-BK7");
    expect(value(createMediumColumn({ getGridRow }), undefined)).toBeUndefined();

    const semiDiameter = createSemiDiameterColumn({ getGridRow });
    expect(value(semiDiameter, rows.surface)).toBe(5);
    expect(value(semiDiameter, rows.object)).toBeUndefined();
    expect(value(semiDiameter, rows.image)).toBeUndefined();
    expect(value(semiDiameter, undefined)).toBeUndefined();

    expect(value(createApertureColumn({ getGridRow }), rows.object)).toBeUndefined();
    expect(value(createApertureColumn({ getGridRow }), rows.image)).toBeUndefined();
    expect(value(createApertureColumn({ getGridRow }), undefined)).toBeUndefined();
    expect(value(createAsphericalColumn({ getGridRow }), undefined)).toBeUndefined();
    expect(value(createAsphericalColumn({ getGridRow }), rows.object)).toBeUndefined();
    expect(value(createAsphericalColumn({ getGridRow }), rows.image)).toBeUndefined();
    expect(value(createAsphericalColumn({ getGridRow }), rows.surface)).toEqual(rows.surface.aspherical);
    expect(value(createDecenterColumn({ getGridRow }), rows.object)).toBeUndefined();
    expect(value(createDecenterColumn({ getGridRow }), rows.image)).toEqual(rows.image.decenter);
    expect(value(createDecenterColumn({ getGridRow }), rows.surface)).toEqual(rows.surface.decenter);
    expect(value(createDecenterColumn({ getGridRow }), undefined)).toBeUndefined();
    expect(value(createDiffractionGratingColumn({ getGridRow }), rows.object)).toBeUndefined();
    expect(value(createDiffractionGratingColumn({ getGridRow }), rows.image)).toBeUndefined();
    expect(value(createDiffractionGratingColumn({ getGridRow }), rows.surface)).toEqual(
      rows.surface.diffractiveElement?.diffractionGrating,
    );
    expect(value(createDiffractionGratingColumn({ getGridRow }), undefined)).toBeUndefined();

    const surfaceWithoutGrating = { ...rows.surface, diffractiveElement: undefined } satisfies GridRow;
    expect(value(createDiffractionGratingColumn({ getGridRow }), surfaceWithoutGrating)).toBeUndefined();
  });

  it("enables only supported editable row kinds and forwards edit callbacks", () => {
    const onSurfaceLabelChange = jest.fn();
    const onCommentChange = jest.fn();
    const onRadiusChange = jest.fn();
    const onThicknessChange = jest.fn();
    const onSemiDiameterChange = jest.fn();
    const params = (data: GridRow | undefined) => ({ data } as never);

    const surface = createSurfaceColumn({ getGridRow, onSurfaceLabelChange });
    expect(invokeColumnCallback(surface.editable, params(rows.surface))).toBe(true);
    expect(invokeColumnCallback(surface.editable, params(rows.object))).toBe(false);
    expect(invokeColumnCallback(surface.editable, params(undefined))).toBe(false);
    expect(invokeColumnCallback(surface.valueSetter, { data: rows.surface, newValue: "Default" })).toBe(true);
    expect(onSurfaceLabelChange).toHaveBeenCalledWith(rows.surface, "Default");
    expect(invokeColumnCallback(surface.valueSetter, { data: undefined, newValue: "Default" })).toBe(false);
    expect(invokeColumnCallback(createSurfaceColumn({ getGridRow }).editable, params(rows.surface))).toBe(false);
    expect(invokeColumnCallback(createSurfaceColumn({ getGridRow }).valueSetter, { data: rows.surface, newValue: "Default" })).toBe(false);

    const comment = createCommentColumn({ getGridRow, onCommentChange });
    expect(invokeColumnCallback(comment.editable, params(rows.surface))).toBe(true);
    expect(invokeColumnCallback(comment.editable, params(rows.object))).toBe(false);
    expect(invokeColumnCallback(comment.valueSetter, { data: rows.object, newValue: "ignored" })).toBe(false);
    expect(invokeColumnCallback(comment.valueSetter, { data: undefined, newValue: "ignored" })).toBe(false);
    expect(invokeColumnCallback(comment.valueSetter, { data: rows.surface, newValue: undefined })).toBe(true);
    expect(onCommentChange).toHaveBeenCalledWith(rows.surface, "");
    expect(invokeColumnCallback(comment.editable, params(undefined))).toBe(false);
    expect(invokeColumnCallback(createCommentColumn({ getGridRow }).valueSetter, { data: rows.surface, newValue: "ignored" })).toBe(false);

    const radius = createRadiusOfCurvatureColumn({ getGridRow, onRadiusChange });
    expect(invokeColumnCallback(radius.editable, params(rows.surface))).toBe(true);
    expect(invokeColumnCallback(radius.editable, params(rows.object))).toBe(false);
    expect(invokeColumnCallback(radius.editable, params(undefined))).toBe(false);
    expect(invokeColumnCallback(radius.valueSetter, { data: rows.surface, newValue: 18 })).toBe(true);
    expect(onRadiusChange).toHaveBeenCalledWith(rows.surface, 18);
    expect(invokeColumnCallback(radius.valueSetter, { data: undefined, newValue: 18 })).toBe(false);
    expect(invokeColumnCallback(createRadiusOfCurvatureColumn({ getGridRow }).editable, params(rows.image))).toBe(false);
    expect(invokeColumnCallback(createRadiusOfCurvatureColumn({ getGridRow }).valueSetter, { data: rows.surface, newValue: 18 })).toBe(false);

    const thickness = createThicknessColumn({ getGridRow, onThicknessChange });
    expect(invokeColumnCallback(thickness.editable, params(rows.object))).toBe(true);
    expect(invokeColumnCallback(thickness.editable, params(rows.surface))).toBe(true);
    expect(invokeColumnCallback(thickness.editable, params(rows.image))).toBe(false);
    expect(invokeColumnCallback(thickness.editable, params(undefined))).toBe(false);
    expect(invokeColumnCallback(thickness.valueSetter, { data: rows.surface, newValue: 9 })).toBe(true);
    expect(onThicknessChange).toHaveBeenCalledWith(rows.surface, 9);
    expect(invokeColumnCallback(thickness.valueSetter, { data: undefined, newValue: 9 })).toBe(false);
    expect(invokeColumnCallback(createThicknessColumn({ getGridRow }).editable, params(rows.surface))).toBe(false);
    expect(invokeColumnCallback(createThicknessColumn({ getGridRow }).valueSetter, { data: rows.surface, newValue: 9 })).toBe(false);

    const semiDiameter = createSemiDiameterColumn({ getGridRow, onSemiDiameterChange });
    expect(invokeColumnCallback(semiDiameter.editable, params(rows.surface))).toBe(true);
    expect(invokeColumnCallback(semiDiameter.editable, params(rows.object))).toBe(false);
    expect(invokeColumnCallback(semiDiameter.editable, params(rows.image))).toBe(false);
    expect(invokeColumnCallback(semiDiameter.editable, params(undefined))).toBe(false);
    expect(invokeColumnCallback(semiDiameter.valueSetter, { data: rows.surface, newValue: 6 })).toBe(true);
    expect(onSemiDiameterChange).toHaveBeenCalledWith(rows.surface, 6);
    expect(invokeColumnCallback(semiDiameter.valueSetter, { data: undefined, newValue: 6 })).toBe(false);
    expect(invokeColumnCallback(createSemiDiameterColumn({ getGridRow }).editable, params(rows.surface))).toBe(false);
    expect(invokeColumnCallback(createSemiDiameterColumn({ getGridRow, semiDiameterReadonly: true, onSemiDiameterChange }).editable, params(rows.surface))).toBe(false);
    expect(createSurfaceColumn({ getGridRow }).cellEditorParams).toEqual({ values: ["Default", "Stop"] });
  });

  it("applies the semi-diameter style for manual, automatic, rectangular, and missing rows", () => {
    const rectangular = {
      ...rows.surface,
      clear_aperture: { shape: "rectangular", xHalfWidth: 4, yHalfWidth: 2, rotation: 0, offsetX: 0, offsetY: 0 },
    } satisfies GridRow;
    const manual = createSemiDiameterColumn({ getGridRow });
    const automatic = createSemiDiameterColumn({ getGridRow, semiDiameterReadonly: true });
    const style = (column: { cellStyle?: unknown }, data: GridRow | undefined) => {
      if (typeof column.cellStyle !== "function") throw new Error("Expected a cell style callback");
      return column.cellStyle({ data } as never);
    };

    expect(style(manual, rows.surface)).toBeUndefined();
    expect(style(manual, rectangular)).toEqual({ opacity: 0.5 });
    expect(style(automatic, rows.surface)).toEqual({ opacity: 0.5 });
    expect(style(manual, rows.object)).toEqual({ opacity: 0.5 });
    expect(style(manual, rows.image)).toEqual({ opacity: 0.5 });
    expect(style(manual, undefined)).toEqual({ opacity: 0.5 });

    const computedObjectValue = createSemiDiameterColumn({
      getGridRow,
      semiDiameterReadonly: true,
      computedSemiDiameters: { "row-object": 99 },
    });
    expect(invokeColumnCallback(computedObjectValue.valueGetter, { data: rows.object })).toBeUndefined();
  });

  it("renders action cells only for supported rows and invokes each modal callback", () => {
    const actions = [
      {
        create: createMediumColumn,
        callback: "onOpenMediumModal" as const,
        name: "Edit medium",
        options: { getGridRow, tooltipText: "Medium help" },
        row: rows.surface,
        unsupported: rows.image,
      },
      {
        create: createApertureColumn,
        callback: "onOpenApertureModal" as const,
        name: "Edit aperture",
        options: { getGridRow, tooltipText: "Aperture help" },
        row: rows.surface,
        unsupported: rows.object,
      },
      {
        create: createAsphericalColumn,
        callback: "onOpenAsphericalModal" as const,
        name: "Edit aspherical parameters",
        options: { getGridRow, tooltipText: "Asphere help" },
        row: rows.surface,
        unsupported: rows.object,
      },
      {
        create: createDecenterColumn,
        callback: "onOpenDecenterModal" as const,
        name: "Edit decenter and tilt",
        options: { getGridRow, tooltipText: "Decenter help" },
        row: rows.image,
        unsupported: rows.object,
      },
      {
        create: createDiffractionGratingColumn,
        callback: "onOpenDiffractionGratingModal" as const,
        name: "Edit diffraction grating",
        options: { getGridRow, tooltipText: "Grating help" },
        row: rows.surface,
        unsupported: rows.object,
      },
    ] as const;

    for (const action of actions) {
      const callback = jest.fn();
      const column = action.create({ ...action.options, [action.callback]: callback } as never);
      expect(column.cellRenderer?.({ data: undefined } as never)).toBeUndefined();
      expect(column.cellRenderer?.({ data: action.unsupported } as never)).toBeUndefined();
      expect(action.create(action.options as never).cellRenderer?.({ data: action.row } as never)).toBeUndefined();
      const element = column.cellRenderer?.({ data: action.row } as never);
      expect(element).toBeDefined();
      const { container } = render(element as React.ReactElement);
      fireEvent.click(container.querySelector("[data-cell-wrapper]")!);
      fireEvent.click(screen.getByRole("button", { name: action.name }));
      expect(callback).toHaveBeenCalledWith(action.row);
      expect(callback).toHaveBeenCalledTimes(2);
    }
  });
});
