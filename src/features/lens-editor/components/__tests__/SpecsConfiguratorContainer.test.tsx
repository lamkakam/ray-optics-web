import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { SpecsConfiguratorContainer } from "@/features/lens-editor/components/SpecsConfiguratorContainer";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { OpticalSpecs } from "@/shared/lib/types/opticalModel";

// Mock useTheme — default to light
jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const testSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: {
    space: "object",
    type: "angle",
    maxField: 20,
    fields: [0, 0.7, 1],
    isRelative: true,
  },
  wavelengths: {
    weights: [
      [486.133, 1],
      [587.562, 1],
      [656.273, 1],
    ],
    referenceIndex: 1,
  },
};

function createTestStore() {
  const store = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  store.getState().loadFromSpecs(testSpecs);
  return store;
}

function renderWithContext() {
  const store = createTestStore();
  return (
    render(
      <SpecsConfiguratorStoreContext.Provider value={store}>
        <SpecsConfiguratorContainer />
      </SpecsConfiguratorStoreContext.Provider>
    )
  );
}


describe("SpecsConfiguratorContainer", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the panel with System Aperture section", () => {
    renderWithContext();
    expect(screen.getByText("System Aperture")).toBeInTheDocument();
  });

  it("renders the panel with Field section", () => {
    renderWithContext();
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("renders the panel with Wavelengths section", () => {
    renderWithContext();
    expect(screen.getByText("Wavelengths")).toBeInTheDocument();
  });

  it("initializes aperture dropdown from store", () => {
    renderWithContext();
    const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
    expect(dropdown.value).toBe("object:epd");
  });

  it("initializes aperture value from store", () => {
    renderWithContext();
    const input = screen.getByLabelText("Aperture value") as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it("opens field modal when field button is clicked", async () => {
    renderWithContext();
    const btn = screen.getByRole("button", { name: /field/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes field modal when Cancel is clicked", async () => {
    renderWithContext();
    const btn = screen.getByRole("button", { name: /field/i });
    await userEvent.click(btn);

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens wavelength modal when wavelength button is clicked", async () => {
    renderWithContext();
    const btn = screen.getByRole("button", { name: /wavelength/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("store reflects changes after user edits aperture value", async () => {
    const store = createTestStore();
    render(
      <SpecsConfiguratorStoreContext.Provider value={store}>
        <SpecsConfiguratorContainer />
      </SpecsConfiguratorStoreContext.Provider>
    );

    const input = screen.getByLabelText("Aperture value") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "50");
    // Trigger blur to commit
    await userEvent.tab();

    const specs = store.getState().toOpticalSpecs();
    expect(specs.pupil.value).toBe(50);
  });

  it("stores wide angle mode after applying field modal changes", async () => {
    const store = createTestStore();
    render(
      <SpecsConfiguratorStoreContext.Provider value={store}>
        <SpecsConfiguratorContainer />
      </SpecsConfiguratorStoreContext.Provider>
    );

    await userEvent.click(screen.getByRole("button", { name: /field/i }));
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      })
    );
    await userEvent.click(screen.getByText("Apply"));

    expect(store.getState().isWideAngle).toBe(true);
    expect(store.getState().toOpticalSpecs().field.isWideAngle).toBe(true);
  });
});
