import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShellProvider } from "@/app/AppShellContext";
import { GlassMapStoreProvider, useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { ImportCustomGlassStoreProvider, useImportCustomGlassStore } from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";
import ImportCustomGlassPage from "@/features/import-custom-glass/ImportCustomGlassPage";
import type { UserDefinedGlassData } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { useEffect, type ReactNode } from "react";

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

jest.mock("@/features/import-custom-glass/lib/customGlassStorage", () => ({
  deletePersistedCustomGlasses: jest.fn().mockResolvedValue(undefined),
  upsertPersistedCustomGlass: jest.fn().mockResolvedValue(undefined),
  upsertPersistedCustomGlasses: jest.fn().mockResolvedValue(undefined),
}));

const customGlassStorageMock = jest.requireMock("@/features/import-custom-glass/lib/customGlassStorage") as {
  readonly deletePersistedCustomGlasses: jest.Mock<Promise<void>, [readonly string[]]>;
  readonly upsertPersistedCustomGlass: jest.Mock<Promise<void>, [{ readonly name: string; readonly pairs: readonly (readonly [number, number])[] }]>;
  readonly upsertPersistedCustomGlasses: jest.Mock<Promise<void>, [readonly { readonly name: string; readonly pairs: readonly (readonly [number, number])[] }[]]>;
};
const mockDeletePersistedCustomGlasses = customGlassStorageMock.deletePersistedCustomGlasses;
const mockUpsertPersistedCustomGlasses = customGlassStorageMock.upsertPersistedCustomGlasses;
const mockUpsertPersistedCustomGlass = customGlassStorageMock.upsertPersistedCustomGlass;

const customGlass: UserDefinedGlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_fe: 0.4, P_Fd: 0.41, P_gF: 0.5349 },
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: [[587.56, 1.5168]],
};

const importedGlass: UserDefinedGlassData = {
  ...customGlass,
  refractiveIndexD: 1.7,
  abbeNumberD: 45.2,
};

function SeedCatalogs({ children }: { readonly children: ReactNode }) {
  const store = useGlassMapStore();

  useEffect(() => {
    store.getState().setCatalogsData({
      Custom: {
        CUSTOM_A: customGlass,
        CUSTOM_B: importedGlass,
      },
    });
  }, [store]);

  return <>{children}</>;
}

function renderPage(proxy?: Partial<PyodideWorkerAPI>, seedTableState?: true) {
  function SeedTableState({ children }: { readonly children: ReactNode }) {
    const store = useImportCustomGlassStore();

    useEffect(() => {
      if (seedTableState === true) {
        store.getState().setSortState([{ colId: "label", sort: "asc" }]);
        store.getState().setFilterModel({
          nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
        });
      }
    }, [store]);

    return <>{children}</>;
  }

  return render(
    <ThemeProvider>
      <AppShellProvider
        value={{
          proxy: proxy as PyodideWorkerAPI | undefined,
          isReady: true,
          openErrorModal: jest.fn(),
        }}
      >
        <GlassMapStoreProvider>
          <ImportCustomGlassStoreProvider>
            <SeedCatalogs>
              <SeedTableState>
                <ImportCustomGlassPage />
              </SeedTableState>
            </SeedCatalogs>
          </ImportCustomGlassStoreProvider>
        </GlassMapStoreProvider>
      </AppShellProvider>
    </ThemeProvider>,
  );
}

function makeJsonFile(payload: unknown): File {
  const text = JSON.stringify(payload);
  const file = new File([text], "custom-glass.json", { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: jest.fn().mockResolvedValue(text),
  });
  return file;
}

function makeCsvFile(name: string, text: string): File {
  const file = new File([text], name, { type: "text/csv" });
  Object.defineProperty(file, "text", {
    value: jest.fn().mockResolvedValue(text),
  });
  return file;
}

function expectImportCustomGlassTouchScroll(wrapper: Element | null) {
  expect(wrapper).toHaveClass("import-custom-glass-touch-scroll");

  const styleText = [...(wrapper?.querySelectorAll("style") ?? [])]
    .map((style) => style.textContent ?? "")
    .join("\n");

  expect(styleText).toContain(".import-custom-glass-touch-scroll .ag-header-viewport");
  expect(styleText).toContain(".import-custom-glass-touch-scroll .ag-body-viewport");
  expect(styleText).toContain(".import-custom-glass-touch-scroll .ag-center-cols-viewport");
  expect(styleText).toMatch(/touch-action:\s*pan-x pan-y;/);
  expect(styleText).not.toMatch(/touch-action:\s*pan-y;/);
}

