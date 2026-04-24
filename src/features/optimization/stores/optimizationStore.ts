import { type StateCreator } from "zustand";
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  LeastSquaresMethod,
  OptimizationConfig,
  OptimizationOperandKind,
  OptimizationOperandConfig,
  OptimizationPickupConfig,
  OptimizationReport,
  OptimizationValueEntry,
  OptimizerKind,
} from "@/shared/lib/types/optimization";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { getOptimizationMethodCapabilities } from "@/features/optimization/lib/methodCapabilities";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type SharedSurfaceVariableConfig = Extract<OptimizationConfig["variables"][number], { readonly kind: "radius" | "thickness" }>;
type SharedSurfacePickupConfig = Extract<OptimizationPickupConfig, { readonly kind: "radius" | "thickness" }>;

export type RadiusMode =
  | { readonly surfaceIndex: number; readonly mode: "constant" }
  | {
      readonly surfaceIndex: number;
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly surfaceIndex: number;
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly scale: string;
      readonly offset: string;
    };

export type RadiusModeDraft =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly scale: string;
      readonly offset: string;
    };

export type AsphereTermKey = "conic" | "toricSweep" | `coefficient:${number}`;

export type AsphereMode =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly sourceTermKey?: AsphereTermKey;
      readonly scale: string;
      readonly offset: string;
    };

export type AsphereTermModeDraft =
  | {
      readonly mode: "constant";
      readonly coefficientIndex?: number;
    }
  | {
      readonly mode: "variable";
      readonly coefficientIndex?: number;
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly coefficientIndex?: number;
      readonly sourceSurfaceIndex: string;
      readonly sourceTermKey?: AsphereTermKey;
      readonly scale: string;
      readonly offset: string;
    };

export interface AsphereOptimizationState {
  readonly surfaceIndex: number;
  readonly type: AsphericalType | undefined;
  readonly lockedType: boolean;
  readonly conic: AsphereMode;
  readonly toricSweep: AsphereMode;
  readonly coefficients: ReadonlyArray<AsphereMode>;
}

export interface OptimizationOperandRow {
  readonly id: string;
  readonly kind: OptimizationOperandKind;
  readonly target?: string;
  readonly weight: string;
}

interface RadiusModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface ThicknessModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface AsphereModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface WarningModalState {
  readonly open: boolean;
  readonly message: string;
}

interface OptimizationAlgorithmState {
  readonly kind: SharedOptimizerConfig["kind"];
  readonly method: SharedOptimizerConfig["method"];
  readonly maxNumSteps: string;
  readonly meritFunctionTolerance: string;
  readonly independentVariableTolerance: string;
  readonly gradientTolerance: string;
}

export interface OptimizationState {
  activeTabId: string;
  optimizationModel: OpticalModel | undefined;
  optimizer: OptimizationAlgorithmState;
  fieldWeights: number[];
  wavelengthWeights: number[];
  radiusModes: RadiusMode[];
  thicknessModes: RadiusMode[];
  asphereStates: AsphereOptimizationState[];
  operands: OptimizationOperandRow[];
  isOptimizing: boolean;
  lastOptimizationReport: OptimizationReport | undefined;
  warningModal: WarningModalState;
  applyConfirmOpen: boolean;
  radiusModal: RadiusModalState;
  thicknessModal: ThicknessModalState;
  asphereModal: AsphereModalState;

  initializeFromOpticalModel: (model: OpticalModel) => void;
  syncFromOpticalModel: (model: OpticalModel) => void;
  setActiveTabId: (tabId: string) => void;
  setFieldWeight: (index: number, value: string | number) => void;
  setWavelengthWeight: (index: number, value: string | number) => void;
  setRadiusMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  setThicknessMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  setAsphereType: (surfaceIndex: number, type: AsphericalType) => void;
  replaceAsphereState: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  setAsphereTermMode: (surfaceIndex: number, term: "conic" | "toricSweep" | "coefficient", mode: AsphereTermModeDraft) => void;
  openRadiusModal: (surfaceIndex: number) => void;
  closeRadiusModal: () => void;
  openThicknessModal: (surfaceIndex: number) => void;
  closeThicknessModal: () => void;
  openAsphereModal: (surfaceIndex: number) => void;
  closeAsphereModal: () => void;
  addOperand: () => void;
  deleteOperand: (id: string) => void;
  updateOperand: (id: string, patch: Partial<Omit<OptimizationOperandRow, "id">>) => void;
  replaceOperands: (rows: OptimizationOperandRow[]) => void;
  openWarningModal: (message: string) => void;
  closeWarningModal: () => void;
  openApplyConfirm: () => void;
  closeApplyConfirm: () => void;
  setIsOptimizing: (value: boolean) => void;
  buildOptimizationConfig: () => OptimizationConfig;
  applyOptimizationResult: (report: OptimizationReport) => void;
}

