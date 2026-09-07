import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { CustomGlassModal } from "@/features/import-custom-glass/components/CustomGlassModal/CustomGlassModal";
import type { EditablePair } from "@/features/import-custom-glass/types/customGlassImport";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

function makeRows(values: readonly (readonly [string, string])[] = [
  ["486.13", "1.522"],
  ["546.07", "1.518"],
  ["587.56", "1.5168"],
  ["656.27", "1.514"],
]): EditablePair[] {
  return values.map(([wavelength, refractiveIndex], index) => ({
    id: `row-${index}`,
    fraunhofer: "",
    wavelength,
    refractiveIndex,
  }));
}

function renderModal(overrides: Partial<ComponentProps<typeof CustomGlassModal>> = {}) {
  const props: ComponentProps<typeof CustomGlassModal> = {
    mode: "add",
    existingLabels: new Set(),
    initialLabel: "",
    initialRows: makeRows(),
    onCancel: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  return { ...render(<ThemeProvider><CustomGlassModal {...props} /></ThemeProvider>), props };
}

function confirmButton() {
  return screen.getByRole("button", { name: "Confirm" });
}

function coefficientGrid() {
  return screen.getByTestId("ag-grid-mock");
}

describe("CustomGlassModal", () => {
  it("keeps Confirm disabled for a blank label and submits a trimmed unique label", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderModal({ onSubmit });

    expect(screen.getByRole("dialog", { name: "Add Glass" })).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Label" }), "  NEW_GLASS  ");
    expect(confirmButton()).toBeEnabled();

    await user.click(confirmButton());

    expect(onSubmit).toHaveBeenCalledWith("NEW_GLASS", makeRows());
  });

  it("rejects duplicate labels for add mode but permits the unchanged edit label", () => {
    const existingLabels = new Set(["EXISTING"]);

    const addRender = renderModal({ mode: "add", existingLabels, initialLabel: "EXISTING" });
    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText("Label already exists.")).toBeInTheDocument();
    addRender.unmount();

    renderModal({ mode: "edit", existingLabels, initialLabel: "EXISTING" });
    expect(screen.getByRole("dialog", { name: "Edit Glass" })).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByText("Label already exists.")).not.toBeInTheDocument();
  });

  it("rejects an add label that exactly matches an existing label", async () => {
    const user = userEvent.setup();
    renderModal({ mode: "add", existingLabels: new Set(["TARGET"]) });

    await user.type(screen.getByRole("textbox", { name: "Label" }), "TARGET");

    expect(screen.getByText("Label already exists.")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it("rejects a renamed edit that conflicts with another existing label", async () => {
    const user = userEvent.setup();
    renderModal({ mode: "edit", existingLabels: new Set(["TARGET"]), initialLabel: "CURRENT" });

    await user.clear(screen.getByRole("textbox", { name: "Label" }));
    await user.type(screen.getByRole("textbox", { name: "Label" }), " TARGET ");

    expect(screen.getByText("Label already exists.")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it.each([
    ["fewer than four rows", makeRows().slice(0, 3)],
    ["zero wavelength", makeRows([["0", "1.5"], ["546.07", "1.518"], ["587.56", "1.5168"], ["656.27", "1.514"]])],
    ["negative refractive index", makeRows([["486.13", "-1"], ["546.07", "1.518"], ["587.56", "1.5168"], ["656.27", "1.514"]])],
    ["non-finite wavelength", makeRows([["Infinity", "1.5"], ["546.07", "1.518"], ["587.56", "1.5168"], ["656.27", "1.514"]])],
    ["non-finite refractive index", makeRows([["486.13", "NaN"], ["546.07", "1.518"], ["587.56", "1.5168"], ["656.27", "1.514"]])],
  ])("keeps Confirm disabled for %s", (_caseName, initialRows) => {
    renderModal({ initialLabel: "VALID", initialRows });

    expect(confirmButton()).toBeDisabled();
  });

  it("enforces duplicate wavelength validation after trimming values", async () => {
    const user = userEvent.setup();
    const duplicateRows = makeRows([
      ["486.13", "1.522"],
      [" 486.13 ", "1.518"],
      ["587.56", "1.5168"],
      ["656.27", "1.514"],
    ]);
    renderModal({ initialLabel: "VALID", initialRows: duplicateRows });

    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText("Duplicate wavelength rows must be resolved.")).toBeInTheDocument();

    const secondRowWavelength = coefficientGrid().querySelectorAll("tbody tr")[1].querySelectorAll("input")[0];
    await user.clear(secondRowWavelength);
    await user.type(secondRowWavelength, "500");
    await user.keyboard("{Enter}");

    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByText("Duplicate wavelength rows must be resolved.")).not.toBeInTheDocument();
  });

  it("does not treat blank wavelength drafts as duplicate values", () => {
    renderModal({
      initialLabel: "VALID",
      initialRows: makeRows([
        ["", "1.5"],
        ["", "1.6"],
        ["587.56", "1.5168"],
        ["656.27", "1.514"],
      ]),
    });

    expect(screen.queryByText("Duplicate wavelength rows must be resolved.")).not.toBeInTheDocument();
  });

  it("adds and deletes rows while retaining validation state", async () => {
    const user = userEvent.setup();
    renderModal({ initialLabel: "VALID", initialRows: makeRows().slice(0, 3) });

    expect(coefficientGrid().querySelectorAll("tbody tr")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Add row" }));
    expect(coefficientGrid().querySelectorAll("tbody tr")).toHaveLength(4);
    expect(confirmButton()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Delete row row-0" }));
    expect(coefficientGrid().querySelectorAll("tbody tr")).toHaveLength(3);
    expect(confirmButton()).toBeDisabled();
  });

  it("fills Fraunhofer wavelengths and clears the symbol after manual editing", async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      renderModal({ initialLabel: "VALID" });

      const firstRow = coefficientGrid().querySelector("tbody tr");
      if (!(firstRow instanceof HTMLElement)) {
        throw new Error("Expected a first coefficient row.");
      }
      const fraunhofer = within(firstRow).getByRole("combobox", { name: "Fraunhofer" });
      await user.selectOptions(fraunhofer, "d");

      const updatedFirstRow = coefficientGrid().querySelector("tbody tr");
      if (updatedFirstRow === null) {
        throw new Error("Expected the first coefficient row after Fraunhofer selection.");
      }
      const wavelength = updatedFirstRow.querySelectorAll("input")[0];
      expect(wavelength).toHaveValue("587.562");

      await user.clear(wavelength);
      await user.type(wavelength, "600");
      await user.keyboard("{Enter}");

      expect(wavelength).toHaveValue("600");
      const manuallyEditedRow = coefficientGrid().querySelector("tbody tr");
      expect(manuallyEditedRow?.querySelector("select")).toHaveValue("");

      const updatedFraunhofer = updatedFirstRow.querySelector("select");
      if (!(updatedFraunhofer instanceof HTMLSelectElement)) {
        throw new Error("Expected the Fraunhofer selector after manual editing.");
      }
      await user.selectOptions(updatedFraunhofer, "d");
      const selectedFraunhofer = coefficientGrid().querySelector("tbody tr select");
      if (!(selectedFraunhofer instanceof HTMLSelectElement)) {
        throw new Error("Expected the Fraunhofer selector after selecting a line.");
      }
      await user.selectOptions(selectedFraunhofer, "");
      await waitFor(() => expect(coefficientGrid().querySelector("tbody tr input")).toHaveValue("587.562"));
      expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("A component suspended inside an `act` scope"));
    } finally {
      consoleError.mockRestore();
    }
  });

  it("calls onCancel without submitting", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const onSubmit = jest.fn();
    renderModal({ initialLabel: "VALID", onCancel, onSubmit });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
