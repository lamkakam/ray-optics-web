import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShellProvider } from "@/app/AppShellContext";
import { GlassMapStoreProvider, useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";
import {
  EMPTY_CUSTOM_GLASSES,
  default as ImportCustomGlassPage,
  getUserDefinedCustomGlasses,
  isUserDefinedGlassAlreadyExistsError,
  saveCustomGlass,
} from "@/features/import-custom-glass/ImportCustomGlassPage";
import type { UserDefinedGlassData } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useEffect, type ReactNode } from "react";

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

function renderPage(proxy?: Partial<PyodideWorkerAPI>) {
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
          <SeedCatalogs>
            <ImportCustomGlassPage />
          </SeedCatalogs>
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

describe("getUserDefinedCustomGlasses", () => {
  it("returns a stable empty object when Custom catalog data is missing", () => {
    expect(getUserDefinedCustomGlasses(undefined)).toBe(EMPTY_CUSTOM_GLASSES);
  });

  it("returns the same Custom catalog reference when every entry is user-defined", () => {
    const customCatalog = { CUSTOM_A: customGlass };

    expect(getUserDefinedCustomGlasses(customCatalog)).toBe(customCatalog);
  });
});

describe("isUserDefinedGlassAlreadyExistsError", () => {
  it("detects worker duplicate user-defined glass errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("ValueError: User-defined glass already exists: test"))).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("KeyError: test"))).toBe(false);
  });
});

describe("saveCustomGlass", () => {
  it("renames edited glass by adding the new worker label and deleting the previous store label", async () => {
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ RENAMED: customGlass });
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    const updateUserDefinedGlasses = jest.fn();
    const getUserDefinedGlasses = jest.fn();
    const upsertCustomGlasses = jest.fn();
    const deleteCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: {
        name: "RENAMED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: {
        addUserDefinedGlasses,
        deleteUserDefinedGlasses,
        updateUserDefinedGlasses,
        getUserDefinedGlasses,
      } as unknown as PyodideWorkerAPI,
      storeActions: {
        upsertCustomGlasses,
        deleteCustomGlasses,
      },
    });

    expect(addUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "RENAMED",
      pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
    }]);
    expect(deleteUserDefinedGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ RENAMED: customGlass });
    expect(deleteCustomGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
  });
});

describe("ImportCustomGlassPage", () => {
  it("renders the custom glass table as an AG Grid instance", () => {
    renderPage();

    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
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

  it("renders explicit JSON and CSV import/export button labels", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Import from JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import from CSV Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeInTheDocument();
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
