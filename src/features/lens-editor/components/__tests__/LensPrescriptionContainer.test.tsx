import React from "react";
import { render, screen, act, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { LensPrescriptionContainer } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/utils/gridTransform";
import { IMAGE_ROW_ID } from "@/shared/lib/types/gridTypes";
import type { Surfaces, OpticalModel } from "@/shared/lib/types/opticalModel";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { _resetGlassCatalogsResourceForTest } from "@/features/glass-map/glassCatalogsResource";

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const testSurfaces: Surfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      label: "Stop",
      curvatureRadius: -30,
      thickness: 3,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 8,
    },
  ],
};

function createTestStore() {
  const store = createStore<LensEditorState>(createLensEditorSlice);
  store.getState().setRows(surfacesToGridRows(testSurfaces));
  return store;
}

const testOpticalModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  ...testSurfaces,
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

function getOpticalModel(): OpticalModel {
  return testOpticalModel;
}

const onImportJson = jest.fn();

const mockGlassCatalogsProxy: PyodideWorkerAPI = {
  init: jest.fn(),
  getFirstOrderData: jest.fn(),
  plotLensLayout: jest.fn(),
  plotRayFan: jest.fn(),
  plotOpdFan: jest.fn(),
  plotSpotDiagram: jest.fn(),
  plotSurfaceBySurface3rdOrderAberr: jest.fn(),
  plotWavefrontMap: jest.fn(),
  plotGeoPSF: jest.fn(),
  plotDiffractionPSF: jest.fn(),
  get3rdOrderSeidelData: jest.fn(),
  getZernikeCoefficients: jest.fn(),
  focusByMonoRmsSpot: jest.fn(),
  focusByMonoStrehl: jest.fn(),
  focusByPolyRmsSpot: jest.fn(),
  focusByPolyStrehl: jest.fn(),
  getAllGlassCatalogsData: jest.fn().mockResolvedValue({
    CDGM: {},
    Hikari: {},
    Hoya: {},
    Ohara: {},
    Schott: {
      "N-BK7": {
        refractive_index_d: 1.5168,
        refractive_index_e: 1.519,
        abbe_number_d: 64.17,
        abbe_number_e: 63.96,
        partial_dispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.53 },
        dispersion_coeff_kind: "Sellmeier3T",
        dispersion_coeffs: [1, 2, 3, 4, 5, 6],
      },
      "N-SF6": {
        refractive_index_d: 1.80518,
        refractive_index_e: 1.8163,
        abbe_number_d: 25.36,
        abbe_number_e: 25.2,
        partial_dispersions: { P_F_e: 0.298, P_F_d: 0.305, P_g_F: 0.6439 },
        dispersion_coeff_kind: "Sellmeier3T",
        dispersion_coeffs: [1, 2, 3, 4, 5, 6],
      },
    },
    Sumita: {},
    Special: {
      CaF2: {
        refractive_index_d: 1.4338,
        refractive_index_e: 1.436,
        abbe_number_d: 95,
        abbe_number_e: 94,
        partial_dispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.53 },
        dispersion_coeff_kind: "Sellmeier3T",
        dispersion_coeffs: [1, 2, 3, 4, 5, 6],
      },
    },
  }),
};

function renderLPC(store: ReturnType<typeof createTestStore> = createTestStore()) {
  return {
    ...render(
      <LensEditorStoreContext.Provider value={store}>
        <LensPrescriptionContainer
          getOpticalModel={getOpticalModel}
          onImportJson={onImportJson}
          onUpdateSystem={jest.fn()}
          isUpdateSystemDisabled={false}
          glassCatalogsProxy={mockGlassCatalogsProxy}
          glassCatalogsReady={true}
        />
      </LensEditorStoreContext.Provider>
    ),
    store,
  };
}

