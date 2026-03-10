import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import type { Surfaces } from "@/lib/opticalModel";

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

describe("LensPrescriptionContainer", () => {
  it("renders the grid", () => {
    render(<LensPrescriptionContainer store={createTestStore()} />);
    expect(screen.getByTestId("ag-grid-mock")).toBeInTheDocument();
  });

  it("renders Export JSON button with primary button styling", () => {
    render(<LensPrescriptionContainer store={createTestStore()} />);
    const btn = screen.getByText("Export JSON");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("rounded-lg", "bg-blue-600");
  });

  it("renders rows from store (object + 2 surfaces + image)", () => {
    render(<LensPrescriptionContainer store={createTestStore()} />);
    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("adds a row when '+' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} />);
    const addButtons = screen.getAllByRole("button", { name: "Insert row" });

    await userEvent.click(addButtons[1]); // '+' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("deletes a row when '-' is clicked on a surface row", async () => {
    render(<LensPrescriptionContainer store={createTestStore()} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete row" });

    await userEvent.click(deleteButtons[0]); // '-' on first surface row

    const rows = screen.getByTestId("ag-grid-mock").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });

  it("store reflects current surfaces", () => {
    const store = createTestStore();
    render(<LensPrescriptionContainer store={store} />);
    const surfaces = gridRowsToSurfaces(store.getState().rows);
    expect(surfaces.surfaces).toHaveLength(2);
    expect(surfaces.surfaces[0].curvatureRadius).toBe(50);
  });
});