let nextOperandId = 0;

type WeightedFactor = {
  readonly weight: number;
};

function getFactorWeights(factors?: ReadonlyArray<WeightedFactor>): number[] {
  if (factors === undefined || factors.length === 0) {
    return [1];
  }

  return factors.map((factor) => factor.weight);
}

export function hasNonZeroOptimizationContribution(
  config: Pick<OptimizationConfig, "merit_function">,
): boolean {
  return config.merit_function.operands.some((operand) => {
    const fieldWeights = getFactorWeights(operand.fields);
    const wavelengthWeights = getFactorWeights(operand.wavelengths);

    return fieldWeights.some((fieldWeight) =>
      wavelengthWeights.some((wavelengthWeight) => operand.weight * fieldWeight * wavelengthWeight > 0),
    );
  });
}

function generateOperandId(): string {
  const id = nextOperandId;
  nextOperandId += 1;
  return `operand-${id}`;
}

function getDefaultOperandTarget(kind: OptimizationOperandKind): string | undefined {
  return getOptimizationOperandMetadata(kind).defaultTarget;
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parsePositiveFloat(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive non-zero number.`);
  }
  return parsed;
}

function parseFloatValue(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

function parseIntegerValue(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer.`);
  }
  return parsed;
}

function normalizeWeight(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

type SurfaceModeKind = SharedSurfaceVariableConfig["kind"] | SharedSurfacePickupConfig["kind"];

type SurfaceModeEntry = RadiusMode & {
  readonly kind: SurfaceModeKind;
};

function parseVariableBounds(minValue: string, maxValue: string): { readonly min: number; readonly max: number } {
  const min = parseFloatValue(minValue, "Min.");
  const max = parseFloatValue(maxValue, "Max.");
  if (min >= max) {
    throw new Error("Variable minimum must be less than maximum.");
  }

  return { min, max };
}

function buildOptimizerConfig(
  optimizer: OptimizationState["optimizer"],
): OptimizationConfig["optimizer"] {
  return {
    kind: optimizer.kind,
    method: optimizer.method,
    max_nfev: parsePositiveInteger(optimizer.maxNumSteps, "Max. num of steps"),
    ftol: parsePositiveFloat(optimizer.meritFunctionTolerance, "Merit function change tolerance"),
    xtol: parsePositiveFloat(optimizer.independentVariableTolerance, "Independent variable change tolerance"),
    gtol: parsePositiveFloat(optimizer.gradientTolerance, "Gradient tolerance"),
  };
}

function createSurfaceModeEntries(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
): SurfaceModeEntry[] {
  return [
    ...radiusModes.map((mode) => ({ ...mode, kind: "radius" as const })),
    ...thicknessModes.map((mode) => ({ ...mode, kind: "thickness" as const })),
  ];
}

function parseSurfacePickupSourceIndex(
  mode: Extract<SurfaceModeEntry, { mode: "pickup" }>,
  maxIndex: number,
): number {
  const sourceSurfaceIndex = parsePositiveInteger(mode.sourceSurfaceIndex, "Source surface index");
  if (sourceSurfaceIndex === mode.surfaceIndex) {
    throw new Error("Pickup source surface index must not equal the target surface index.");
  }
  if (sourceSurfaceIndex > maxIndex) {
    throw new Error("Pickup source surface index is out of range.");
  }

  return sourceSurfaceIndex;
}

function createVariableConfig(
  method: LeastSquaresMethod,
  baseVariable: OptimizationConfig["variables"][number],
  minValue: string,
  maxValue: string,
): OptimizationConfig["variables"][number] {
  if (!getOptimizationMethodCapabilities(method).canUseBounds) {
    return baseVariable;
  }

  const { min, max } = parseVariableBounds(minValue, maxValue);
  return { ...baseVariable, min, max };
}

function buildSurfaceVariables(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
  method: LeastSquaresMethod,
): OptimizationConfig["variables"] {
  return createSurfaceModeEntries(radiusModes, thicknessModes)
    .filter(
      (
        mode,
      ): mode is Extract<SurfaceModeEntry, { mode: "variable" }> => mode.mode === "variable",
    )
    .map((mode) => createVariableConfig(
      method,
      {
        kind: mode.kind,
        surface_index: mode.surfaceIndex,
      },
      mode.min,
      mode.max,
    ));
}

function buildSurfacePickups(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
): OptimizationConfig["pickups"] {
  return createSurfaceModeEntries(radiusModes, thicknessModes)
    .filter(
      (
        mode,
      ): mode is Extract<SurfaceModeEntry, { mode: "pickup" }> => mode.mode === "pickup",
    )
    .map((mode) => ({
      kind: mode.kind,
      surface_index: mode.surfaceIndex,
      source_surface_index: parseSurfacePickupSourceIndex(
        mode,
        mode.kind === "radius" ? radiusModes.length : thicknessModes.length,
      ),
      scale: parseFloatValue(mode.scale, "scale"),
      offset: parseFloatValue(mode.offset, "offset"),
    }));
}

function buildAsphereVariables(
  asphereStates: ReadonlyArray<AsphereOptimizationState>,
  method: LeastSquaresMethod,
): OptimizationConfig["variables"] {
  return asphereStates.flatMap((asphereState) => {
    const type = asphereState.type;
    if (type === undefined) {
      return [];
    }

    const variables: Array<OptimizationConfig["variables"][number]> = [];
    if (asphereState.conic.mode === "variable") {
      variables.push(createVariableConfig(method, {
        kind: "asphere_conic_constant",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
      }, asphereState.conic.min, asphereState.conic.max));
    }

    asphereState.coefficients.forEach((coefficientMode, coefficientIndex) => {
      if (coefficientMode.mode !== "variable") {
        return;
      }

      variables.push(createVariableConfig(method, {
        kind: "asphere_polynomial_coefficient",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        coefficient_index: coefficientIndex,
      }, coefficientMode.min, coefficientMode.max));
    });

    if ((type === "XToroid" || type === "YToroid") && asphereState.toricSweep.mode === "variable") {
      variables.push(createVariableConfig(method, {
        kind: "asphere_toric_sweep_radius",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
      }, asphereState.toricSweep.min, asphereState.toricSweep.max));
    }

    return variables;
  });
}

function buildAspherePickups(
  asphereStates: ReadonlyArray<AsphereOptimizationState>,
): OptimizationConfig["pickups"] {
  return asphereStates.flatMap((asphereState) => {
    const type = asphereState.type;
    if (type === undefined) {
      return [];
    }

    const pickups: Array<OptimizationConfig["pickups"][number]> = [];
    if (asphereState.conic.mode === "pickup") {
      pickups.push({
        kind: "asphere_conic_constant",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        source_surface_index: parsePositiveInteger(asphereState.conic.sourceSurfaceIndex, "Source surface index"),
        scale: parseFloatValue(asphereState.conic.scale, "scale"),
        offset: parseFloatValue(asphereState.conic.offset, "offset"),
      });
    }

    asphereState.coefficients.forEach((coefficientMode, coefficientIndex) => {
      if (coefficientMode.mode !== "pickup") {
        return;
      }

      const sourceTermKey = coefficientMode.sourceTermKey;
      if (sourceTermKey === undefined || !sourceTermKey.startsWith("coefficient:")) {
        throw new Error("Asphere coefficient pickups require a source coefficient term.");
      }

      pickups.push({
        kind: "asphere_polynomial_coefficient",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        coefficient_index: coefficientIndex,
        source_surface_index: parsePositiveInteger(coefficientMode.sourceSurfaceIndex, "Source surface index"),
        source_coefficient_index: parseNonNegativeInteger(sourceTermKey.replace("coefficient:", ""), "Source coefficient index"),
        scale: parseFloatValue(coefficientMode.scale, "scale"),
        offset: parseFloatValue(coefficientMode.offset, "offset"),
      });
    });

    if ((type === "XToroid" || type === "YToroid") && asphereState.toricSweep.mode === "pickup") {
      pickups.push({
        kind: "asphere_toric_sweep_radius",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        source_surface_index: parsePositiveInteger(asphereState.toricSweep.sourceSurfaceIndex, "Source surface index"),
        scale: parseFloatValue(asphereState.toricSweep.scale, "scale"),
        offset: parseFloatValue(asphereState.toricSweep.offset, "offset"),
      });
    }

    return pickups;
  });
}

function buildMeritFunctionOperands(
  operands: ReadonlyArray<OptimizationOperandRow>,
  fieldWeights: ReadonlyArray<number>,
  wavelengthWeights: ReadonlyArray<number>,
): OptimizationConfig["merit_function"]["operands"] {
  const configOperands: OptimizationOperandConfig[] = operands.map((operand) => {
    const metadata = getOptimizationOperandMetadata(operand.kind);
    const weight = parsePositiveFloat(operand.weight, "Weight");
    const base = metadata.expandsByFieldAndWavelength
      ? {
          kind: operand.kind,
          weight,
          fields: fieldWeights.map((currentWeight, index) => ({ index, weight: currentWeight })),
          wavelengths: wavelengthWeights.map((currentWeight, index) => ({ index, weight: currentWeight })),
          ...(metadata.defaultOptions !== undefined ? { options: metadata.defaultOptions } : {}),
        }
      : {
          kind: operand.kind,
          weight,
          ...(metadata.defaultOptions !== undefined ? { options: metadata.defaultOptions } : {}),
        };

    if (!metadata.requiresTarget) {
      return base;
    }

    return {
      ...base,
      target: parseFloatValue(operand.target ?? "", "Target"),
    };
  });

  if (configOperands.length === 0) {
    throw new Error("At least one operand is required.");
  }

  return configOperands;
}

function countResidualSamples(
  operands: ReadonlyArray<OptimizationConfig["merit_function"]["operands"][number]>,
): number {
  return operands.reduce((count, operand) => {
    const fieldCount = operand.fields?.length ?? 1;
    const wavelengthCount = operand.wavelengths?.length ?? 1;
    const perSampleCount = getOptimizationOperandMetadata(operand.kind).getNominalResidualCountPerSample(operand.options);
    return count + (fieldCount * wavelengthCount * perSampleCount);
  }, 0);
}

function createDefaultOperand(): OptimizationOperandRow {
  return {
    id: generateOperandId(),
    kind: "focal_length",
    target: getDefaultOperandTarget("focal_length"),
    weight: "1",
  };
}

function createInitialFieldWeights(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index === 0 ? 1 : 0));
}

