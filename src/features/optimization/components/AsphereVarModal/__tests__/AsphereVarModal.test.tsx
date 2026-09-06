import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AsphereOptimizationState, AsphereMode } from "@/features/optimization/stores/optimizationStore";
import { AsphereVarModal } from "../AsphereVarModal";
import type { OpticalModel, Surface } from "@/shared/lib/types/opticalModel";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="mathjax">{children}</span>
  ),
}));

const constantMode: AsphereMode = { mode: "constant" };

const defaultSurface: Surface = {
  label: "Default",
  curvatureRadius: 100,
  thickness: 5,
  medium: "air",
  manufacturer: "",
  semiDiameter: 10,
};

const defaultOptimizationModel: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: {
    distance: 0,
    medium: "air",
    manufacturer: "",
  },
  image: {
    curvatureRadius: 0,
  },
  surfaces: [
    { ...defaultSurface },
    { ...defaultSurface },
    { ...defaultSurface },
  ],
  specs: {
    pupil: {
      space: "object",
      type: "epd",
      value: 10,
    },
    field: {
      space: "object",
      type: "angle",
      maxField: 10,
      fields: [0],
      isRelative: false,
    },
    wavelengths: {
      weights: [[587.6, 1]],
      referenceIndex: 0,
    },
  },
};

