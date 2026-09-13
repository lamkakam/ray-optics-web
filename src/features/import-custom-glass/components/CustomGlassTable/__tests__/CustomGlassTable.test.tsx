import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createStore } from "zustand/vanilla";
import { CustomGlassTable } from "@/features/import-custom-glass/components/CustomGlassTable/CustomGlassTable";
import { ImportCustomGlassStoreContext } from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import {
  createImportCustomGlassSlice,
  type ImportCustomGlassStore,
} from "@/features/import-custom-glass/stores/importCustomGlassStore";
import type { CustomGlassRow } from "@/features/import-custom-glass/types/customGlassImport";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

function makeRow(label: string, nd: number): CustomGlassRow {
  const data = {
    refractiveIndexD: nd,
    refractiveIndexE: nd + 0.001,
    abbeNumberD: 60,
    abbeNumberE: 59,
    partialDispersions: { P_fe: 0.4, P_Fd: 0.41, P_gF: 0.53 },
    dispersionCoeffKind: "tabulated" as const,
    dispersionCoeffs: [[587.56, nd]] as const,
  };
  return {
    label,
    nd,
    vd: data.abbeNumberD,
    ne: data.refractiveIndexE,
    ve: data.abbeNumberE,
    pgF: data.partialDispersions.P_gF,
    pFe: data.partialDispersions.P_fe,
    pFd: data.partialDispersions.P_Fd,
    data,
  };
}

const rows = [
  makeRow("ALPHA", 1.5),
  makeRow("BETA", 1.6),
  makeRow("GAMMA", 1.7),
];

function renderTable(
  tableRows: readonly CustomGlassRow[] = rows,
  checked: ReadonlySet<string> = new Set(),
  onCheckedChange: (next: ReadonlySet<string>) => void = jest.fn(),
  store = createStore<ImportCustomGlassStore>(createImportCustomGlassSlice),
) {
  return {
    store,
    ...render(
      <ThemeProvider>
        <ImportCustomGlassStoreContext.Provider value={store}>
          <CustomGlassTable
            rows={tableRows}
            checked={checked}
            onCheckedChange={onCheckedChange}
          />
        </ImportCustomGlassStoreContext.Provider>
      </ThemeProvider>,
    ),
  };
}

function checkbox(label: string) {
  return screen.getByRole("checkbox", { name: label });
}

