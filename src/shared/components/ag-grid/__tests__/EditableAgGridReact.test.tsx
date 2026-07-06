import { render, screen } from "@testing-library/react";
import type { ColDef } from "ag-grid-community";
import { EditableAgGridReact } from "@/shared/components/ag-grid";

describe("EditableAgGridReact", () => {
  it("defaults AG Grid to commit edits when cells lose focus", () => {
    render(
      <EditableAgGridReact<{ readonly value: number }>
        rowData={[{ value: 1 }]}
        columnDefs={[{ field: "value", editable: true } satisfies ColDef<{ readonly value: number }>]}
      />
    );

    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute(
      "data-stop-editing-when-cells-lose-focus",
      "true",
    );
  });

  it("allows callers to override the focus-loss commit default", () => {
    render(
      <EditableAgGridReact<{ readonly value: number }>
        rowData={[{ value: 1 }]}
        columnDefs={[{ field: "value", editable: true } satisfies ColDef<{ readonly value: number }>]}
        stopEditingWhenCellsLoseFocus={false}
      />
    );

    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute(
      "data-stop-editing-when-cells-lose-focus",
      "false",
    );
  });

  it("does not default AG Grid touch handling to suppressed", () => {
    render(
      <EditableAgGridReact<{ readonly value: number }>
        rowData={[{ value: 1 }]}
        columnDefs={[{ field: "value", editable: true } satisfies ColDef<{ readonly value: number }>]}
      />
    );

    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-suppress-touch", "false");
  });
});
