/**
 * Exercises the range-operand paths before any production kind uses range mode by
 * registering one fake range kind through the operand metadata registry factory.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab";
import {
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
} from "@/features/optimization/lib/operandMetadata";
import { createOptimizationRunConfigValidator } from "@/features/optimization/lib/optimizationConfigSchema";
import { createEvaluationRow } from "@/features/optimization/lib/optimizationViewModels";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";
import type {
  OptimizationConfig,
  OptimizationOperandConfig,
  OptimizationResidualEntry,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

jest.mock("@/features/optimization/lib/operandMetadata", () => {
  const actual = jest.requireActual(
    "@/features/optimization/lib/operandMetadata",
  );
  return {
    ...actual,
    ...actual.createOptimizationOperandMetadataRegistry([
      ...actual.OPTIMIZATION_OPERAND_METADATA,
      {
        kind: "fake_range",
        label: "Fake Range",
        goal: "range",
        defaultRange: { min: "1", max: "2" },
        expandsByFieldAndWavelength: true,
        getNominalResidualCountPerSample: () => 1,
      },
    ]),
  };
});

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

/** No production kind uses range mode yet, so the fake kind is typed as the empty range kind. */
const FAKE_RANGE = "fake_range" as never;

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
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0],
      isRelative: true,
    },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

const sampling = {
  fields: [{ index: 0, weight: 1 }],
  wavelengths: [{ index: 0, weight: 1 }],
};

function configWith(
  operands: ReadonlyArray<Record<string, unknown>>,
): OptimizationConfig {
  return {
    optimizer: {
      kind: "least_squares",
      method: "trf",
      max_nfev: 200,
      ftol: 1e-5,
      xtol: 1e-5,
      gtol: 1e-5,
    },
    variables: [],
    pickups: [],
    merit_function: {
      operands: operands as unknown as ReadonlyArray<OptimizationOperandConfig>,
    },
  };
}

function setup() {
  const store = createStore<OptimizationState>(createOptimizationSlice);
  store.getState().initializeFromOpticalModel(model);
  return store;
}

describe("range operand metadata registry", () => {
  it("routes a registered range kind by its goal", () => {
    expect(OPTIMIZATION_RANGE_OPERAND_KINDS).toEqual(["fake_range"]);
    expect(isOptimizationRangeOperandKind(FAKE_RANGE)).toBe(true);
    expect(isOptimizationAdjustableTargetOperandKind(FAKE_RANGE)).toBe(false);
    expect(isOptimizationFixedTargetOperandKind(FAKE_RANGE)).toBe(false);
    expect(isOptimizationRangeOperandKind("focal_length")).toBe(false);
    expect(getOptimizationOperandMetadata(FAKE_RANGE)).toMatchObject({
      goal: "range",
      defaultRange: { min: "1", max: "2" },
    });
  });
});

describe("range operand config schema", () => {
  const validate = createOptimizationRunConfigValidator();

  it.each([[{ min: 1 }], [{ max: 2 }], [{ min: 1, max: 2 }]])(
    "accepts range bounds %p",
    (bounds) => {
      expect(
        validate(configWith([{ kind: "fake_range", weight: 1, ...bounds }])),
      ).toBe(true);
    },
  );

  it.each([
    ["no bound", { kind: "fake_range", weight: 1 }],
    ["a target", { kind: "fake_range", weight: 1, min: 1, target: 0 }],
    ["a non-finite bound", { kind: "fake_range", weight: 1, min: "x" }],
    [
      "bounds on a target kind",
      { kind: "focal_length", weight: 1, target: 1, min: 0 },
    ],
  ])("rejects a range operand with %s", (_, operand) => {
    expect(validate(configWith([operand]))).toBe(false);
  });
});

describe("range operand GUI config adapter", () => {
  it.each([
    [
      { min: 1, max: 2 },
      { min: "1", max: "2" },
    ],
    [{ min: -0.5 }, { min: "-0.5", max: undefined }],
    [{ max: 3 }, { min: undefined, max: "3" }],
  ])("round-trips range bounds %p", (bounds, rowBounds) => {
    const store = setup();
    const config = configWith([
      { kind: "fake_range", weight: 2, ...sampling, ...bounds },
    ]);

    store.getState().setOptimizationConfig(config);

    expect(store.getState().operands).toEqual([
      {
        id: "optimization-operand-0",
        kind: "fake_range",
        target: undefined,
        weight: "2",
        ...rowBounds,
      },
    ]);
    expect(
      store.getState().buildOptimizationConfig().merit_function.operands,
    ).toEqual([{ kind: "fake_range", weight: 2, ...sampling, ...bounds }]);
  });

  it("rejects a range whose min exceeds its max", () => {
    const store = setup();

    expect(() =>
      store
        .getState()
        .setOptimizationConfig(
          configWith([{ kind: "fake_range", weight: 1, min: 3, max: 2 }]),
        ),
    ).toThrow("fake_range range min must not exceed max.");
  });
});