function createInitialWavelengthWeights(model: OpticalModel): number[] {
  return model.specs.wavelengths.weights.map(([, weight]) => weight);
}

function reconcileWeights(previous: number[], count: number): number[] {
  return Array.from({ length: count }, (_, index) => previous[index] ?? 1);
}

function reconcileModes(previous: RadiusMode[], next: RadiusMode[]): RadiusMode[] {
  const previousBySurfaceIndex = new Map(
    previous.map((entry) => [entry.surfaceIndex, entry] as const),
  );

  return next.map((entry) => previousBySurfaceIndex.get(entry.surfaceIndex) ?? entry);
}

function createDefaultAsphereMode(): AsphereMode {
  return { mode: "constant" };
}

function padCoefficients(coefficients: number[]): number[] {
  const next = [...coefficients];
  while (next.length < 10) {
    next.push(0);
  }
  return next.slice(0, 10);
}

function trimTrailingZeroCoefficients(coefficients: number[]): number[] {
  let lastNonZero = -1;
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    if (coefficients[index] !== 0) {
      lastNonZero = index;
      break;
    }
  }

  return lastNonZero === -1 ? [] : coefficients.slice(0, lastNonZero + 1);
}

function createAsphereStates(model: OpticalModel): AsphereOptimizationState[] {
  return model.surfaces.map((surface, index) => ({
    surfaceIndex: index + 1,
    type: surface.aspherical?.kind,
    lockedType: surface.aspherical !== undefined,
    conic: createDefaultAsphereMode(),
    toricSweep: createDefaultAsphereMode(),
    coefficients: Array.from({ length: 10 }, createDefaultAsphereMode),
  }));
}

