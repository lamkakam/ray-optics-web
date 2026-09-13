import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { DecenterOptimizationState } from "@/features/optimization/stores/optimizationStore";
import { TiltDecenterVarModal } from "../TiltDecenterVarModal";

const constant = { mode: "constant" } as const;
const model = { surfaces: [{}, {}], image: {}, object: {}, specs: {} } as OpticalModel;
const state: DecenterOptimizationState = { surfaceIndex: 1, type: "bend", lockedType: false, alpha: constant, beta: constant, gamma: constant, x: constant, y: constant };

describe("TiltDecenterVarModal", () => {
  it("edits independent modes, includes Image pickup sources, and commits only on Confirm", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TiltDecenterVarModal isOpen optimizationModel={model} surfaceIndex={1} decenterState={state} onSave={onSave} onClose={jest.fn()} />);

    expect(screen.getByLabelText("Tilt and decenter type")).toHaveValue("bend");
    await user.selectOptions(screen.getByLabelText("Alpha mode"), "pickup");
    expect(screen.getByLabelText("Alpha source surface")).toHaveTextContent("Image");
    await user.selectOptions(screen.getByLabelText("Beta mode"), "variable");
    expect(screen.getByLabelText("Beta Min.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Beta Max."));
    await user.type(screen.getByLabelText("Beta Max."), "2");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ alpha: expect.objectContaining({ mode: "pickup" }), beta: { mode: "variable", min: "0", max: "2" } }));
  });

  it("locks editor-defined type, omits LM bounds, and resets modes when an editable type changes", async () => {
    const user = userEvent.setup();
    const locked = { ...state, lockedType: true };
    const { rerender } = render(<TiltDecenterVarModal isOpen optimizationModel={model} surfaceIndex={1} decenterState={locked} canUseBounds={false} onSave={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByLabelText("Tilt and decenter type")).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Gamma mode"), "variable");
    expect(screen.queryByLabelText("Gamma Min.")).not.toBeInTheDocument();

    rerender(<TiltDecenterVarModal isOpen optimizationModel={model} surfaceIndex={1} decenterState={{ ...state, alpha: { mode: "variable", min: "-1", max: "1" } }} onSave={jest.fn()} onClose={jest.fn()} />);
    await user.selectOptions(screen.getByLabelText("Tilt and decenter type"), "reverse");
    expect(screen.getByLabelText("Alpha mode")).toHaveValue("constant");
  });
});
