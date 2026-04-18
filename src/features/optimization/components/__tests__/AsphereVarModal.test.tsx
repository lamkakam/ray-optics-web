import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AsphereOptimizationState, AsphereMode } from "@/features/optimization/stores/optimizationStore";
import { AsphereVarModal } from "@/features/optimization/components/AsphereVarModal";

const constantMode: AsphereMode = { mode: "constant" };

function makeState(overrides: Partial<AsphereOptimizationState>): AsphereOptimizationState {
  return {
    surfaceIndex: 1,
    type: undefined,
    lockedType: false,
    conic: constantMode,
    toricSweep: constantMode,
    coefficients: Array.from({ length: 10 }, () => constantMode),
    ...overrides,
  };
}

const defaultProps = {
  isOpen: true,
  surfaceIndex: 1,
  asphereState: makeState({}),
  onSave: jest.fn(),
  onClose: jest.fn(),
};

describe("AsphereVarModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when isOpen=false", () => {
    render(
      <AsphereVarModal
        isOpen={false}
        surfaceIndex={1}
        asphereState={makeState({})}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    render(<AsphereVarModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders type dropdown enabled for unlocked surface", () => {
    render(<AsphereVarModal {...defaultProps} />);
    const typeSelect = screen.getByRole("combobox", { name: "Asphere type" });
    expect(typeSelect).toBeEnabled();
  });

  it("renders type dropdown disabled for locked surface", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical", lockedType: true })}
      />,
    );
    const typeSelect = screen.getByRole("combobox", { name: "Asphere type" });
    expect(typeSelect).toBeDisabled();
  });

  it("shows only Conic Constant row for Conic type", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
      />,
    );
    expect(screen.getByText("Conic Constant")).toBeInTheDocument();
    expect(screen.queryByText("a_2")).not.toBeInTheDocument();
    expect(screen.queryByText("Toroid sweep R")).not.toBeInTheDocument();
  });

  it("shows Conic Constant and even-polynomial coefficient rows for EvenAspherical type", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical" })}
      />,
    );
    expect(screen.getByText("Conic Constant")).toBeInTheDocument();
    expect(screen.getByText("a_2")).toBeInTheDocument();
    expect(screen.getByText("a_20")).toBeInTheDocument();
    expect(screen.queryByText("a_1")).not.toBeInTheDocument();
    expect(screen.queryByText("Toroid sweep R")).not.toBeInTheDocument();
  });

  it("shows Conic Constant and radial coefficient rows for RadialPolynomial type", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "RadialPolynomial" })}
      />,
    );
    expect(screen.getByText("Conic Constant")).toBeInTheDocument();
    expect(screen.getByText("a_1")).toBeInTheDocument();
    expect(screen.getByText("a_10")).toBeInTheDocument();
    // RadialPolynomial uses a_1..a_10 (not a_12/a_20 as in EvenAspherical)
    expect(screen.queryByText("a_12")).not.toBeInTheDocument();
    expect(screen.queryByText("a_20")).not.toBeInTheDocument();
    expect(screen.queryByText("Toroid sweep R")).not.toBeInTheDocument();
  });

  it("shows Conic Constant, Toroid sweep R, and even-polynomial coefficient rows for XToroid type", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "XToroid" })}
      />,
    );
    expect(screen.getByText("Conic Constant")).toBeInTheDocument();
    expect(screen.getByText("Toroid sweep R")).toBeInTheDocument();
    expect(screen.getByText("a_2")).toBeInTheDocument();
    expect(screen.getByText("a_20")).toBeInTheDocument();
  });

  it("shows Conic Constant, Toroid sweep R, and even-polynomial coefficient rows for YToroid type", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "YToroid" })}
      />,
    );
    expect(screen.getByText("Conic Constant")).toBeInTheDocument();
    expect(screen.getByText("Toroid sweep R")).toBeInTheDocument();
    expect(screen.getByText("a_20")).toBeInTheDocument();
  });

  it("selecting variable mode for conic shows Min and Max inputs", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
      />,
    );
    // selects[0] = type selector, selects[1] = conic constant mode
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "variable");
    expect(screen.getByRole("textbox", { name: /min/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /max/i })).toBeInTheDocument();
  });

  it("selecting pickup mode for conic shows source surface, scale, offset but no source coefficient", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
      />,
    );
    // selects[0] = type selector, selects[1] = conic constant mode
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "pickup");
    expect(screen.getByRole("textbox", { name: /source surface index/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /scale/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /offset/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /source coefficient index/i })).not.toBeInTheDocument();
  });

  it("selecting pickup mode for a coefficient row shows source coefficient index input", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical" })}
      />,
    );
    // First combobox is type selector, second is conic mode, then coefficient modes
    const selects = screen.getAllByRole("combobox");
    // selects[0] = type, selects[1] = conic mode, selects[2] = a_2 mode
    await user.selectOptions(selects[2], "pickup");
    expect(screen.getByRole("textbox", { name: /source coefficient index/i })).toBeInTheDocument();
  });

  it("Done button calls onSave with draft state and then onClose", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(
      <AsphereVarModal
        isOpen
        surfaceIndex={1}
        asphereState={makeState({ type: "Conic" })}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ surfaceIndex: 1 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Done button is disabled when variable bounds have min >= max", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "variable");

    const minInput = screen.getByRole("textbox", { name: /min/i });
    const maxInput = screen.getByRole("textbox", { name: /max/i });
    await user.clear(minInput);
    await user.type(minInput, "10");
    await user.clear(maxInput);
    await user.type(maxInput, "5");

    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });

  it("blocks saving toroid sweep variable bounds that straddle zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        surfaceIndex={1}
        asphereState={makeState({
          type: "XToroid",
          toricSweep: { mode: "variable", min: "-10000", max: "10000" },
        })}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("R = 0 means a flat surface (infinite radius).")).toBeInTheDocument();
    expect(screen.getByText("Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.")).toBeInTheDocument();
    expect(screen.getByText("Toroid sweep R variable bounds must stay on one side of 0.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows saving toroid sweep variable bounds that stay on one side of zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        surfaceIndex={1}
        asphereState={makeState({
          type: "XToroid",
          toricSweep: { mode: "variable", min: "-10000", max: "10000" },
        })}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Toroid sweep R Max." }));
    await user.type(screen.getByRole("textbox", { name: "Toroid sweep R Max." }), "-10");

    expect(screen.queryByText("Toroid sweep R variable bounds must stay on one side of 0.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      toricSweep: { mode: "variable", min: "-10000", max: "-10" },
    }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("changing type resets all term modes to constant", async () => {
    const user = userEvent.setup();
    const coefficients = Array.from(
      { length: 10 },
      (_, i): AsphereMode => i === 0 ? { mode: "variable", min: "-1", max: "1" } : { mode: "constant" },
    );
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical", coefficients })}
      />,
    );
    // a_2 row should show Min/Max for variable mode
    expect(screen.getByRole("textbox", { name: /min/i })).toBeInTheDocument();

    // Change type to Conic (resets all)
    const typeSelect = screen.getByRole("combobox", { name: "Asphere type" });
    await user.selectOptions(typeSelect, "Conic");
    // Only Conic Constant remains, no Min/Max inputs
    expect(screen.queryByRole("textbox", { name: /min/i })).not.toBeInTheDocument();
  });
});