function reconcileAsphereStates(previous: AsphereOptimizationState[], model: OpticalModel): AsphereOptimizationState[] {
  const prevByIndex = new Map(previous.map((state) => [state.surfaceIndex, state] as const));
  return model.surfaces.map((surface, index) => {
    const surfaceIndex = index + 1;
    const prev = prevByIndex.get(surfaceIndex);
    const lockedType = surface.aspherical !== undefined;
    const nextType = lockedType ? surface.aspherical?.kind : prev?.type;
    return {
      surfaceIndex,
      type: nextType,
      lockedType,
      conic: prev?.conic ?? createDefaultAsphereMode(),
      toricSweep: prev?.toricSweep ?? createDefaultAsphereMode(),
      coefficients: prev?.coefficients ?? Array.from({ length: 10 }, createDefaultAsphereMode),
    };
  });
}

function createRadiusModes(model: OpticalModel): RadiusMode[] {
  return [
    ...model.surfaces.map((_, index) => ({
      surfaceIndex: index + 1,
      mode: "constant" as const,
    })),
    { surfaceIndex: model.surfaces.length + 1, mode: "constant" as const },
  ];
}

function createThicknessModes(model: OpticalModel): RadiusMode[] {
  return model.surfaces.map((_, index) => ({
    surfaceIndex: index + 1,
    mode: "constant" as const,
  }));
}