describe("ImportCustomGlassPage", () => {
  beforeEach(() => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenLG");
    mockDeletePersistedCustomGlasses.mockClear();
    mockUpsertPersistedCustomGlass.mockClear();
    mockUpsertPersistedCustomGlasses.mockClear();
    mockDeletePersistedCustomGlasses.mockResolvedValue(undefined);
    mockUpsertPersistedCustomGlass.mockResolvedValue(undefined);
    mockUpsertPersistedCustomGlasses.mockResolvedValue(undefined);
  });

  it("renders the custom glass table as an AG Grid instance", () => {
    renderPage();

    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("suppresses AG Grid touch handling on the readonly custom glass table", () => {
    renderPage();

    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toHaveAttribute("data-suppress-touch", "true");
    expectImportCustomGlassTouchScroll(grid.parentElement);
  });

  it("suppresses AG Grid touch handling on the add/edit coefficient grid", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add Glass" }));

    const grids = screen.getAllByTestId("ag-grid-mock");
    expect(grids).toHaveLength(2);
    expect(grids[1]).toHaveAttribute("data-suppress-touch", "true");
    expectImportCustomGlassTouchScroll(grids[1].parentElement);
  });

  it("adds a blank coefficient row when crypto.randomUUID is unavailable", async () => {
    const originalRandomUUID = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "Add Glass" }));
      const coefficientGrid = screen.getAllByTestId("ag-grid-mock")[1];
      expect(coefficientGrid.querySelectorAll("tbody tr")).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "Add row" }));

      const rows = coefficientGrid.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(1);
      const cells = rows[0].querySelectorAll("td");
      expect(cells[2]).toHaveTextContent("");
      expect(cells[3]).toHaveTextContent("");
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: originalRandomUUID,
      });
    }
  });

  it("does not render a custom glass filter input", () => {
    renderPage();

    expect(screen.queryByLabelText("Filter custom glass")).not.toBeInTheDocument();
  });

  it("sizes the readonly grid columns for selection, label, and optical property columns", () => {
    renderPage();

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");

    expect([...headers].map((header) => header.textContent)).toEqual(["", "Label", "nd", "vd", "ne", "ve", "Pg,F", "PF,e", "PF,d"]);
    expect(headers[0]).toHaveAttribute("data-width", "81");
    expect(headers[1]).toHaveAttribute("data-width", "125");
    for (const header of [...headers].slice(2)) {
      expect(header).toHaveAttribute("data-width", "137");
    }
  });

  it("keeps only readonly data columns sortable and filterable", () => {
    renderPage();

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");

    expect(headers[0]).toHaveAttribute("data-sortable", "false");
    expect(headers[0]).toHaveAttribute("data-filter", "false");
    expect(headers[0]).toHaveAttribute("data-un-sort-icon", "false");
    for (const header of [...headers].slice(1)) {
      expect(header).toHaveAttribute("data-sortable", "true");
      expect(header).toHaveAttribute("data-filter", "true");
      expect(header).toHaveAttribute("data-un-sort-icon", "true");
    }
  });

  it("removes blank filter options from readonly grid data columns", () => {
    renderPage();

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    const expectedTextFilterOptions = "contains,notContains,equals,notEqual,startsWith,endsWith";
    const expectedNumberFilterOptions = "equals,notEqual,greaterThan,greaterThanOrEqual,lessThan,lessThanOrEqual,inRange";

    expect(headers[0]).toHaveAttribute("data-filter", "false");
    expect(headers[0]).not.toHaveAttribute("data-filter-options");
    expect(headers[1]).toHaveAttribute("data-filter-options", expectedTextFilterOptions);
    for (const header of [...headers].slice(2)) {
      expect(header).toHaveAttribute("data-filter-options", expectedNumberFilterOptions);
      expect(header.getAttribute("data-filter-options")?.split(",")).not.toEqual(expect.arrayContaining(["blank", "notBlank"]));
    }
  });

  it("persists readonly table data-column sort and filter changes", async () => {
    renderPage();

    const grid = screen.getByTestId("ag-grid-mock");
    act(() => {
      grid.dispatchEvent(new CustomEvent("mockSortChanged", {
        bubbles: true,
        detail: {
          columnState: [
            { colId: "label", sort: "asc" },
            { colId: "ag-Grid-SelectionColumn", sort: "desc" },
            { colId: "nd", sort: "desc", sortIndex: 1 },
          ],
        },
      }));
      grid.dispatchEvent(new CustomEvent("mockFilterChanged", {
        bubbles: true,
        detail: {
          filterModel: {
            label: { filterType: "text", type: "contains", filter: "CUSTOM" },
            "ag-Grid-SelectionColumn": { filterType: "text", type: "equals", filter: "x" },
            nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
          },
        },
      }));
    });

    await waitFor(() => {
      expect(grid).toHaveAttribute("data-current-column-state", JSON.stringify([
        { colId: "label", sort: "asc" },
        { colId: "nd", sort: "desc", sortIndex: 1 },
      ]));
      expect(grid).toHaveAttribute("data-current-filter-model", JSON.stringify({
        label: { filterType: "text", type: "contains", filter: "CUSTOM" },
        nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
      }));
    });
  });

  it("restores saved readonly table sort and filter state on mount", async () => {
    renderPage(undefined, true);

    const grid = screen.getByTestId("ag-grid-mock");

    await waitFor(() => {
      expect(grid).toHaveAttribute("data-applied-column-state", JSON.stringify({
        state: [{ colId: "label", sort: "asc" }],
        defaultState: {},
      }));
      expect(grid).toHaveAttribute("data-current-filter-model", JSON.stringify({
        nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
      }));
    });
  });

  it("renders readonly optical property values with six decimal places", () => {
    renderPage();

    expect(screen.getByText("1.516800")).toBeInTheDocument();
    expect(screen.getByText("64.170000")).toBeInTheDocument();
    expect(screen.getAllByText("1.519000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("63.960000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.534900").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.400000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.410000").length).toBeGreaterThan(0);
  });

  it("selects and clears every custom glass row from the header checkbox", async () => {
    const user = userEvent.setup();
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    renderPage({ deleteUserDefinedGlasses });

    const headerCheckbox = screen.getByRole("checkbox", { name: "Select all custom glasses" });
    const customA = screen.getByRole("checkbox", { name: "Select CUSTOM_A" });
    const customB = screen.getByRole("checkbox", { name: "Select CUSTOM_B" });

    expect(headerCheckbox).not.toBeChecked();
    expect(customA).not.toBeChecked();
    expect(customB).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Delete Glass" })).toBeDisabled();

    await user.click(headerCheckbox);

    expect(headerCheckbox).toBeChecked();
    expect(customA).toBeChecked();
    expect(customB).toBeChecked();

    await user.click(headerCheckbox);

    expect(headerCheckbox).not.toBeChecked();
    expect(customA).not.toBeChecked();
    expect(customB).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Delete Glass" })).toBeDisabled();

    await user.click(headerCheckbox);
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteUserDefinedGlasses).toHaveBeenCalledWith(["CUSTOM_A", "CUSTOM_B"]));
  });

  it("renders explicit JSON and CSV import/export button labels", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Import from JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import from CSV Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeInTheDocument();
  });

  it("matches Lens Editor button sizing for toolbar commands on large screens", () => {
    renderPage();

    for (const name of ["Import from JSON", "Import from CSV Files", "Add Glass", "Edit Glass", "Download JSON", "Delete Glass"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("px-3", "py-1.5", "text-sm");
    }
  });

  it("matches Lens Editor button sizing for toolbar commands on small screens", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");

    renderPage();

    for (const name of ["Import from JSON", "Import from CSV Files", "Add Glass", "Edit Glass", "Download JSON", "Delete Glass"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("px-2", "py-1", "text-xs");
    }
  });

  it("matches Lens Editor button sizing for modal commands on large screens", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add Glass" }));

    for (const name of ["Add row", "Cancel", "Confirm"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("px-3", "py-1.5", "text-sm");
    }
  });

  it("matches Lens Editor button sizing for modal commands on small screens", async () => {
    const user = userEvent.setup();
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add Glass" }));

    for (const name of ["Add row", "Cancel", "Confirm"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("px-2", "py-1", "text-xs");
    }
  });

  it("opens a delete modal and waits for Delete before calling the worker", async () => {
    const user = userEvent.setup();
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    renderPage({ deleteUserDefinedGlasses });

    await user.click(screen.getByLabelText("Select CUSTOM_A"));
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));

    expect(screen.getByRole("dialog", { name: "Delete Custom Glass" })).toBeInTheDocument();
    expect(deleteUserDefinedGlasses).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteUserDefinedGlasses).toHaveBeenCalledWith(["CUSTOM_A"]));
  });

  it("deletes persisted custom glasses after the worker delete succeeds", async () => {
    const user = userEvent.setup();
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    renderPage({ deleteUserDefinedGlasses });

    await user.click(screen.getByLabelText("Select CUSTOM_A"));
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockDeletePersistedCustomGlasses).toHaveBeenCalledWith(["CUSTOM_A"]));
    expect(mockDeletePersistedCustomGlasses.mock.invocationCallOrder[0])
      .toBeGreaterThan(deleteUserDefinedGlasses.mock.invocationCallOrder[0]);
  });

  it("shows a persistence warning when deleting from IndexedDB fails after worker delete", async () => {
    const user = userEvent.setup();
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    mockDeletePersistedCustomGlasses.mockRejectedValue(new Error("idb delete failed"));
    renderPage({ deleteUserDefinedGlasses });

    await user.click(screen.getByLabelText("Select CUSTOM_A"));
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("dialog", { name: "Custom Glass Persistence Warning" })).toBeInTheDocument();
    expect(screen.getByText(/idb delete failed/)).toBeInTheDocument();
  });

  it("does not call the worker when delete is canceled", async () => {
    const user = userEvent.setup();
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    renderPage({ deleteUserDefinedGlasses });

    await user.click(screen.getByLabelText("Select CUSTOM_A"));
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteUserDefinedGlasses).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Delete Custom Glass" })).not.toBeInTheDocument();
  });

  it("opens an overwrite modal for import conflicts and waits for Overwrite", async () => {
    const user = userEvent.setup();
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({ CUSTOM_A: importedGlass });
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ updateUserDefinedGlasses, addUserDefinedGlasses });

    const file = makeJsonFile({
      version: "1.0",
      Custom: {
        CUSTOM_A: { type: "tabulated", data: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]] },
      },
    });

    await user.upload(screen.getByLabelText("Import custom glass JSON file"), file);

    expect(screen.getByRole("dialog", { name: "Overwrite Custom Glass" })).toBeInTheDocument();
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => expect(updateUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "CUSTOM_A",
      pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
    }]));
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("does not update or add imported conflicts when overwrite is canceled", async () => {
    const user = userEvent.setup();
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({});
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ updateUserDefinedGlasses, addUserDefinedGlasses });

    const file = makeJsonFile({
      version: "1.0",
      Custom: {
        CUSTOM_A: { type: "tabulated", data: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]] },
      },
    });

    await user.upload(screen.getByLabelText("Import custom glass JSON file"), file);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Overwrite Custom Glass" })).not.toBeInTheDocument();
  });

  it("opens an invalid import modal instead of using a native alert", async () => {
    const user = userEvent.setup();
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => undefined);
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({});
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ updateUserDefinedGlasses, addUserDefinedGlasses });

    const file = makeJsonFile({ invalid: true });

    await user.upload(screen.getByLabelText("Import custom glass JSON file"), file);

    expect(screen.getByRole("dialog", { name: "Invalid Custom Glass JSON" })).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("imports multiple valid CSV files with filename-stem labels", async () => {
    const user = userEvent.setup();
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ LF7: customGlass, SF11: importedGlass });
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ addUserDefinedGlasses, updateUserDefinedGlasses });

    await user.upload(screen.getByLabelText("Import custom glass CSV files"), [
      makeCsvFile("LF7.csv", "wl,n\n0.48613,1.522\n0.54607,1.518\n0.58756,1.5168\n0.65627,1.514\n"),
      makeCsvFile("SF11.csv", "wl,n\n0.48613,1.8\n0.54607,1.79\n0.58756,1.78\n0.65627,1.77\n"),
    ]);

    await waitFor(() => expect(addUserDefinedGlasses).toHaveBeenCalledWith([
      {
        name: "LF7",
        pairs: [[486.13, 1.522], [546.07, 1.518], [587.56, 1.5168], [656.27, 1.514]],
      },
      {
        name: "SF11",
        pairs: [[486.13, 1.8], [546.07, 1.79], [587.56, 1.78], [656.27, 1.77]],
      },
    ]));
    expect(mockUpsertPersistedCustomGlasses).toHaveBeenCalledWith([
      {
        name: "LF7",
        pairs: [[486.13, 1.522], [546.07, 1.518], [587.56, 1.5168], [656.27, 1.514]],
      },
      {
        name: "SF11",
        pairs: [[486.13, 1.8], [546.07, 1.79], [587.56, 1.78], [656.27, 1.77]],
      },
    ]);
    expect(mockUpsertPersistedCustomGlasses.mock.invocationCallOrder[0])
      .toBeGreaterThan(addUserDefinedGlasses.mock.invocationCallOrder[0]);
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("opens the overwrite modal before CSV conflict worker calls", async () => {
    const user = userEvent.setup();
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({ CUSTOM_A: importedGlass });
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ updateUserDefinedGlasses, addUserDefinedGlasses });

    await user.upload(
      screen.getByLabelText("Import custom glass CSV files"),
      makeCsvFile("CUSTOM_A.csv", "wl,n\n0.48613,1.71\n0.54607,1.705\n0.58756,1.7\n0.65627,1.695\n"),
    );

    expect(screen.getByRole("dialog", { name: "Overwrite Custom Glass" })).toBeInTheDocument();
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => expect(updateUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "CUSTOM_A",
      pairs: [[486.13, 1.71], [546.07, 1.705], [587.56, 1.7], [656.27, 1.695]],
    }]));
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("imports valid CSV files and reports rejected CSV files", async () => {
    const user = userEvent.setup();
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ LF7: customGlass });
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ addUserDefinedGlasses, updateUserDefinedGlasses });

    await user.upload(screen.getByLabelText("Import custom glass CSV files"), [
      makeCsvFile("LF7.csv", "wl,n\n0.48613,1.522\n0.54607,1.518\n0.58756,1.5168\n0.65627,1.514\n"),
      makeCsvFile("broken.csv", "wl,n,extra\n0.48613,1.522,ignored\n"),
      makeCsvFile("duplicate.csv", "wl,n\n0.48613,1.522\n0.48613,1.523\n0.58756,1.5168\n0.65627,1.514\n"),
    ]);

    await waitFor(() => expect(addUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "LF7",
      pairs: [[486.13, 1.522], [546.07, 1.518], [587.56, 1.5168], [656.27, 1.514]],
    }]));

    expect(screen.getByRole("dialog", { name: "Rejected Custom Glass CSV Files" })).toBeInTheDocument();
    expect(screen.getByText("broken.csv")).toBeInTheDocument();
    expect(screen.getByText(/exactly two columns/i)).toBeInTheDocument();
    expect(screen.getByText("duplicate.csv")).toBeInTheDocument();
    expect(screen.getByText(/duplicate wavelength/i)).toBeInTheDocument();
  });

  it("reports all-invalid CSV selections without worker calls", async () => {
    const user = userEvent.setup();
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({});
    const updateUserDefinedGlasses = jest.fn().mockResolvedValue({});
    renderPage({ addUserDefinedGlasses, updateUserDefinedGlasses });

    await user.upload(screen.getByLabelText("Import custom glass CSV files"), [
      makeCsvFile("empty.csv", "wl,n\n"),
      makeCsvFile("bad-number.csv", "wl,n\n0.48613,abc\n0.54607,1.518\n0.58756,1.5168\n0.65627,1.514\n"),
    ]);

    expect(screen.getByRole("dialog", { name: "Rejected Custom Glass CSV Files" })).toBeInTheDocument();
    expect(screen.getByText("empty.csv")).toBeInTheDocument();
    expect(screen.getByText(/at least four/i)).toBeInTheDocument();
    expect(screen.getByText("bad-number.csv")).toBeInTheDocument();
    expect(screen.getByText(/numeric/i)).toBeInTheDocument();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
  });
});