describe("CustomGlassTable", () => {
  it("tracks row and header selection transitions", async () => {
    const user = userEvent.setup();
    function SelectionHarness() {
      const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
      return (
        <CustomGlassTable
          rows={rows}
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    }

    const store = createStore<ImportCustomGlassStore>(
      createImportCustomGlassSlice,
    );
    render(
      <ThemeProvider>
        <ImportCustomGlassStoreContext.Provider value={store}>
          <SelectionHarness />
        </ImportCustomGlassStoreContext.Provider>
      </ThemeProvider>,
    );

    const header = checkbox("Select all custom glasses");
    await user.click(checkbox("Select ALPHA"));
    expect(checkbox("Select ALPHA")).toBeChecked();
    expect(header).not.toBeChecked();

    await user.click(checkbox("Select BETA"));
    expect(checkbox("Select ALPHA")).toBeChecked();
    expect(checkbox("Select BETA")).toBeChecked();

    await user.click(header);
    expect(header).toBeChecked();
    expect(checkbox("Select GAMMA")).toBeChecked();

    await user.click(header);
    expect(header).not.toBeChecked();
    expect(checkbox("Select ALPHA")).not.toBeChecked();
    expect(checkbox("Select BETA")).not.toBeChecked();
    expect(checkbox("Select GAMMA")).not.toBeChecked();
  });

  it("renders the complete user-facing optical-property header set", () => {
    renderTable();

    const headers = screen
      .getByTestId("ag-grid-mock")
      .querySelectorAll("thead th");
    expect([...headers].slice(1).map((header) => header.textContent)).toEqual([
      "Label",
      "nd",
      "vd",
      "ne",
      "ve",
      "Pg,F",
      "PF,e",
      "PF,d",
    ]);
  });

  it("synchronizes external selection changes into the grid", async () => {
    const { rerender, store } = renderTable(rows, new Set(["ALPHA"]));

    await waitFor(() => expect(checkbox("Select ALPHA")).toBeChecked());
    expect(checkbox("Select BETA")).not.toBeChecked();

    rerender(
      <ThemeProvider>
        <ImportCustomGlassStoreContext.Provider value={store}>
          <CustomGlassTable
            rows={rows}
            checked={new Set(["BETA"])}
            onCheckedChange={jest.fn()}
          />
        </ImportCustomGlassStoreContext.Provider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(checkbox("Select ALPHA")).not.toBeChecked();
      expect(checkbox("Select BETA")).toBeChecked();
    });
  });

  it("reports a replacement selection when the next set has the same size", async () => {
    const user = userEvent.setup();
    const onCheckedChange = jest.fn();
    const checked = new Set(["ALPHA"]);
    const store = createStore<ImportCustomGlassStore>(
      createImportCustomGlassSlice,
    );
    function SelectionHarness() {
      const [, forceRender] = useState(0);
      return (
        <CustomGlassTable
          rows={rows}
          checked={checked}
          onCheckedChange={(next) => {
            onCheckedChange(next);
            checked.clear();
            checked.add("MISSING");
            forceRender((current) => current + 1);
          }}
        />
      );
    }

    render(
      <ThemeProvider>
        <ImportCustomGlassStoreContext.Provider value={store}>
          <SelectionHarness />
        </ImportCustomGlassStoreContext.Provider>
      </ThemeProvider>,
    );

    await waitFor(() => expect(checkbox("Select ALPHA")).toBeChecked());
    await user.click(checkbox("Select ALPHA"));
    await user.click(checkbox("Select BETA"));

    expect(onCheckedChange).toHaveBeenLastCalledWith(new Set(["BETA"]));
  });

  it("does not report a selection change for an empty grid that remains empty", async () => {
    const user = userEvent.setup();
    const onCheckedChange = jest.fn();
    renderTable([], new Set(), onCheckedChange);

    await user.click(checkbox("Select all custom glasses"));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("restores saved sort and filter state and persists updates and clearing", async () => {
    const store = createStore<ImportCustomGlassStore>(
      createImportCustomGlassSlice,
    );
    store.getState().setSortState([{ colId: "label", sort: "asc" }]);
    store.getState().setFilterModel({
      nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
    });
    const { container } = renderTable(rows, new Set(), jest.fn(), store);
    const grid = container.querySelector("[data-testid='ag-grid-mock']");
    if (!(grid instanceof HTMLElement)) {
      throw new Error("Expected the AG Grid mock.");
    }

    await waitFor(() => {
      expect(grid).toHaveAttribute(
        "data-applied-column-state",
        JSON.stringify({
          state: [{ colId: "label", sort: "asc" }],
          defaultState: {},
        }),
      );
      expect(grid).toHaveAttribute(
        "data-current-filter-model",
        JSON.stringify({
          nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
        }),
      );
    });

    act(() => {
      grid.dispatchEvent(
        new CustomEvent("mockSortChanged", {
          bubbles: true,
          detail: {
            columnState: [{ colId: "nd", sort: "desc", sortIndex: 0 }],
          },
        }),
      );
      grid.dispatchEvent(
        new CustomEvent("mockFilterChanged", {
          bubbles: true,
          detail: {
            filterModel: {
              label: { filterType: "text", type: "contains", filter: "A" },
            },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(store.getState().sortState).toEqual([
        { colId: "nd", sort: "desc", sortIndex: 0 },
      ]);
      expect(store.getState().filterModel).toEqual({
        label: { filterType: "text", type: "contains", filter: "A" },
      });
    });

    act(() => {
      grid.dispatchEvent(
        new CustomEvent("mockSortChanged", {
          bubbles: true,
          detail: { columnState: [] },
        }),
      );
      grid.dispatchEvent(
        new CustomEvent("mockFilterChanged", {
          bubbles: true,
          detail: { filterModel: {} },
        }),
      );
    });

    await waitFor(() => {
      expect(store.getState().sortState).toEqual([]);
      expect(store.getState().filterModel).toEqual({});
    });
  });

  it("does not apply empty saved table state on grid ready", async () => {
    const store = createStore<ImportCustomGlassStore>(
      createImportCustomGlassSlice,
    );
    const { container } = renderTable(rows, new Set(), jest.fn(), store);
    const grid = container.querySelector("[data-testid='ag-grid-mock']");
    if (!(grid instanceof HTMLElement)) {
      throw new Error("Expected the AG Grid mock.");
    }

    await waitFor(() => {
      expect(grid).not.toHaveAttribute("data-applied-column-state");
      expect(grid).toHaveAttribute("data-current-filter-model", "{}");
    });
  });

  it("preserves row selection when refreshed rows use the same labels", async () => {
    const { rerender, store } = renderTable(rows, new Set(["ALPHA"]));

    await waitFor(() => expect(checkbox("Select ALPHA")).toBeChecked());

    const refreshedRows = rows.map((row) => ({
      ...row,
      data: { ...row.data },
    }));
    rerender(
      <ThemeProvider>
        <ImportCustomGlassStoreContext.Provider value={store}>
          <CustomGlassTable
            rows={refreshedRows}
            checked={new Set(["ALPHA"])}
            onCheckedChange={jest.fn()}
          />
        </ImportCustomGlassStoreContext.Provider>
      </ThemeProvider>,
    );

    await waitFor(() => expect(checkbox("Select ALPHA")).toBeChecked());
  });
});