function ensureSurfaceAsphere(surface: OpticalModel["surfaces"][number], state: AsphereOptimizationState): NonNullable<OpticalModel["surfaces"][number]["aspherical"]> | undefined {
  const existing = surface.aspherical;
  const type = state.type ?? existing?.kind;
  if (type === undefined) {
    return existing;
  }

  if (type === "Conic") {
    return {
      kind: "Conic",
      conicConstant: existing?.conicConstant ?? 0,
    };
  }

  const coefficients = padCoefficients(
    existing !== undefined && "polynomialCoefficients" in existing
      ? existing.polynomialCoefficients
      : [],
  );

  if (type === "XToroid" || type === "YToroid") {
    return {
      kind: type,
      conicConstant: existing?.conicConstant ?? 0,
      toricSweepRadiusOfCurvature:
        existing !== undefined && "toricSweepRadiusOfCurvature" in existing
          ? existing.toricSweepRadiusOfCurvature
          : surface.curvatureRadius,
      polynomialCoefficients: coefficients,
    };
  }

  return {
    kind: type,
    conicConstant: existing?.conicConstant ?? 0,
    polynomialCoefficients: coefficients,
  };
}

function updateAsphereValue(
  surface: OpticalModel["surfaces"][number],
  state: AsphereOptimizationState | undefined,
  entry: OptimizationValueEntry | OptimizationPickupConfig,
  value: number,
): OpticalModel["surfaces"][number] {
  if (!entry.kind.startsWith("asphere_")) {
    return surface;
  }

  const effectiveState: AsphereOptimizationState = state ?? {
    surfaceIndex: 0,
    type: "EvenAspherical",
    lockedType: false,
    conic: createDefaultAsphereMode(),
    toricSweep: createDefaultAsphereMode(),
    coefficients: Array.from({ length: 10 }, createDefaultAsphereMode),
  };
  const baseAsphere = ensureSurfaceAsphere(surface, {
    ...effectiveState,
    type: "asphere_kind" in entry ? entry.asphere_kind : effectiveState.type,
  });

  if (baseAsphere === undefined) {
    return surface;
  }

  if (entry.kind === "asphere_conic_constant") {
    return { ...surface, aspherical: { ...baseAsphere, conicConstant: value } };
  }

  if (entry.kind === "asphere_toric_sweep_radius" && "toricSweepRadiusOfCurvature" in baseAsphere) {
    return { ...surface, aspherical: { ...baseAsphere, toricSweepRadiusOfCurvature: value } };
  }

  if (entry.kind === "asphere_polynomial_coefficient" && "polynomialCoefficients" in baseAsphere) {
    const coefficients = padCoefficients(baseAsphere.polynomialCoefficients);
    coefficients[entry.coefficient_index] = value;
    return {
      ...surface,
      aspherical: { ...baseAsphere, polynomialCoefficients: trimTrailingZeroCoefficients(coefficients) },
    };
  }

  return { ...surface, aspherical: baseAsphere };
}

function applyRadiusToModel(model: OpticalModel, surfaceIndex: number, value: number): OpticalModel {
  if (surfaceIndex === model.surfaces.length + 1) {
    return {
      ...model,
      image: {
        ...model.image,
        curvatureRadius: value,
      },
    };
  }

  const zeroBased = surfaceIndex - 1;
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === zeroBased
        ? { ...surface, curvatureRadius: value }
        : surface,
    ),
  };
}

