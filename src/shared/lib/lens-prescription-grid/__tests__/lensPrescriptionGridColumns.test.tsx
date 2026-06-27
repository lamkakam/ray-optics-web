import {
  createMediumColumn,
  createSemiDiameterColumn,
  createThicknessColumn,
  LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS,
} from "@/shared/lib/lens-prescription-grid";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

const getGridRow = (row: GridRow) => row;

describe("lens prescription grid column widths", () => {
  it("keeps common prescription column widths in the shared source", () => {
    expect(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS).toMatchObject({
      thickness: 130,
      medium: 115,
      semiDiameter: 115,
    });
  });

  it("applies shared widths to common column builders", () => {
    expect(createThicknessColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.thickness);
    expect(createMediumColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.medium);
    expect(createSemiDiameterColumn({ getGridRow }).width).toBe(LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.semiDiameter);
  });
});
