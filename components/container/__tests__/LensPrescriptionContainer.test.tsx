import React from "react";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { IMAGE_ROW_ID } from "@/lib/gridTypes";
import type { Surfaces, OpticalModel, ImportedLensData } from "@/lib/opticalModel";

jest.mock("@/components/ThemeProvider", () => ({
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
      medium: "BK7",
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

describe("LensPrescriptionContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the grid", () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders Export JSON button with primary button styling", () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const btn = screen.getByText("Export JSON");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("rounded-lg", "bg-blue-600");
  });

  it("renders rows from store (object + 2 surfaces + image)", () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("adds a row when '+' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[1]); // '+' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("deletes a row when '-' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });

    await userEvent.click(deleteButtons[0]); // '-' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });

  it("store reflects current surfaces", () => {
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const surfaces = gridRowsToSurfaces(store.getState().rows);
    expect(surfaces.surfaces).toHaveLength(2);
    expect(surfaces.surfaces[0].curvatureRadius).toBe(50);
  });

  it("renders DecenterModal when decenterModal is open", () => {
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
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
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

    act(() => {
      const rowId = store.getState().rows.find((r) => r.kind === "surface")!.id;
      store.getState().openDecenterModal(rowId);
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.getState().decenterModal.open).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves decenter data and closes modal when Confirm is clicked", async () => {
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
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

    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

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
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

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
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    // alpha field should be pre-filled with 1.5
    expect(screen.getByRole("textbox", { name: "Alpha (°)" })).toHaveValue("1.5");
  });

  it("saves decenter on image row when Confirm is clicked", async () => {
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

    act(() => {
      store.getState().openDecenterModal(IMAGE_ROW_ID);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(store.getState().decenterModal.open).toBe(false);
    const imageRow = store.getState().rows.find((r) => r.kind === "image");
    expect(imageRow?.kind === "image" && imageRow.decenter).toBeDefined();
  });

  it("removes decenter from image row when Remove Decenter is clicked", async () => {
    const store = createTestStore();
    store.getState().updateRow(IMAGE_ROW_ID, {
      decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 5, gamma: 0, offsetX: 1, offsetY: 0 },
    });
    render(<LensPrescriptionContainer store={store} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

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
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    expect(screen.getByRole("button", { name: "Export Python Script" })).toBeInTheDocument();
  });

  it("clicking 'Export Python Script' opens a dialog with title 'Python Script'", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    await userEvent.click(screen.getByRole("button", { name: "Export Python Script" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Python Script")).toBeInTheDocument();
  });

  it("clicking OK in the Python Script dialog closes it", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    await userEvent.click(screen.getByRole("button", { name: "Export Python Script" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // --- Auto-aperture toggle ---
  it("renders toggle button with 'Manual' text initially", () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    expect(screen.getByRole("button", { name: "Semi-diameter: Manual" })).toBeInTheDocument();
  });

  it("clicking toggle changes text to 'Auto'", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    await userEvent.click(screen.getByRole("button", { name: "Semi-diameter: Manual" }));
    expect(screen.getByRole("button", { name: "Semi-diameter: Auto" })).toBeInTheDocument();
  });

  it("clicking toggle twice reverts to 'Manual'", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    const toggle = screen.getByRole("button", { name: "Semi-diameter: Manual" });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: "Semi-diameter: Auto" }));
    expect(screen.getByRole("button", { name: "Semi-diameter: Manual" })).toBeInTheDocument();
  });

  // --- Import JSON ---
  it("renders Import JSON button", () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeInTheDocument();
  });

  it("calls onImportJson with parsed data when valid JSON file is selected", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

    const validData: ImportedLensData = {
      setAutoAperture: true,
      specs: testOpticalModel.specs,
      object: testOpticalModel.object,
      image: testOpticalModel.image,
      surfaces: testOpticalModel.surfaces,
    };
    const jsonContent = JSON.stringify(validData);
    const file = new File([jsonContent], "lens.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    expect(onImportJson).toHaveBeenCalledWith(validData);
  });

  it("shows error dialog when invalid JSON file is selected", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} getOpticalModel={getOpticalModel} onImportJson={onImportJson} />);

    const file = new File(['{"invalid": true}'], "bad.json", { type: "application/json" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    expect(onImportJson).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
