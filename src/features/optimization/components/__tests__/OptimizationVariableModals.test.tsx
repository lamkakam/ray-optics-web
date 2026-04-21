import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { RadiusModeModal } from "@/features/optimization/components/RadiusModeModal";
import { ThicknessModeModal } from "@/features/optimization/components/ThicknessModeModal";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
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
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 1], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

describe("OptimizationVariableModals", () => {
  it("keeps radius changes local until Confirm is pressed", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();

    function RadiusModalHarness() {
      const [mode, setMode] = React.useState<RadiusMode>({
        surfaceIndex: 1,
        mode: "variable",
        min: "40",
        max: "60",
      });

      const handleSetMode = (surfaceIndex: number, nextMode: RadiusModeDraft) => {
        onSetMode(surfaceIndex, nextMode);
        setMode({ surfaceIndex, ...nextMode } as RadiusMode);
      };

      return (
        <RadiusModeModal
          isOpen
          optimizationModel={model}
          surfaceIndex={1}
          selectedMode={mode}
          onSetMode={handleSetMode}
          onClose={onClose}
        />
      );
    }

    render(<RadiusModalHarness />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("variable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "41");
    expect(screen.getByDisplayValue("41")).toBeInTheDocument();
    expect(onSetMode).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Radius mode" }), "pickup");
    expect(screen.getByDisplayValue("pickup")).toBeInTheDocument();
    expect(onSetMode).not.toHaveBeenCalled();

    const pickupInputs = screen.getAllByRole("textbox");
    await user.clear(pickupInputs[1]);
    await user.type(pickupInputs[1], "2");
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(onSetMode).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSetMode).toHaveBeenCalledTimes(1);
    expect(onSetMode).toHaveBeenLastCalledWith(1, {
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "2",
      offset: "0",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps thickness changes local until Confirm is pressed", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();

    function ThicknessModalHarness() {
      const [mode, setMode] = React.useState<RadiusMode>({
        surfaceIndex: 1,
        mode: "pickup",
        sourceSurfaceIndex: "1",
        scale: "1",
        offset: "0",
      });

      const handleSetMode = (surfaceIndex: number, nextMode: RadiusModeDraft) => {
        onSetMode(surfaceIndex, nextMode);
        setMode({ surfaceIndex, ...nextMode } as RadiusMode);
      };

      return (
        <ThicknessModeModal
          isOpen
          optimizationModel={model}
          surfaceIndex={1}
          selectedMode={mode}
          onSetMode={handleSetMode}
          onClose={onClose}
        />
      );
    }

    render(<ThicknessModalHarness />);

    expect(screen.getByDisplayValue("pickup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "2");
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(onSetMode).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSetMode).toHaveBeenCalledTimes(1);
    expect(onSetMode).toHaveBeenLastCalledWith(1, {
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "2",
      offset: "0",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss the radius modal when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();

    render(
      <RadiusModeModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "variable", min: "40", max: "60" }}
        onSetMode={onSetMode}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Min." }));
    await user.type(screen.getByRole("textbox", { name: "Min." }), "41");

    fireEvent.click(screen.getByTestId("modal-backdrop"));

    expect(onSetMode).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("41")).toBeInTheDocument();
  });

  it("does not dismiss the radius modal when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();
    const outerKeyDown = jest.fn();

    render(
      <div onKeyDown={outerKeyDown}>
        <RadiusModeModal
          isOpen
          optimizationModel={model}
          surfaceIndex={1}
          selectedMode={{ surfaceIndex: 1, mode: "variable", min: "40", max: "60" }}
          onSetMode={onSetMode}
          onClose={onClose}
        />
      </div>,
    );

    await user.clear(screen.getByRole("textbox", { name: "Min." }));
    await user.type(screen.getByRole("textbox", { name: "Min." }), "41");
    await user.keyboard("{Escape}");

    expect(onSetMode).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(outerKeyDown).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("41")).toBeInTheDocument();
  });

  it("cancels thickness draft changes without saving", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();

    render(
      <ThicknessModeModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "pickup", sourceSurfaceIndex: "1", scale: "1", offset: "0" }}
        onSetMode={onSetMode}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Thickness scale" }));
    await user.type(screen.getByRole("textbox", { name: "Thickness scale" }), "2");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSetMode).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows radius guidance for flat-surface bounds in variable mode", () => {
    render(
      <RadiusModeModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "variable", min: "40", max: "60" }}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("R = 0 means a flat surface (infinite radius).")).toBeInTheDocument();
    expect(screen.getByText("Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.")).toBeInTheDocument();
  });

  it("blocks saving radius bounds that straddle zero", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <RadiusModeModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "variable", min: "-10000", max: "10000" }}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Radius variable bounds must stay on one side of 0.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).not.toHaveBeenCalled();
  });

  it("allows saving radius bounds that stay on one side of zero", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();
    const onClose = jest.fn();

    render(
      <RadiusModeModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "variable", min: "-10000", max: "10000" }}
        onSetMode={onSetMode}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Max." }));
    await user.type(screen.getByRole("textbox", { name: "Max." }), "-10");

    expect(screen.queryByText("Radius variable bounds must stay on one side of 0.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      min: "-10000",
      max: "-10",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
