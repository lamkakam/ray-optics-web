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

  it("sizes the readonly grid columns for selection, label, nd, and vd", () => {
    renderPage();

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");

    expect(headers[0]).toHaveAttribute("data-width", "56");
    expect(headers[1]).toHaveAttribute("data-width", "100");
    expect(headers[2]).toHaveAttribute("data-width", "112");
    expect(headers[3]).toHaveAttribute("data-width", "112");
  });

  it("renders nd and vd values with six decimal places", () => {
    renderPage();

    expect(screen.getByText("1.516800")).toBeInTheDocument();
    expect(screen.getByText("64.170000")).toBeInTheDocument();
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

    await user.upload(screen.getByLabelText("Import custom glass file"), file);

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

    await user.upload(screen.getByLabelText("Import custom glass file"), file);
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

    await user.upload(screen.getByLabelText("Import custom glass file"), file);

    expect(screen.getByRole("dialog", { name: "Invalid Custom Glass JSON" })).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
