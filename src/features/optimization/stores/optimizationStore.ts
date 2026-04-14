import { type StateCreator } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  LeastSquaresMethod,
  OptimizationConfig,
  OptimizationOperandKind,
  OptimizationReport,
  OptimizerKind,
} from "@/shared/lib/types/optimization";

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

export interface OptimizationOperandRow {
  readonly id: string;
  readonly kind: OptimizationOperandKind;
  readonly target: string;
}

interface RadiusModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface ThicknessModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface WarningModalState {
  readonly open: boolean;
  readonly message: string;
}

interface OptimizationAlgorithmState {
  readonly kind: OptimizerKind;
  readonly method: LeastSquaresMethod;
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
  operands: OptimizationOperandRow[];
  isOptimizing: boolean;
  lastOptimizationReport: OptimizationReport | undefined;
  warningModal: WarningModalState;
  applyConfirmOpen: boolean;
  radiusModal: RadiusModalState;
  thicknessModal: ThicknessModalState;

  initializeFromOpticalModel: (model: OpticalModel) => void;
  syncFromOpticalModel: (model: OpticalModel) => void;
  setActiveTabId: (tabId: string) => void;
  setFieldWeight: (index: number, value: string | number) => void;
  setWavelengthWeight: (index: number, value: string | number) => void;
  setRadiusMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  setThicknessMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  openRadiusModal: (surfaceIndex: number) => void;
  closeRadiusModal: () => void;
  openThicknessModal: (surfaceIndex: number) => void;
  closeThicknessModal: () => void;
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

function generateOperandId(): string {
  const id = nextOperandId;
  nextOperandId += 1;
  return `operand-${id}`;
}

function getDefaultOperandTarget(kind: OptimizationOperandKind): string {
  switch (kind) {
    case "focal_length":
      return "100";
    case "f_number":
      return "10";
    case "opd":
    case "rms_spot_size":
    case "rms_wavefront_error":
      return "0";
  }
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
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

function createDefaultOperand(): OptimizationOperandRow {
  return {
    id: generateOperandId(),
    kind: "focal_length",
    target: getDefaultOperandTarget("focal_length"),
  };
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
    meritFunctionTolerance: "1e-8",
    independentVariableTolerance: "1e-8",
    gradientTolerance: "1e-8",
  },
  fieldWeights: [],
  wavelengthWeights: [],
  radiusModes: [],
  thicknessModes: [],
  operands: [createDefaultOperand()],
  isOptimizing: false,
  lastOptimizationReport: undefined,
  warningModal: { open: false, message: "" },
  applyConfirmOpen: false,
  radiusModal: { open: false, surfaceIndex: undefined },
  thicknessModal: { open: false, surfaceIndex: undefined },

  initializeFromOpticalModel: (model) =>
    set({
      optimizationModel: model,
      fieldWeights: model.specs.field.fields.map(() => 1),
      wavelengthWeights: model.specs.wavelengths.weights.map(() => 1),
      radiusModes: createRadiusModes(model),
      thicknessModes: createThicknessModes(model),
      operands: [createDefaultOperand()],
      lastOptimizationReport: undefined,
    }),

  syncFromOpticalModel: (model) =>
    set((state) => ({
      optimizationModel: model,
      fieldWeights: reconcileWeights(state.fieldWeights, model.specs.field.fields.length),
      wavelengthWeights: reconcileWeights(state.wavelengthWeights, model.specs.wavelengths.weights.length),
      radiusModes: reconcileModes(state.radiusModes, createRadiusModes(model)),
      thicknessModes: reconcileModes(state.thicknessModes, createThicknessModes(model)),
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

  openRadiusModal: (surfaceIndex) =>
    set({ radiusModal: { open: true, surfaceIndex } }),

  closeRadiusModal: () =>
    set({ radiusModal: { open: false, surfaceIndex: undefined } }),

  openThicknessModal: (surfaceIndex) =>
    set({ thicknessModal: { open: true, surfaceIndex } }),

  closeThicknessModal: () =>
    set({ thicknessModal: { open: false, surfaceIndex: undefined } }),

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
        return {
          ...operand,
          ...patch,
          kind: nextKind,
          target:
            patch.kind !== undefined && patch.target === undefined
              ? getDefaultOperandTarget(nextKind)
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

    const optimizer = {
      kind: state.optimizer.kind,
      method: state.optimizer.method,
      max_nfev: parsePositiveInteger(state.optimizer.maxNumSteps, "Max. num of steps"),
      ftol: parsePositiveFloat(state.optimizer.meritFunctionTolerance, "Merit function change tolerance"),
      xtol: parsePositiveFloat(state.optimizer.independentVariableTolerance, "Independent variable change tolerance"),
      gtol: parsePositiveFloat(state.optimizer.gradientTolerance, "Gradient tolerance"),
    } as const;

    const variableModes = [
      ...state.radiusModes.map((mode) => ({ ...mode, kind: "radius" as const })),
      ...state.thicknessModes.map((mode) => ({ ...mode, kind: "thickness" as const })),
    ];
    const pickupModes = [
      ...state.radiusModes.map((mode) => ({ ...mode, kind: "radius" as const })),
      ...state.thicknessModes.map((mode) => ({ ...mode, kind: "thickness" as const })),
    ];

    const variables = variableModes
      .filter((mode): mode is (Extract<RadiusMode, { mode: "variable" }> & { kind: "radius" | "thickness" }) => mode.mode === "variable")
      .map((mode) => {
        const min = parseFloatValue(mode.min, "Min.");
        const max = parseFloatValue(mode.max, "Max.");
        if (min >= max) {
          throw new Error("Variable minimum must be less than maximum.");
        }

        return {
          kind: mode.kind,
          surface_index: mode.surfaceIndex,
          min,
          max,
        };
      });

    const pickups = pickupModes
      .filter((mode): mode is (Extract<RadiusMode, { mode: "pickup" }> & { kind: "radius" | "thickness" }) => mode.mode === "pickup")
      .map((mode) => {
        const sourceSurfaceIndex = parsePositiveInteger(mode.sourceSurfaceIndex, "Source surface index");
        if (sourceSurfaceIndex === mode.surfaceIndex) {
          throw new Error("Pickup source surface index must not equal the target surface index.");
        }
        const maxIndex = mode.kind === "radius" ? state.radiusModes.length : state.thicknessModes.length;
        if (sourceSurfaceIndex > maxIndex) {
          throw new Error("Pickup source surface index is out of range.");
        }

        return {
          kind: mode.kind,
          surface_index: mode.surfaceIndex,
          source_surface_index: sourceSurfaceIndex,
          scale: parseIntegerValue(mode.scale, "scale"),
          offset: parseFloatValue(mode.offset, "offset"),
        };
      });

    const operands = state.operands.map((operand) => {
      const target = parseFloatValue(operand.target, "Target");
      if (operand.kind === "focal_length" || operand.kind === "f_number") {
        return {
          kind: operand.kind,
          target,
          weight: 1,
        };
      }

      return {
        kind: operand.kind,
        target,
        weight: 1,
        fields: state.fieldWeights.map((weight, index) => ({ index, weight })),
        wavelengths: state.wavelengthWeights.map((weight, index) => ({ index, weight })),
      };
    });

    if (operands.length === 0) {
      throw new Error("At least one operand is required.");
    }

    return {
      optimizer,
      variables,
      pickups,
      merit_function: { operands },
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
        }
      }
      for (const entry of report.pickups) {
        if (entry.kind === "radius") {
          nextModel = applyRadiusToModel(nextModel, entry.surface_index, entry.value);
        } else if (entry.kind === "thickness") {
          nextModel = applyThicknessToModel(nextModel, entry.surface_index, entry.value);
        }
      }

      return {
        optimizationModel: nextModel,
        lastOptimizationReport: report,
      };
    }),
});
