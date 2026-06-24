import React from "react";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { LensPrescriptionContainer } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { IMAGE_ROW_ID } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Surfaces, OpticalModel } from "@/shared/lib/types/opticalModel";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import {
  GlassCatalogContext,
  type GlassCatalogContextValue,
} from "@/shared/components/providers/GlassCatalogProvider";

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

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const testSurfaces: Surfaces = {
  object: { distance: 1e10, medium: "air", manufacturer: "" },
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

const glassCatalogContextValue: GlassCatalogContextValue = {
  catalogs: {
    CDGM: {},
    Hikari: {},
    Hoya: {},
    Ohara: {},
    Schott: {
      "N-BK7": {
        refractiveIndexD: 1.5168,
        refractiveIndexE: 1.519,
        abbeNumberD: 64.17,
        abbeNumberE: 63.96,
        partialDispersions: { P_F_d: 0.41, P_F_e: 0.4, P_g_F: 0.5349 },
        dispersionCoeffKind: "Sellmeier3T",
        dispersionCoeffs: [1, 2, 3, 4, 5, 6],
      },
      "N-SF6": {
        refractiveIndexD: 1.80518,
        refractiveIndexE: 1.8163,
        abbeNumberD: 25.36,
        abbeNumberE: 25.2,
        partialDispersions: { P_F_d: 0.305, P_F_e: 0.298, P_g_F: 0.6439 },
        dispersionCoeffKind: "Sellmeier3T",
        dispersionCoeffs: [1, 2, 3, 4, 5, 6],
      },
      F2: {
        refractiveIndexD: 1.62,
        refractiveIndexE: 1.63,
        abbeNumberD: 36.37,
        abbeNumberE: 36.1,
        partialDispersions: { P_F_d: 0.58, P_F_e: 0.57, P_g_F: 0.64 },
        dispersionCoeffKind: "Sellmeier3T",
        dispersionCoeffs: [1, 2, 3, 4, 5, 6],
      },
    },
    Sumita: {},
    Special: {
      CaF2: {
        refractiveIndexD: 1.4338,
        refractiveIndexE: 1.437,
        abbeNumberD: 95.1,
        abbeNumberE: 94.3,
        partialDispersions: { P_F_d: 0.702, P_F_e: 0.456, P_g_F: 0.552 },
        dispersionCoeffKind: "Sellmeier3T",
        dispersionCoeffs: [1, 2, 3, 4, 5, 6],
      },
    },
  },
  lookupMaps: undefined,
  error: undefined,
  isLoaded: true,
  isLoading: false,
  preload: jest.fn(),
};

function renderLPC(store: ReturnType<typeof createTestStore> = createTestStore()) {
  return {
    ...render(
      <GlassCatalogContext.Provider value={glassCatalogContextValue}>
        <LensEditorStoreContext.Provider value={store}>
          <LensPrescriptionContainer
            getOpticalModel={getOpticalModel}
          />
        </LensEditorStoreContext.Provider>
      </GlassCatalogContext.Provider>
    ),
    store,
  };
}

describe("LensPrescriptionContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the grid", () => {
    renderLPC();
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("does not render config action buttons moved to LensEditor", () => {
    renderLPC();
    expect(screen.queryByRole("button", { name: "Update System" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load Config" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download Config" })).not.toBeInTheDocument();
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

    await userEvent.clear(screen.getByLabelText("Glass"));
    await userEvent.type(screen.getByLabelText("Glass"), "N-SF6");
    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute(
      "href",
      "/glass-map?source=medium-selector&catalog=Schott&glass=N-SF6",
    );
    expect(surfaceRow.medium).toBe("N-BK7");

    unmount();
    renderLPC(store);

    expect(screen.getByLabelText("Glass")).toHaveValue("N-SF6");
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

    await userEvent.clear(screen.getByLabelText("Glass"));
    await userEvent.type(screen.getByLabelText("Glass"), "N-SF6");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updatedRow = store.getState().rows.find((row) => row.id === surfaceRow.id);
    expect(updatedRow?.kind === "surface" ? updatedRow.medium : undefined).toBe("N-SF6");
    expect(store.getState().pendingMediumSelection).toBeUndefined();
    expect(store.getState().mediumModal.open).toBe(false);
  });

  it("pre-populates MediumSelectorModal with object row medium values", () => {
    const { store } = renderLPC();

    act(() => {
      store.getState().openMediumModal(store.getState().rows[0].id);
    });

    expect(screen.getByLabelText("Manufacturer")).toHaveValue("Special");
    expect(screen.getByLabelText("Glass")).toHaveValue("air");
  });

  it("commits the pending glass selection into the object row when MediumSelectorModal confirm is clicked", async () => {
    const { store } = renderLPC();

    act(() => {
      store.getState().openMediumModal(store.getState().rows[0].id);
    });

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");
    await userEvent.clear(screen.getByLabelText("Glass"));
    await userEvent.type(screen.getByLabelText("Glass"), "N-SF6");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updatedRow = store.getState().rows.find((row) => row.id === store.getState().rows[0].id);
    expect(updatedRow?.kind === "object" ? updatedRow.medium : undefined).toBe("N-SF6");
    expect(updatedRow?.kind === "object" ? updatedRow.manufacturer : undefined).toBe("Schott");
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

  it("pre-populates AsphericalModal with existing RadialPolynomial data", () => {
    const store = createTestStore();
    const rowId = store.getState().rows.find((row) => row.kind === "surface")!.id;
    store.getState().updateRow(rowId, {
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -1.25,
        polynomialCoefficients: [0.001, 0.0002],
      },
    });

    renderLPC(store);

    act(() => {
      store.getState().openAsphericalModal(rowId);
    });

    expect(screen.getByLabelText("Type")).toHaveValue("RadialPolynomial");
    expect(screen.getByLabelText("Conic constant")).toHaveValue("-1.25");
    expect(screen.getByLabelText("radial-a1")).toHaveValue("0.001");
    expect(screen.getByLabelText("radial-a2")).toHaveValue("0.0002");
  });

  it("pre-populates AsphericalModal with existing XToroid data", () => {
    const store = createTestStore();
    const rowId = store.getState().rows.find((row) => row.kind === "surface")!.id;
    store.getState().updateRow(rowId, {
      aspherical: {
        kind: "XToroid",
        conicConstant: -0.75,
        toricSweepRadiusOfCurvature: 42,
        polynomialCoefficients: [0.001],
      },
    });

    renderLPC(store);

    act(() => {
      store.getState().openAsphericalModal(rowId);
    });

    expect(screen.getByLabelText("Type")).toHaveValue("XToroid");
    expect(screen.getByLabelText("Toroid sweep radius of curvature")).toHaveValue("42");
  });

  it("saves XToroid data to the store when AsphericalModal confirm is clicked", async () => {
    const { store } = renderLPC();
    const rowId = store.getState().rows.find((row) => row.kind === "surface")!.id;

    act(() => {
      store.getState().openAsphericalModal(rowId);
    });

    await userEvent.selectOptions(screen.getByLabelText("Type"), "XToroid");
    await userEvent.clear(screen.getByLabelText("Conic constant"));
    await userEvent.type(screen.getByLabelText("Conic constant"), "-0.5");
    await userEvent.clear(screen.getByLabelText("Toroid sweep radius of curvature"));
    await userEvent.type(screen.getByLabelText("Toroid sweep radius of curvature"), "15");
    await userEvent.clear(screen.getByLabelText("x-toroid-a2"));
    await userEvent.type(screen.getByLabelText("x-toroid-a2"), "0.001");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updatedRow = store.getState().rows.find((row) => row.id === rowId);
    expect(updatedRow).toEqual(
      expect.objectContaining({
        aspherical: {
          kind: "XToroid",
          conicConstant: -0.5,
          toricSweepRadiusOfCurvature: 15,
          polynomialCoefficients: [0.001],
        },
      })
    );
  });

  it("saves YToroid data with invalid toroid sweep radius as 0", async () => {
    const { store } = renderLPC();
    const rowId = store.getState().rows.find((row) => row.kind === "surface")!.id;

    act(() => {
      store.getState().openAsphericalModal(rowId);
    });

    await userEvent.selectOptions(screen.getByLabelText("Type"), "YToroid");
    await userEvent.clear(screen.getByLabelText("Toroid sweep radius of curvature"));
    await userEvent.type(screen.getByLabelText("Toroid sweep radius of curvature"), "oops");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updatedRow = store.getState().rows.find((row) => row.id === rowId);
    expect(updatedRow).toEqual(
      expect.objectContaining({
        aspherical: {
          kind: "YToroid",
          conicConstant: 0,
          toricSweepRadiusOfCurvature: 0,
          polynomialCoefficients: [],
        },
      })
    );
  });

  it("renders DiffractionGratingModal when diffractionGratingModal is open", () => {
    const { store } = renderLPC();

    act(() => {
      const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
      store.getState().openDiffractionGratingModal(rowId);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Diffraction Grating")).toBeInTheDocument();
  });

  it("saves diffraction grating data and closes modal when Confirm is clicked", async () => {
    const { store } = renderLPC();
    const surfaceRow = store.getState().rows.find((r) => r.kind === "surface")!;

    act(() => {
      store.getState().openDiffractionGratingModal(surfaceRow.id);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(store.getState().diffractionGratingModal.open).toBe(false);
    const updatedRow = store.getState().rows.find((r) => r.id === surfaceRow.id);
    expect(updatedRow?.kind === "surface" && updatedRow.diffractionGrating).toEqual({
      lpmm: 1000,
      order: 1,
    });
  });

  it("removes diffraction grating and closes modal when Remove is clicked", async () => {
    const store = createTestStore();
    const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
    store.getState().updateRow(rowId, {
      diffractionGrating: { lpmm: 1200, order: 1 },
    });

    renderLPC(store);

    act(() => {
      store.getState().openDiffractionGratingModal(rowId);
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(store.getState().diffractionGratingModal.open).toBe(false);
    const updatedRow = store.getState().rows.find((r) => r.id === rowId);
    expect(updatedRow?.kind === "surface" && updatedRow.diffractionGrating).toBeUndefined();
  });

  // --- Export Python Script ---
  it("renders 'Export Python Script' button", () => {
    renderLPC();
    expect(screen.getByRole("button", { name: "Export Python Script" })).toBeInTheDocument();
  });

  it("renders Formatting beside Export Python Script", () => {
    renderLPC();
    const toolbar = screen.getByRole("toolbar", { name: "Grid toolbar" });

    expect(within(toolbar).getByRole("button", { name: "Export Python Script" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Formatting" })).toBeInTheDocument();
  });

  it("opens Formatting modal and does not close it on backdrop click", async () => {
    renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    expect(screen.getByRole("dialog", { name: "Formatting" })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.getByRole("dialog", { name: "Formatting" })).toBeInTheDocument();
  });

  it("closes Formatting modal when Cancel is clicked", async () => {
    renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Formatting" })).not.toBeInTheDocument();
  });

  it("shows Factor in Scale mode and hides it in Reverse mode", async () => {
    renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    expect(screen.getByRole("spinbutton", { name: "Factor" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Reverse (also reversing thickness and medium)" }));
    expect(screen.queryByRole("spinbutton", { name: "Factor" })).not.toBeInTheDocument();
  });

  it("restores Scale factor and range after Formatting is cancelled and reopened", async () => {
    renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Factor" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Factor" }), "2.5");
    await userEvent.selectOptions(screen.getByLabelText("First Surface"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Last Surface"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));

    expect(screen.getByRole("radio", { name: "Scale" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Factor" })).toHaveValue(2.5);
    expect(screen.getByLabelText("First Surface")).toHaveValue("1");
    expect(screen.getByLabelText("Last Surface")).toHaveValue("2");
  });

  it("restores Reverse mode and keeps the previous Scale range after switching back", async () => {
    renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Factor" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Factor" }), "3");
    await userEvent.selectOptions(screen.getByLabelText("First Surface"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Last Surface"), "2");

    await userEvent.click(screen.getByRole("radio", { name: "Reverse (also reversing thickness and medium)" }));
    await userEvent.selectOptions(screen.getByLabelText("First Surface"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Last Surface"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));

    expect(screen.getByRole("radio", { name: "Reverse (also reversing thickness and medium)" })).toBeChecked();
    expect(screen.queryByRole("spinbutton", { name: "Factor" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("First Surface")).toHaveValue("1");
    expect(screen.getByLabelText("Last Surface")).toHaveValue("1");

    await userEvent.click(screen.getByRole("radio", { name: "Scale" }));

    expect(screen.getByRole("spinbutton", { name: "Factor" })).toHaveValue(3);
    expect(screen.getByLabelText("First Surface")).toHaveValue("1");
    expect(screen.getByLabelText("Last Surface")).toHaveValue("2");
  });

  it("updates store rows and closes Formatting modal on valid Confirm", async () => {
    const { store } = renderLPC();

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Factor" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Factor" }), "2");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const firstSurface = store.getState().rows.find((row) => row.kind === "surface");
    expect(firstSurface?.kind === "surface" ? firstSurface.curvatureRadius : undefined).toBe(100);
    expect(screen.queryByRole("dialog", { name: "Formatting" })).not.toBeInTheDocument();
  });

  it("opens ErrorModal and leaves rows unchanged when Formatting overflows", async () => {
    const store = createTestStore();
    const originalRows = store.getState().rows;
    const firstSurface = originalRows.find((row) => row.kind === "surface");
    if (firstSurface?.kind !== "surface") {
      throw new Error("Expected a surface row");
    }
    store.getState().updateRow(firstSurface.id, { curvatureRadius: Number.MAX_VALUE });
    const rowsBeforeFormatting = store.getState().rows;

    renderLPC(store);

    await userEvent.click(screen.getByRole("button", { name: "Formatting" }));
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Factor" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Factor" }), "2");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("dialog", { name: "Error" })).toBeInTheDocument();
    expect(store.getState().rows).toBe(rowsBeforeFormatting);
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
  it("renders switch with 'Manual' text and visible 'Set auto semi-diameter:' label initially", () => {
    renderLPC();
    expect(screen.getByText("Set auto semi-diameter:")).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Set auto semi-diameter" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveTextContent("Manual");
  });

  it("clicking switch changes text to 'Auto'", async () => {
    renderLPC();
    const toggle = screen.getByRole("switch", { name: "Set auto semi-diameter" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveTextContent("Auto");
  });

  it("clicking switch twice reverts to 'Manual'", async () => {
    renderLPC();
    const toggle = screen.getByRole("switch", { name: "Set auto semi-diameter" });
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveTextContent("Manual");
  });

  // --- Toolbar tooltip tests ---

  it("Export Python Script button has a tooltip with correct text", () => {
    renderLPC();
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.some((t) => t.textContent === "Generate a Python script")).toBe(true);
  });
});