describe("LensPrescriptionContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetGlassCatalogsResourceForTest();
  });

  it("renders the grid", () => {
    renderLPC();
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders Download Config button", () => {
    renderLPC();
    const btn = screen.getByText("Download Config");
    expect(btn).toBeInTheDocument();
  });

  it("renders rows from store (object + 2 surfaces + image)", () => {
    renderLPC();
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("adds a row when '+' is clicked on a surface row", async () => {
    renderLPC();
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[1]); // '+' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("deletes a row when '-' is clicked on a surface row", async () => {
    renderLPC();
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });

    await userEvent.click(deleteButtons[0]); // '-' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });

  it("store reflects current surfaces", () => {
    const { store } = renderLPC();
    const surfaces = gridRowsToSurfaces(store.getState().rows);
    expect(surfaces.surfaces).toHaveLength(2);
    expect(surfaces.surfaces[0].curvatureRadius).toBe(50);
  });

  it("renders DecenterModal when decenterModal is open", () => {
    const { store } = renderLPC();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
      store.getState().openDecenterModal(rowId);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Tilt & Decenter")).toBeInTheDocument();
  });

  it("closes DecenterModal when Cancel is clicked", async () => {
    const { store } = renderLPC();

    act(() => {
      const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
      store.getState().openDecenterModal(rowId);
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.getState().decenterModal.open).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves decenter data and closes modal when Confirm is clicked", async () => {
    const { store } = renderLPC();
    const surfaceRow = store.getState().rows.find((r) => r.kind === "surface")!;

    act(() => {
      store.getState().openDecenterModal(surfaceRow.id);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(store.getState().decenterModal.open).toBe(false);
    const updatedRow = store.getState().rows.find((r) => r.id === surfaceRow.id);
    expect(updatedRow?.kind === "surface" && updatedRow.decenter).toBeDefined();
  });

  it("removes decenter and closes modal when Remove Decenter is clicked", async () => {
    const store = createTestStore();
    const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
    // Pre-set decenter
    store.getState().updateRow(rowId, {
      decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 5, gamma: 0, offsetX: 1, offsetY: 0 },
    });

    renderLPC(store);

    act(() => {
      store.getState().openDecenterModal(rowId);
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove Decenter" }));
    expect(store.getState().decenterModal.open).toBe(false);
    const updatedRow = store.getState().rows.find((r) => r.id === rowId);
    expect(updatedRow?.kind === "surface" && updatedRow.decenter).toBeUndefined();
  });

  // --- Image row decenter ---
  it("renders DecenterModal when decenterModal is open for image row", () => {
    const { store } = renderLPC();

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Tilt & Decenter")).toBeInTheDocument();
  });

  it("pre-populates modal with existing image row decenter", () => {
    const store = createTestStore();
    store.getState().updateRow(IMAGE_ROW_ID, {
      decenter: { coordinateSystemStrategy: "decenter", alpha: 1.5, beta: 0, gamma: 0, offsetX: 0.1, offsetY: 0.2 },
    });
    renderLPC(store);

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    // alpha field should be pre-filled with 1.5
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toHaveValue("1.5");
  });

  it("saves decenter on image row when Confirm is clicked", async () => {
    const { store } = renderLPC();

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(store.getState().decenterModal.open).toBe(false);
    const imageRow = store.getState().rows.find((r) => r.kind === "image");
    expect(imageRow?.kind === "image" && imageRow.decenter).toBeDefined();
  });

  it("keeps the unconfirmed glass selection after a remount while the medium modal stays open", async () => {
    const { store, unmount } = renderLPC();
    const surfaceRow = store.getState().rows.find((row) => row.kind === "surface");
    if (surfaceRow?.kind !== "surface") {
      throw new Error("Expected a surface row");
    }

    act(() => {
      store.getState().openMediumModal(surfaceRow.id);
    });

    await userEvent.selectOptions(await screen.findByLabelText("Glass"), "N-SF6");
    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute(
      "href",
      "/glass-map?source=medium-selector&catalog=Schott&glass=N-SF6",
    );
    expect(surfaceRow.medium).toBe("N-BK7");

    unmount();
    renderLPC(store);

    expect(await screen.findByLabelText("Glass")).toHaveValue("N-SF6");
    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute(
      "href",
      "/glass-map?source=medium-selector&catalog=Schott&glass=N-SF6",
    );
    const reloadedRow = store.getState().rows.find((row) => row.id === surfaceRow.id);
    expect(reloadedRow?.kind === "surface" ? reloadedRow.medium : undefined).toBe("N-BK7");
  });

  it("commits the pending glass selection when MediumSelectorModal confirm is clicked", async () => {
    const { store } = renderLPC();
    const surfaceRow = store.getState().rows.find((row) => row.kind === "surface");
    if (surfaceRow?.kind !== "surface") {
      throw new Error("Expected a surface row");
    }

    act(() => {
      store.getState().openMediumModal(surfaceRow.id);
    });

    await userEvent.selectOptions(await screen.findByLabelText("Glass"), "N-SF6");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updatedRow = store.getState().rows.find((row) => row.id === surfaceRow.id);
    expect(updatedRow?.kind === "surface" ? updatedRow.medium : undefined).toBe("N-SF6");
    expect(store.getState().pendingMediumSelection).toBeUndefined();
    expect(store.getState().mediumModal.open).toBe(false);
  });

  it("removes decenter from image row when Remove Decenter is clicked", async () => {
    const store = createTestStore();
    store.getState().updateRow(IMAGE_ROW_ID, {
      decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 5, gamma: 0, offsetX: 1, offsetY: 0 },
    });
    renderLPC(store);

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove Decenter" }));
    expect(store.getState().decenterModal.open).toBe(false);
    const imageRow = store.getState().rows.find((r) => r.kind === "image");
    expect(imageRow?.kind === "image" && imageRow.decenter).toBeUndefined();
  });

  // --- Export Python Script ---
  it("renders 'Export Python Script' button", () => {
    renderLPC();
    expect(screen.getByRole("button", { name: "Export Python Script" })).toBeInTheDocument();
  });

  it("clicking 'Export Python Script' opens a dialog with title 'Python Script'", async () => {
    renderLPC();
    await userEvent.click(screen.getByRole("button", { name: "Export Python Script" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Python Script")).toBeInTheDocument();
  });

  it("clicking OK in the Python Script dialog closes it", async () => {
    renderLPC();
    await userEvent.click(screen.getByRole("button", { name: "Export Python Script" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // --- Auto-aperture toggle ---
  it("renders toggle button with 'Manual' text and visible 'Semi-diameter' label initially", () => {
    renderLPC();
    expect(screen.getByText("Semi-diameter")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Semi-diameter" });
    expect(toggle).toHaveTextContent("Manual");
  });

  it("clicking toggle changes text to 'Auto'", async () => {
    renderLPC();
    const toggle = screen.getByRole("button", { name: "Semi-diameter" });
    await userEvent.click(toggle);
    expect(toggle).toHaveTextContent("Auto");
  });

  it("clicking toggle twice reverts to 'Manual'", async () => {
    renderLPC();
    const toggle = screen.getByRole("button", { name: "Semi-diameter" });
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(toggle).toHaveTextContent("Manual");
  });

  // --- Load Config / Save Config ---
  it("renders Load Config button", () => {
    renderLPC();
    expect(screen.getByRole("button", { name: "Load Config" })).toBeInTheDocument();
  });

  it("shows confirmation modal when valid JSON file is selected (not direct call)", async () => {
    renderLPC();

    const validData: OpticalModel = {
      setAutoAperture: "autoAperture",
      specs: testOpticalModel.specs,
      object: testOpticalModel.object,
      image: testOpticalModel.image,
      surfaces: testOpticalModel.surfaces,
    };
    const jsonContent = JSON.stringify(validData);
    const file = new File([jsonContent], "lens.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    // Should show confirmation modal, NOT call onImportJson directly
    expect(onImportJson).not.toHaveBeenCalled();
    const dialog = await waitFor(() => screen.getByRole("dialog"));
    expect(dialog).toBeInTheDocument();
  });

  it("does not call onImportJson if user cancels the import confirmation", async () => {
    renderLPC();

    const validData: OpticalModel = {
      setAutoAperture: "autoAperture",
      specs: testOpticalModel.specs,
      object: testOpticalModel.object,
      image: testOpticalModel.image,
      surfaces: testOpticalModel.surfaces,
    };
    const file = new File([JSON.stringify(validData)], "lens.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onImportJson).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onImportJson after user confirms import", async () => {
    renderLPC();

    const validData: OpticalModel = {
      setAutoAperture: "autoAperture",
      specs: testOpticalModel.specs,
      object: testOpticalModel.object,
      image: testOpticalModel.image,
      surfaces: testOpticalModel.surfaces,
    };
    const file = new File([JSON.stringify(validData)], "lens.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Load" }));

    expect(onImportJson).toHaveBeenCalledWith(validData);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows error dialog when invalid JSON file is selected", async () => {
    renderLPC();

    const file = new File(['{"invalid": true}'], "bad.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    expect(onImportJson).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  // --- Toolbar tooltip tests ---

  it("Load Config button has a tooltip with correct text", () => {
    renderLPC();
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Load a previously downloaded config")).toBe(true);
  });

  it("Download Config button has a tooltip with correct text", () => {
    renderLPC();
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Download current config as JSON")).toBe(true);
  });

  it("Export Python Script button has a tooltip with correct text", () => {
    renderLPC();
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Generate a Python script")).toBe(true);
  });
});
