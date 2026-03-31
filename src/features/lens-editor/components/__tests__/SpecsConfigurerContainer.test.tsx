import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { SpecsConfigurerContainer } from "@/features/lens-editor/components/SpecsConfigurerContainer";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/features/lens-editor/stores/specsConfigurerStore";
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
  const store = createStore<SpecsConfigurerState>(createSpecsConfigurerSlice);
  store.getState().loadFromSpecs(testSpecs);
  return store;
}

describe("SpecsConfigurerContainer", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the panel with System Aperture section", () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    expect(screen.getByText("System Aperture")).toBeInTheDocument();
  });

  it("renders the panel with Field section", () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("renders the panel with Wavelengths section", () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    expect(screen.getByText("Wavelengths")).toBeInTheDocument();
  });

  it("initializes aperture dropdown from store", () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
    expect(dropdown.value).toBe("object:epd");
  });

  it("initializes aperture value from store", () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    const input = screen.getByLabelText("Aperture value") as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it("opens field modal when field button is clicked", async () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    const btn = screen.getByRole("button", { name: /field/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes field modal when Cancel is clicked", async () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    const btn = screen.getByRole("button", { name: /field/i });
    await userEvent.click(btn);

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens wavelength modal when wavelength button is clicked", async () => {
    render(<SpecsConfigurerContainer store={createTestStore()} />);
    const btn = screen.getByRole("button", { name: /wavelength/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("store reflects changes after user edits aperture value", async () => {
    const store = createTestStore();
    render(<SpecsConfigurerContainer store={store} />);

    const input = screen.getByLabelText("Aperture value") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "50");
    // Trigger blur to commit
    await userEvent.tab();

    const specs = store.getState().toOpticalSpecs();
    expect(specs.pupil.value).toBe(50);
  });
});