function applyThicknessToModel(model: OpticalModel, surfaceIndex: number, value: number): OpticalModel {
  const zeroBased = surfaceIndex - 1;
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === zeroBased
        ? { ...surface, thickness: value }
        : surface,
    ),
  };
}

export const createOptimizationSlice: StateCreator<OptimizationState> = (set, get) => ({
  activeTabId: "algorithm",
  optimizationModel: undefined,
  optimizer: {
    kind: "least_squares",
    method: "trf",
    maxNumSteps: "200",
    meritFunctionTolerance: "1e-5",
    independentVariableTolerance: "1e-5",
    gradientTolerance: "1e-5",
  },
  fieldWeights: [],
  wavelengthWeights: [],
  radiusModes: [],
  thicknessModes: [],
  asphereStates: [],
  operands: [],
  isOptimizing: false,
  lastOptimizationReport: undefined,
  warningModal: { open: false, message: "" },
  applyConfirmOpen: false,
  radiusModal: { open: false, surfaceIndex: undefined },
  thicknessModal: { open: false, surfaceIndex: undefined },
  asphereModal: { open: false, surfaceIndex: undefined },

  initializeFromOpticalModel: (model) =>
    set({
      optimizationModel: model,
      fieldWeights: createInitialFieldWeights(model.specs.field.fields.length),
      wavelengthWeights: createInitialWavelengthWeights(model),
      radiusModes: createRadiusModes(model),
      thicknessModes: createThicknessModes(model),
      asphereStates: createAsphereStates(model),
      operands: [],
      lastOptimizationReport: undefined,
    }),

  syncFromOpticalModel: (model) =>
    set((state) => ({
      optimizationModel: model,
      fieldWeights: reconcileWeights(state.fieldWeights, model.specs.field.fields.length),
      wavelengthWeights: reconcileWeights(state.wavelengthWeights, model.specs.wavelengths.weights.length),
      radiusModes: reconcileModes(state.radiusModes, createRadiusModes(model)),
      thicknessModes: reconcileModes(state.thicknessModes, createThicknessModes(model)),
      asphereStates: reconcileAsphereStates(state.asphereStates, model),
    })),

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  setFieldWeight: (index, value) =>
    set((state) => ({
      fieldWeights: state.fieldWeights.map((weight, currentIndex) =>
        currentIndex === index ? normalizeWeight(value) : weight,
      ),
    })),

  setWavelengthWeight: (index, value) =>
    set((state) => ({
      wavelengthWeights: state.wavelengthWeights.map((weight, currentIndex) =>
        currentIndex === index ? normalizeWeight(value) : weight,
      ),
    })),

  setRadiusMode: (surfaceIndex, mode) =>
    set((state) => ({
      radiusModes: state.radiusModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { surfaceIndex, ...mode } as RadiusMode
          : entry,
      ),
    })),

  setThicknessMode: (surfaceIndex, mode) =>
    set((state) => ({
      thicknessModes: state.thicknessModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { surfaceIndex, ...mode } as RadiusMode
          : entry,
      ),
    })),

  setAsphereType: (surfaceIndex, type) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) =>
        entry.surfaceIndex !== surfaceIndex || entry.lockedType
          ? entry
          : { ...entry, type },
      ),
    })),

  replaceAsphereState: (surfaceIndex, nextState) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { ...nextState, surfaceIndex, lockedType: entry.lockedType || nextState.lockedType }
          : entry,
      ),
    })),

  setAsphereTermMode: (surfaceIndex, term, mode) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) => {
        if (entry.surfaceIndex !== surfaceIndex) {
          return entry;
        }

        if (term === "conic") {
          return { ...entry, conic: mode as AsphereMode };
        }

        if (term === "toricSweep") {
          return { ...entry, toricSweep: mode as AsphereMode };
        }

        const coefficientIndex = mode.coefficientIndex ?? 0;
        return {
          ...entry,
          coefficients: entry.coefficients.map((coefficientMode, index) =>
            index === coefficientIndex ? mode as AsphereMode : coefficientMode,
          ),
        };
      }),
    })),

  openRadiusModal: (surfaceIndex) =>
    set({ radiusModal: { open: true, surfaceIndex } }),

  closeRadiusModal: () =>
    set({ radiusModal: { open: false, surfaceIndex: undefined } }),

  openThicknessModal: (surfaceIndex) =>
    set({ thicknessModal: { open: true, surfaceIndex } }),

  closeThicknessModal: () =>
    set({ thicknessModal: { open: false, surfaceIndex: undefined } }),

  openAsphereModal: (surfaceIndex) =>
    set({ asphereModal: { open: true, surfaceIndex } }),

  closeAsphereModal: () =>
    set({ asphereModal: { open: false, surfaceIndex: undefined } }),

  addOperand: () =>
    set((state) => ({
      operands: [...state.operands, createDefaultOperand()],
    })),

  deleteOperand: (id) =>
    set((state) => ({
      operands: state.operands.filter((operand) => operand.id !== id),
    })),

  updateOperand: (id, patch) =>
    set((state) => ({
      operands: state.operands.map((operand) => {
        if (operand.id !== id) {
          return operand;
        }

        const nextKind = patch.kind ?? operand.kind;
        const nextMetadata = getOptimizationOperandMetadata(nextKind);
        return {
          ...operand,
          ...patch,
          kind: nextKind,
          target:
            patch.kind !== undefined && patch.target === undefined
              ? (nextMetadata.requiresTarget ? getDefaultOperandTarget(nextKind) : undefined)
              : patch.target ?? operand.target,
        };
      }),
    })),

  replaceOperands: (rows) => set({ operands: rows }),

  openWarningModal: (message) =>
    set({ warningModal: { open: true, message } }),

  closeWarningModal: () =>
    set({ warningModal: { open: false, message: "" } }),

  openApplyConfirm: () => set({ applyConfirmOpen: true }),
  closeApplyConfirm: () => set({ applyConfirmOpen: false }),
  setIsOptimizing: (value) => set({ isOptimizing: value }),

  buildOptimizationConfig: () => {
    const state = get();
    if (state.optimizationModel === undefined) {
      throw new Error("No optical model available for optimization.");
    }

    const meritOperands = buildMeritFunctionOperands(
      state.operands,
      state.fieldWeights,
      state.wavelengthWeights,
    );
    const variables = [
      ...buildSurfaceVariables(state.radiusModes, state.thicknessModes, state.optimizer.method),
      ...buildAsphereVariables(state.asphereStates, state.optimizer.method),
    ];
    if (
      getOptimizationMethodCapabilities(state.optimizer.method).requiresResidualCountAtLeastVariableCount
      && countResidualSamples(meritOperands) < variables.length
    ) {
      throw new Error("Levenberg-Marquardt requires at least as many residuals as variables.");
    }

    return {
      optimizer: buildOptimizerConfig(state.optimizer),
      variables,
      pickups: [
        ...buildSurfacePickups(state.radiusModes, state.thicknessModes),
        ...buildAspherePickups(state.asphereStates),
      ],
      merit_function: {
        operands: meritOperands,
      },
    };
  },

  applyOptimizationResult: (report) =>
    set((state) => {
      if (state.optimizationModel === undefined) {
        return state;
      }

      let nextModel = state.optimizationModel;
      for (const entry of report.final_values) {
        if (entry.kind === "radius") {
          nextModel = applyRadiusToModel(nextModel, entry.surface_index, entry.value);
        } else if (entry.kind === "thickness") {
          nextModel = applyThicknessToModel(nextModel, entry.surface_index, entry.value);
        } else {
          const zeroBased = entry.surface_index - 1;
          nextModel = {
            ...nextModel,
            surfaces: nextModel.surfaces.map((surface, index) =>
              index === zeroBased
                ? updateAsphereValue(surface, state.asphereStates.find((asphereState) => asphereState.surfaceIndex === entry.surface_index), entry, entry.value)
                : surface,
            ),
          };
        }
      }
      for (const entry of report.pickups) {
        if (entry.kind === "radius") {
          nextModel = applyRadiusToModel(nextModel, entry.surface_index, entry.value);
        } else if (entry.kind === "thickness") {
          nextModel = applyThicknessToModel(nextModel, entry.surface_index, entry.value);
        } else {
          const zeroBased = entry.surface_index - 1;
          nextModel = {
            ...nextModel,
            surfaces: nextModel.surfaces.map((surface, index) =>
              index === zeroBased
                ? updateAsphereValue(surface, state.asphereStates.find((asphereState) => asphereState.surfaceIndex === entry.surface_index), entry, entry.value)
                : surface,
            ),
          };
        }
      }

      return {
        optimizationModel: nextModel,
        lastOptimizationReport: report,
      };
    }),
});