describe("range operand store rows", () => {
  it.each([
    ["1", "2", { min: 1, max: 2 }],
    ["1", "", { min: 1 }],
    ["  ", "2", { max: 2 }],
    [undefined, "2", { max: 2 }],
  ])("builds min %p and max %p into a range", (min, max, bounds) => {
    const store = setup();
    store
      .getState()
      .replaceOperands([
        { id: "operand-1", kind: FAKE_RANGE, weight: "1", min, max },
      ]);

    expect(
      store.getState().buildOptimizationConfig().merit_function.operands,
    ).toEqual([{ kind: "fake_range", weight: 1, ...sampling, ...bounds }]);
  });

  it.each([
    ["", "", "At least one of Min or Max is required."],
    ["3", "2", "Min must not exceed Max."],
    ["abc", "", "Min must be a number."],
  ])("rejects min %p and max %p", (min, max, message) => {
    const store = setup();
    store
      .getState()
      .replaceOperands([
        { id: "operand-1", kind: FAKE_RANGE, weight: "1", min, max },
      ]);

    expect(() => store.getState().buildOptimizationConfig()).toThrow(message);
  });

  it("resets targets and bounds to the new kind's defaults when the kind changes", () => {
    const store = setup();
    store.getState().addOperand();
    const id = store.getState().operands[0].id;

    store.getState().updateOperand(id, { kind: FAKE_RANGE });
    expect(store.getState().operands[0]).toMatchObject({
      kind: "fake_range",
      target: undefined,
      min: "1",
      max: "2",
    });

    store.getState().updateOperand(id, { min: "1.5" });
    expect(store.getState().operands[0]).toMatchObject({
      min: "1.5",
      max: "2",
    });

    store.getState().updateOperand(id, { kind: "f_number" });
    expect(store.getState().operands[0]).toMatchObject({
      kind: "f_number",
      target: "10",
      min: undefined,
      max: undefined,
    });
  });
});

describe("range operand grid", () => {
  it("adds Min and Max columns that are editable only for range rows", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    render(
      <OptimizationOperandsTab
        operands={[
          { id: "range-1", kind: FAKE_RANGE, weight: "1", min: "1", max: "2" },
          { id: "fan-1", kind: "ray_fan", weight: "1" },
        ]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    expect(
      Array.from(grid.querySelectorAll("th"), (header) => header.textContent),
    ).toEqual(["Operand Kind", "Target", "Min", "Max", "Weight", ""]);
    const [rangeRow, fanRow] = Array.from(grid.querySelectorAll("tbody tr"));
    expect(rangeRow.querySelectorAll("input")).toHaveLength(3);
    expect(rangeRow).toHaveTextContent("N/A");
    expect(fanRow.querySelectorAll("input")).toHaveLength(1);

    const [minInput, maxInput] = Array.from(rangeRow.querySelectorAll("input"));
    await user.clear(minInput);
    await user.type(minInput, "0.5");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("range-1", { min: "0.5" });

    await user.clear(maxInput);
    await user.type(maxInput, "4");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("range-1", { max: "4" });
  });
});

describe("range operand evaluation rows", () => {
  const residual = {
    kind: FAKE_RANGE,
    value: 0.5,
    operand_weight: 1,
    total_weight: 1,
    weighted_residual: 0.5,
  };

  it.each([
    [{ min: 1, max: 2 }, "[1, 2]"],
    [{ min: 1 }, "≥ 1"],
    [{ max: 2 }, "≤ 2"],
  ])("formats range %p as the target cell", (bounds, target) => {
    expect(
      createEvaluationRow(
        { ...residual, ...bounds } as OptimizationResidualEntry,
        0,
      ),
    ).toMatchObject({ operandType: "Fake Range", target });
  });
});
