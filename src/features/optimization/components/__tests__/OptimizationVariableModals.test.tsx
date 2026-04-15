import React from "react";
import { render, screen } from "@testing-library/react";
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
  it("renders the radius modal and updates variable and pickup fields", async () => {
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

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "41");
    expect(onSetMode).toHaveBeenLastCalledWith(1, { mode: "variable", min: "41", max: "60" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Radius mode" }), "pickup");
    expect(onSetMode).toHaveBeenLastCalledWith(1, {
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "1",
      offset: "0",
    });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the thickness modal and updates pickup fields", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

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
          onClose={jest.fn()}
        />
      );
    }

    render(<ThicknessModalHarness />);

    expect(screen.getByDisplayValue("pickup")).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "2");
    expect(onSetMode).toHaveBeenLastCalledWith(1, {
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "2",
      offset: "0",
    });
  });
});
