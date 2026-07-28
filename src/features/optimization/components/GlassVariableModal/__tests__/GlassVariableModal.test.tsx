import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AllGlassCatalogsData, CatalogGlassData } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { GlassVariableModal } from "@/features/optimization/components/GlassVariableModal/GlassVariableModal";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

function glass(nd: number, vd: number): CatalogGlassData {
  return {
    refractiveIndexD: nd,
    refractiveIndexE: nd + 0.002,
    abbeNumberD: vd,
    abbeNumberE: vd - 0.2,
    partialDispersions: { P_fe: 0.4, P_Fd: 0.6, P_gF: 0.5 },
    dispersionCoeffKind: "Sellmeier3T",
    dispersionCoeffs: [1, 2, 3, 4, 5, 6],
  };
}

const catalogs: AllGlassCatalogsData = {
  CDGM: { "H-ZK1": glass(1.5, 60) },
  Hikari: { "J-BK7A": glass(1.516, 64) },
  Hoya: { BSC7: glass(1.517, 64.2) },
  Ohara: { "S-BSL7": glass(1.5163, 64.1) },
  Schott: {
    "N-BK7": glass(1.5168, 64.17),
    "N-LAK9": glass(1.691, 54.7),
  },
  Sumita: { "K-BK7": glass(1.517, 64.1) },
  Special: {
    air: glass(1, 0),
    REFL: glass(1, 0),
    CaF2: glass(1.4338, 95.2),
    "Fused Silica": glass(1.4585, 67.8),
    Water: glass(1.333, 55.8),
    D263TECO: glass(1.523, 55),
    "Unsupported Special": glass(1.6, 40),
  },
  Custom: {
    CUSTOM_A: glass(1.62, 42),
  },
};

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
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
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

describe("GlassVariableModal", () => {
  it("selects every live glass from the incumbent catalog on the first Variable switch", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select all Hoya candidates" })).not.toBeChecked();
    expect(screen.getAllByRole("checkbox", { name: /Select Schott / })).toHaveLength(2);
    for (const checkbox of screen.getAllByRole("checkbox", { name: /Select Schott / })) {
      expect(checkbox).toBeChecked();
    }

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [
        { catalog: "Schott", name: "N-BK7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });
  });

  it("supports tri-state catalog bulk selection and individual candidate selection", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBePartiallyChecked();

    await user.click(screen.getByRole("checkbox", { name: "Select Hoya BSC7" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Schott N-LAK9" }));

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [
        { catalog: "Hoya", name: "BSC7" },
        { catalog: "Schott", name: "N-BK7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });
  });

  it("renders all eight catalog bulk controls and only the four eligible Special candidates", () => {
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: /Select all .* candidates/ })).toHaveLength(8);
    expect(screen.getByRole("checkbox", { name: "Select Special CaF2" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Special D263TECO" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Special air" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Special REFL" })).not.toBeInTheDocument();
    expect(screen.queryByText("Unsupported Special")).not.toBeInTheDocument();
  });

  it("starts air and numeric ModelGlass rows with an empty pool and requires a selection", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={0}
        selectedMode={{ surfaceIndex: 0, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByText("Select at least one glass candidate.")).toBeInTheDocument();

    rerender(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "1.6", manufacturer: "40" }],
        }}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("uses an explicit Custom manufacturer when its name collides with Special", async () => {
    const user = userEvent.setup();
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "CaF2", manufacturer: "Custom" }],
        }}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={{
          ...catalogs,
          Custom: {
            ...catalogs.Custom,
            CaF2: glass(1.5, 50),
          },
        }}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("checkbox", { name: "Select all Custom candidates" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select all Special candidates" })).not.toBeChecked();
  });

  it("marks unavailable persisted Custom candidates so they can be removed", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "CUSTOM_A", manufacturer: "Custom" }],
        }}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [
            { catalog: "Custom", name: "DELETED_CUSTOM" },
            { catalog: "Custom", name: "CUSTOM_A" },
          ],
        }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    expect(within(grid).getByText("DELETED_CUSTOM (Unavailable)")).toBeInTheDocument();
    const staleCheckbox = screen.getByRole("checkbox", { name: "Select Custom DELETED_CUSTOM" });
    expect(staleCheckbox).toBeChecked();

    await user.click(staleCheckbox);
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [{ catalog: "Custom", name: "CUSTOM_A" }],
    });
  });
});
