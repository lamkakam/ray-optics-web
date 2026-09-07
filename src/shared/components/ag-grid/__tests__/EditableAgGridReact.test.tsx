import { render, screen } from "@testing-library/react";
import type { ColDef } from "ag-grid-community";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

  it("commits an Enter edit only once when column definitions rerender", async () => {
    const user = userEvent.setup();
    const valueSetter = jest.fn(() => true);
    const rowData = [{ value: "initial" }];

    function StatefulEditableGrid() {
      const [columnDefinitionsVersion, setColumnDefinitionsVersion] = useState(0);
      const columnDefs = [
        {
          headerName: `Value ${columnDefinitionsVersion}`,
          field: "value",
          editable: true,
          valueSetter,
        },
      ] satisfies ColDef<{ readonly value: string }>[];

      return (
        <>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setColumnDefinitionsVersion((current) => current + 1)}
          >
            Rerender columns
          </button>
          <EditableAgGridReact<{ readonly value: string }>
            rowData={rowData}
            columnDefs={columnDefs}
          />
        </>
      );
    }

    render(<StatefulEditableGrid />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "updated");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Rerender columns" }));

    expect(valueSetter).toHaveBeenCalledTimes(1);
  });
});