function makeModelWithSurfaceAspheres(
  sourceAspheres: ReadonlyArray<Surface["aspherical"] | undefined>,
): OpticalModel {
  return {
    ...defaultOptimizationModel,
    surfaces: sourceAspheres.map((aspherical) => ({
      ...defaultSurface,
      aspherical,
    })),
  };
}

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
  optimizationModel: defaultOptimizationModel,
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
        optimizationModel={defaultOptimizationModel}
        surfaceIndex={1}
        asphereState={makeState({})}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["optimizationModel", { optimizationModel: undefined }],
    ["surfaceIndex", { surfaceIndex: undefined }],
    ["asphereState", { asphereState: undefined }],
  ] as const)("renders nothing when %s is unavailable", (_, overrides) => {
    render(<AsphereVarModal {...defaultProps} {...overrides} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    render(<AsphereVarModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render term rows until an asphere type is selected", () => {
    render(<AsphereVarModal {...defaultProps} asphereState={makeState({ type: undefined })} />);

    expect(screen.queryByText("Conic Constant")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Asphere type" })).toHaveValue("");
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
    expect(screen.getByText("\\(a_{2}\\)")).toBeInTheDocument();
    expect(screen.getByText("\\(a_{20}\\)")).toBeInTheDocument();
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
    expect(screen.getByText("\\(a_{1}\\)")).toBeInTheDocument();
    expect(screen.getByText("\\(a_{10}\\)")).toBeInTheDocument();
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
    expect(screen.getByText("\\(a_{2}\\)")).toBeInTheDocument();
    expect(screen.getByText("\\(a_{20}\\)")).toBeInTheDocument();
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
    expect(screen.getByText("\\(a_{20}\\)")).toBeInTheDocument();
  });

  it("keeps plain-text accessibility labels for coefficient controls while rendering coefficient text with MathJax", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical" })}
      />,
    );

    expect(screen.getByText("\\(a_{2}\\)")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[2], "pickup");

    expect(screen.getByRole("combobox", { name: "a_2 mode" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "a_2 source coefficient" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "a_2 source coefficient index" })).not.toBeInTheDocument();
  });

  it("selecting variable mode for conic shows Min and Max inputs", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
        canUseBounds
      />,
    );
    // selects[0] = type selector, selects[1] = conic constant mode
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "variable");
    expect(screen.getByRole("textbox", { name: /min/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /max/i })).toBeInTheDocument();
  });

  it("preserves existing variable bounds when variable mode is selected again", async () => {
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "variable", min: "-2.5", max: "3.5" },
        })}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Conic Constant mode" }), {
      target: { value: "variable" },
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      conic: { mode: "variable", min: "-2.5", max: "3.5" },
    }));
  });

  it("hides asphere variable bounds for lm", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
        canUseBounds={false}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "variable");

    expect(screen.queryByRole("textbox", { name: /min/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /max/i })).not.toBeInTheDocument();
  });

  it("shows toroid guidance and zero-crossing validation only for trf", async () => {
    const user = userEvent.setup();
    const trfState = makeState({
      type: "XToroid",
      toricSweep: { mode: "variable", min: "-10", max: "10" },
    });
    const lmState = makeState({
      type: "XToroid",
      toricSweep: { mode: "variable", min: "-10", max: "10" },
    });

    const { rerender } = render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={trfState}
        canUseBounds
      />,
    );

    expect(screen.getByText("R = 0 means a flat surface (infinite radius).")).toBeInTheDocument();
    expect(screen.getByText("Toroid sweep R variable bounds must stay on one side of 0.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    rerender(
      <AsphereVarModal
        {...defaultProps}
        asphereState={lmState}
        canUseBounds={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.queryByText("R = 0 means a flat surface (infinite radius).")).not.toBeInTheDocument();
    expect(screen.queryByText("Toroid sweep R variable bounds must stay on one side of 0.")).not.toBeInTheDocument();
  });

  it("renders asphere variable bounds from canUseBounds alone", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
        canUseBounds
      />,
    );

    await user.selectOptions(screen.getAllByRole("combobox")[1], "variable");
    expect(screen.getByRole("textbox", { name: "Conic Constant Min." })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Conic Constant Max." })).toBeInTheDocument();

    rerender(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic", conic: { mode: "variable", min: "-1", max: "1" } })}
        canUseBounds={false}
      />,
    );

    expect(screen.queryByRole("textbox", { name: "Conic Constant Min." })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Conic Constant Max." })).not.toBeInTheDocument();
  });

  it("selecting pickup mode for conic shows source surface dropdown, scale, offset but no source coefficient", async () => {
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
    expect(screen.getByRole("combobox", { name: "Source surface" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /source surface/i })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /scale/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /offset/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /source coefficient/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /source coefficient index/i })).not.toBeInTheDocument();
  });

  it("omits the target surface from source surface pickup options", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        surfaceIndex={2}
        asphereState={makeState({
          surfaceIndex: 2,
          type: "Conic",
          conic: { mode: "pickup", sourceSurfaceIndex: "1", scale: "1", offset: "0" },
        })}
      />,
    );

    const sourceSurface = screen.getByRole("combobox", { name: "Source surface" });
    expect(Array.from(sourceSurface.querySelectorAll("option")).map((option) => option.textContent)).toEqual(["1", "3"]);
  });

  it("defaults newly selected pickup mode to the first available source surface", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <AsphereVarModal
        {...defaultProps}
        surfaceIndex={1}
        asphereState={makeState({ surfaceIndex: 1, type: "Conic" })}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getAllByRole("combobox")[1], "pickup");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      conic: expect.objectContaining({
        mode: "pickup",
        sourceSurfaceIndex: "2",
        scale: "1",
        offset: "0",
      }),
    }));
  });

  it("uses an empty source surface when the target has no pickup source", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        optimizationModel={{ ...defaultOptimizationModel, surfaces: [{ ...defaultSurface }] }}
        surfaceIndex={1}
        asphereState={makeState({ surfaceIndex: 1, type: "Conic" })}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Conic Constant mode" }), "pickup");

    expect(screen.getByRole("combobox", { name: "Source surface" })).toHaveLength(0);
  });

  it("selecting pickup mode for a coefficient row shows source coefficient select", async () => {
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
    expect(screen.getByRole("combobox", { name: "a_2 source coefficient" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /source coefficient index/i })).not.toBeInTheDocument();
  });

  it("defaults a new coefficient pickup to coefficient slot zero", async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical" })}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "a_2 mode" }), { target: { value: "pickup" } });
    expect(screen.getByRole("combobox", { name: "a_2 source coefficient" })).toHaveValue("0");
    fireEvent.change(screen.getByRole("combobox", { name: "a_2 mode" }), { target: { value: "pickup" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      coefficients: expect.arrayContaining([
        expect.objectContaining({ mode: "pickup", sourceTermKey: "coefficient:0" }),
      ]),
    }));
  });

  it("preserves existing pickup fields when pickup mode is selected again", async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "EvenAspherical",
          coefficients: [
            { mode: "pickup", sourceSurfaceIndex: "3", scale: "2.5", offset: "-1.25", sourceTermKey: "coefficient:0" },
            ...Array.from({ length: 9 }, () => constantMode),
          ],
        })}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "a_2 mode" }), {
      target: { value: "pickup" },
    });
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      coefficients: expect.arrayContaining([
        expect.objectContaining({
          mode: "pickup",
          sourceSurfaceIndex: "3",
          scale: "2.5",
          offset: "-1.25",
          sourceTermKey: "coefficient:0",
        }),
      ]),
    }));
  });

  it("preserves an existing coefficient source slot when pickup is selected again", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "EvenAspherical",
          coefficients: [
            { mode: "pickup", sourceSurfaceIndex: "3", scale: "2.5", offset: "-1.25", sourceTermKey: "coefficient:9" },
            ...Array.from({ length: 9 }, () => constantMode),
          ],
        })}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "a_2 mode" }), "pickup");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      coefficients: expect.arrayContaining([
        expect.objectContaining({ sourceTermKey: "coefficient:9" }),
      ]),
    }));
  });

  it("defaults a missing coefficient source term to slot zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "EvenAspherical",
          coefficients: [
            { mode: "pickup", sourceSurfaceIndex: "2", scale: "1", offset: "0" },
            ...Array.from({ length: 9 }, () => constantMode),
          ],
        })}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("combobox", { name: "a_2 source coefficient" })).toHaveValue("0");
    fireEvent.change(screen.getByRole("combobox", { name: "a_2 mode" }), { target: { value: "pickup" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      coefficients: expect.arrayContaining([
        expect.objectContaining({ sourceTermKey: "coefficient:0" }),
      ]),
    }));
  });

  it("shows and saves edited asphere pickup scale and offset values", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "pickup", sourceSurfaceIndex: "2", scale: "1", offset: "0" },
        })}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Conic Constant scale" }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant scale" }), "2.5");
    await user.clear(screen.getByRole("textbox", { name: "Conic Constant offset" }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant offset" }), "-1");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      conic: { mode: "pickup", sourceSurfaceIndex: "2", scale: "2.5", offset: "-1" },
    }));
  });

  it("resets an edited pickup draft when the committed pickup changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "pickup", sourceSurfaceIndex: "2", scale: "1", offset: "0" },
        })}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Conic Constant scale" }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant scale" }), "2.5");
    rerender(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "pickup", sourceSurfaceIndex: "3", scale: "4", offset: "-2" },
        })}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Source surface" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Conic Constant scale" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Conic Constant offset" })).toHaveValue("-2");
  });

  it("edits multiple term rows without mixing their mode state", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical" })}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Conic Constant mode" }), "variable");
    await user.clear(screen.getByRole("textbox", { name: "Conic Constant Min." }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant Min." }), "-1");
    await user.clear(screen.getByRole("textbox", { name: "Conic Constant Max." }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant Max." }), "1");
    await user.selectOptions(screen.getByRole("combobox", { name: "a_2 mode" }), "pickup");
    expect(screen.getByText("Source coefficient")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      conic: { mode: "variable", min: "-1", max: "1" },
      coefficients: expect.arrayContaining([
        expect.objectContaining({ mode: "pickup", sourceTermKey: "coefficient:0" }),
      ]),
    }));
  });

  it("uses the selected source coefficient slot when an existing pickup is rendered", () => {
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "EvenAspherical",
          coefficients: [
            { mode: "pickup", sourceSurfaceIndex: "2", sourceTermKey: "coefficient:9", scale: "1", offset: "0" },
            ...Array.from({ length: 9 }, () => constantMode),
          ],
        })}
      />,
    );

    expect(screen.getByRole("combobox", { name: "a_2 source coefficient" })).toHaveValue("9");
  });

  it("uses radial source coefficient labels and saves selected zero-based coefficient slot", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <AsphereVarModal
        {...defaultProps}
        optimizationModel={makeModelWithSurfaceAspheres([
          undefined,
          { kind: "RadialPolynomial", conicConstant: 0, polynomialCoefficients: [] },
          undefined,
        ])}
        asphereState={makeState({ type: "EvenAspherical" })}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "a_2 mode" }), "pickup");

    const sourceCoefficient = screen.getByRole("combobox", { name: "a_2 source coefficient" });
    expect(Array.from(sourceCoefficient.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "a_1",
      "a_2",
      "a_3",
      "a_4",
      "a_5",
      "a_6",
      "a_7",
      "a_8",
      "a_9",
      "a_10",
    ]);

    await user.selectOptions(sourceCoefficient, "9");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      coefficients: expect.arrayContaining([
        expect.objectContaining({
          mode: "pickup",
          sourceTermKey: "coefficient:9",
        }),
      ]),
    }));
  });

  it("uses even source coefficient labels for non-radial aspheric and spherical source surfaces", async () => {
    const user = userEvent.setup();

    render(
      <AsphereVarModal
        {...defaultProps}
        optimizationModel={makeModelWithSurfaceAspheres([
          undefined,
          { kind: "EvenAspherical", conicConstant: 0, polynomialCoefficients: [] },
          undefined,
        ])}
        asphereState={makeState({ type: "EvenAspherical" })}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "a_2 mode" }), "pickup");

    const sourceCoefficient = screen.getByRole("combobox", { name: "a_2 source coefficient" });
    expect(Array.from(sourceCoefficient.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "a_2",
      "a_4",
      "a_6",
      "a_8",
      "a_10",
      "a_12",
      "a_14",
      "a_16",
      "a_18",
      "a_20",
    ]);

    await user.selectOptions(screen.getByRole("combobox", { name: "Source surface" }), "3");
    expect(Array.from(sourceCoefficient.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "a_2",
      "a_4",
      "a_6",
      "a_8",
      "a_10",
      "a_12",
      "a_14",
      "a_16",
      "a_18",
      "a_20",
    ]);
  });

  it("updates source coefficient labels when the source surface changes", async () => {
    const user = userEvent.setup();

    render(
      <AsphereVarModal
        {...defaultProps}
        optimizationModel={makeModelWithSurfaceAspheres([
          undefined,
          { kind: "RadialPolynomial", conicConstant: 0, polynomialCoefficients: [] },
          undefined,
        ])}
        asphereState={makeState({ type: "EvenAspherical" })}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "a_2 mode" }), "pickup");
    expect(screen.getByRole("option", { name: "a_1" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "a_20" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Source surface" }), "3");

    expect(screen.queryByRole("option", { name: "a_1" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "a_20" })).toBeInTheDocument();
  });

  it("falls back to even coefficient labels for a missing source surface", async () => {
    const user = userEvent.setup();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "EvenAspherical",
          coefficients: [
            { mode: "pickup", sourceSurfaceIndex: "99", sourceTermKey: "coefficient:0", scale: "1", offset: "0" },
            ...Array.from({ length: 9 }, () => constantMode),
          ],
        })}
      />,
    );

    const sourceCoefficient = screen.getByRole("combobox", { name: "a_2 source coefficient" });
    await user.selectOptions(sourceCoefficient, "9");
    expect(screen.getByRole("option", { name: "a_20" })).toBeInTheDocument();
  });

  it("resets local draft state when the committed asphere state changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "variable", min: "-1", max: "1" },
        })}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Conic Constant Min." }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant Min." }), "-5");
    rerender(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({
          type: "Conic",
          conic: { mode: "variable", min: "-10", max: "2" },
        })}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Conic Constant Min." })).toHaveValue("-10");
    expect(screen.getByRole("textbox", { name: "Conic Constant Max." })).toHaveValue("2");
  });

  it("renders Cancel and Confirm actions", () => {
    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
        surfaceIndex={1}
        asphereState={makeState({ type: "Conic" })}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("Confirm button calls onSave with draft state and then onClose", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
        surfaceIndex={1}
        asphereState={makeState({ type: "Conic" })}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ surfaceIndex: 1 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Cancel closes without saving", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
        surfaceIndex={1}
        asphereState={makeState({ type: "Conic" })}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
        surfaceIndex={1}
        asphereState={makeState({ type: "Conic", conic: { mode: "variable", min: "0", max: "10" } })}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "Conic Constant Min." }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant Min." }), "1");
    fireEvent.click(screen.getByTestId("modal-backdrop"));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("does not dismiss when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();
    const outerKeyDown = jest.fn();

    render(
      <div onKeyDown={outerKeyDown}>
        <AsphereVarModal
          isOpen
          optimizationModel={defaultOptimizationModel}
          surfaceIndex={1}
          asphereState={makeState({ type: "Conic", conic: { mode: "variable", min: "0", max: "10" } })}
          onSave={onSave}
          onClose={onClose}
        />
      </div>,
    );

    await user.clear(screen.getByRole("textbox", { name: "Conic Constant Min." }));
    await user.type(screen.getByRole("textbox", { name: "Conic Constant Min." }), "1");
    await user.keyboard("{Escape}");

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(outerKeyDown).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("Confirm button is disabled when variable bounds have min >= max", async () => {
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

    expect(screen.getByText("Conic Constant variable bounds must have Min. less than Max.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("blocks saving toroid sweep variable bounds that straddle zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
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
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows saving toroid sweep variable bounds that stay on one side of zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <AsphereVarModal
        isOpen
        optimizationModel={defaultOptimizationModel}
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
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      toricSweep: { mode: "variable", min: "-10000", max: "-10" },
    }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("changing type resets all term modes to constant", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const coefficients = Array.from(
      { length: 10 },
      (_, i): AsphereMode => i === 0 ? { mode: "variable", min: "-1", max: "1" } : { mode: "constant" },
    );
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "EvenAspherical", coefficients })}
        onSave={onSave}
      />,
    );
    // a_2 row should show Min/Max for variable mode
    expect(screen.getByRole("textbox", { name: /min/i })).toBeInTheDocument();

    // Change type to Conic (resets all)
    const typeSelect = screen.getByRole("combobox", { name: "Asphere type" });
    await user.selectOptions(typeSelect, "Conic");
    // Only Conic Constant remains, no Min/Max inputs
    expect(screen.queryByRole("textbox", { name: /min/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      type: "Conic",
      conic: { mode: "constant" },
      toricSweep: { mode: "constant" },
      coefficients: Array.from({ length: 10 }, () => ({ mode: "constant" })),
    }));
  });

  it("uses zero bounds for a new variable mode and restores constant mode when selected", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic" })}
        onSave={onSave}
      />,
    );

    const conicMode = screen.getAllByRole("combobox")[1];
    await user.selectOptions(conicMode, "variable");
    expect(screen.getByRole("textbox", { name: "Conic Constant Min." })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "Conic Constant Max." })).toHaveValue("0");
    await user.selectOptions(screen.getByRole("combobox", { name: "Conic Constant mode" }), "constant");
    expect(screen.queryByRole("textbox", { name: "Conic Constant Min." })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ conic: { mode: "constant" } }));
  });

  it("shows toroid guidance only for a bounded toroid variable", () => {
    const { rerender } = render(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "Conic", conic: { mode: "variable", min: "-1", max: "1" } })}
        canUseBounds
      />,
    );
    expect(screen.queryByText("R = 0 means a flat surface (infinite radius).")).not.toBeInTheDocument();

    rerender(
      <AsphereVarModal
        {...defaultProps}
        asphereState={makeState({ type: "XToroid", toricSweep: { mode: "variable", min: "-2", max: "-1" } })}
        canUseBounds
      />,
    );
    expect(screen.getByText("R = 0 means a flat surface (infinite radius).")).toBeInTheDocument();
  });
});
