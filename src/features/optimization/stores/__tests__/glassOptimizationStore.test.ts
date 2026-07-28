import { createStore } from "zustand";
import type { AllGlassCatalogsData, CatalogGlassData } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { GlassOptimizationReport } from "@/features/optimization/types/optimizationWorkerTypes";
import { createOptimizationSlice, type OptimizationState } from "@/features/optimization/stores/optimizationStore";

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
  CDGM: {},
  Hikari: {},
  Hoya: { BSC7: glass(1.517, 64.2) },
  Ohara: {},
  Schott: {
    BK7: glass(1.5168, 64.17),
    "N-LAK9": glass(1.691, 54.7),
  },
  Sumita: {},
  Special: {
    air: glass(1, 0),
    REFL: glass(1, 0),
    CaF2: glass(1.4338, 95.2),
    "Fused Silica": glass(1.4585, 67.8),
    Water: glass(1.333, 55.8),
    D263TECO: glass(1.523, 55),
  },
  Custom: {
    CUSTOM_A: glass(1.62, 42),
  },
};

const baseModel: OpticalModel = {
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
    {
      label: "Stop",
      curvatureRadius: -40,
      thickness: 20,
      medium: "air",
      manufacturer: "",
      semiDiameter: 9,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

function createInitializedStore(model: OpticalModel = baseModel) {
  const store = createStore<OptimizationState>(createOptimizationSlice);
  store.getState().initializeFromOpticalModel(model);
  store.getState().replaceOperands([
    { id: "operand-1", kind: "focal_length", target: "100", weight: "1" },
  ]);
  return store;
}

function glassReport(
  finalGlasses: GlassOptimizationReport["final_glasses"],
): GlassOptimizationReport {
  return {
    success: true,
    status: "optimized",
    message: "done",
    optimizer: {
      kind: "glass_expert",
      method: "L-BFGS-B",
      runs: 3,
      nfev: 10,
      nit: 2,
      num_neighbours: 7,
      maxiter: 1000,
      tol: 1e-3,
    },
    initial_glasses: [],
    final_glasses: finalGlasses,
    initial_values: [],
    final_values: [],
    pickups: [],
    residuals: [],
    merit_function: { sum_of_squares: 0, rss: 0 },
    optimization_progress: [],
  };
}

describe("glass optimization store", () => {
  it("tracks constant glass modes for Object gap 0 and physical surface gaps 1..N", () => {
    const store = createInitializedStore();

    expect(store.getState().glassModes).toEqual([
      { surfaceIndex: 0, mode: "constant" },
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
    ]);
  });

  it("resets or reconciles glass modes alongside the other prescription modes", () => {
    const store = createInitializedStore();
    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [
        { catalog: "Schott", name: "BK7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });

    store.getState().syncFromOpticalModel({
      ...baseModel,
      surfaces: [{ ...baseModel.surfaces[0], curvatureRadius: 55 }, baseModel.surfaces[1]],
    }, { prescriptionSyncPolicy: "preserveOptimizationModes" });
    expect(store.getState().glassModes[1]).toMatchObject({ mode: "variable" });

    store.getState().syncFromOpticalModel({
      ...baseModel,
      surfaces: [{ ...baseModel.surfaces[0], curvatureRadius: 60 }, baseModel.surfaces[1]],
    });
    expect(store.getState().glassModes.every((mode) => mode.mode === "constant")).toBe(true);
  });

  it("builds Glass Expert run config and a separate bounded trf evaluation config", () => {
    const store = createInitializedStore();
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [
        { catalog: "Schott", name: "N-LAK9" },
        { catalog: "Schott", name: "BK7" },
      ],
    });
    store.getState().setRadiusMode(1, { mode: "variable", min: "40", max: "60" });
    store.getState().setThicknessMode(2, { mode: "variable", min: "10", max: "30" });

    expect(store.getState().buildOptimizationConfig(catalogs)).toEqual({
      glass_optimizer: {
        num_neighbours: 7,
        maxiter: 1000,
        tol: 1e-3,
      },
      glass_variables: [{
        surface_index: 1,
        candidates: [
          { catalog: "Schott", name: "BK7" },
          { catalog: "Schott", name: "N-LAK9" },
        ],
      }],
      variables: [
        { kind: "radius", surface_index: 1, min: 40, max: 60 },
        { kind: "thickness", surface_index: 2, min: 10, max: 30 },
      ],
      pickups: [],
      merit_function: {
        operands: [{ kind: "focal_length", target: 100, weight: 1 }],
      },
    });

    expect(store.getState().buildOptimizationEvaluationConfig(catalogs)).toEqual({
      optimizer: {
        kind: "least_squares",
        method: "trf",
        max_nfev: 200,
        ftol: 1e-5,
        xtol: 1e-5,
        gtol: 1e-5,
      },
      variables: [
        { kind: "radius", surface_index: 1, min: 40, max: 60 },
        { kind: "thickness", surface_index: 2, min: 10, max: 30 },
      ],
      pickups: [],
      merit_function: {
        operands: [{ kind: "focal_length", target: 100, weight: 1 }],
      },
    });
  });

  it("allows continuous-only Glass Expert runs and does not impose the lm residual dimension rule", () => {
    const store = createInitializedStore();
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setRadiusMode(1, { mode: "variable", min: "40", max: "60" });
    store.getState().setThicknessMode(2, { mode: "variable", min: "10", max: "30" });

    expect(store.getState().buildOptimizationConfig(catalogs)).toMatchObject({
      glass_variables: [],
      variables: [
        { kind: "radius", surface_index: 1, min: 40, max: 60 },
        { kind: "thickness", surface_index: 2, min: 10, max: 30 },
      ],
    });
  });

  it("rejects fractional Glass Expert integer settings before calling the worker", () => {
    const store = createInitializedStore();
    store.setState({
      optimizer: {
        kind: "glass_expert",
        num_neighbours: "1.5",
        maxiter: "1000",
        tol: "0.001",
      },
    });

    expect(() => store.getState().buildOptimizationConfig(catalogs)).toThrow(
      "Num. of neighbours must be a positive integer.",
    );
  });

  it("builds an Object glass variable with gap index 0", () => {
    const store = createInitializedStore({
      ...baseModel,
      object: { distance: 1e10, medium: "CaF2", manufacturer: "" },
    });
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setGlassMode(0, {
      mode: "variable",
      candidates: [
        { catalog: "Special", name: "CaF2" },
        { catalog: "Special", name: "Water" },
      ],
    });

    const config = store.getState().buildOptimizationConfig(catalogs);
    if (!("glass_variables" in config)) {
      throw new Error("Expected a Glass Expert configuration");
    }
    expect(config.glass_variables).toEqual([{
      surface_index: 0,
      candidates: [
        { catalog: "Special", name: "CaF2" },
        { catalog: "Special", name: "Water" },
      ],
    }]);
  });

  it("validates selected and incumbent candidates against every live catalog snapshot", () => {
    const store = createInitializedStore({
      ...baseModel,
      surfaces: [{ ...baseModel.surfaces[0], medium: "CUSTOM_A", manufacturer: "Custom" }, baseModel.surfaces[1]],
    });
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [{ catalog: "Custom", name: "DELETED_CUSTOM" }],
    });

    expect(() => store.getState().buildOptimizationConfig(catalogs)).toThrow(
      'Glass candidate "Custom: DELETED_CUSTOM" is unavailable.',
    );

    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [{ catalog: "Schott", name: "N-LAK9" }],
    });
    expect(() => store.getState().buildOptimizationConfig(catalogs)).toThrow(
      "Current glass must be included in candidates for surface 1.",
    );

    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [{ catalog: "Custom", name: "CUSTOM_A" }],
    });
    expect(() => store.getState().buildOptimizationConfig(catalogs)).not.toThrow();

    expect(() => store.getState().buildOptimizationConfig({
      ...catalogs,
      Custom: {},
    })).toThrow('Glass candidate "Custom: CUSTOM_A" is unavailable.');
  });

  it("blocks air and REFL variable rows and rejects ineligible Special candidates", () => {
    const store = createInitializedStore();
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setGlassMode(0, {
      mode: "variable",
      candidates: [{ catalog: "Special", name: "CaF2" }],
    });
    expect(() => store.getState().buildOptimizationConfig(catalogs)).toThrow(
      "air cannot be optimized as a glass variable at surface 0.",
    );

    store.getState().setGlassMode(0, { mode: "constant" });
    store.getState().setGlassMode(2, {
      mode: "variable",
      candidates: [{ catalog: "Special", name: "REFL" }],
    });
    expect(() => store.getState().buildOptimizationConfig(catalogs)).toThrow(
      'Glass candidate "Special: REFL" is not eligible.',
    );
  });

  it("keeps numeric ModelGlass incumbents as the membership-validation exception", () => {
    const store = createInitializedStore({
      ...baseModel,
      surfaces: [{ ...baseModel.surfaces[0], medium: "1.6", manufacturer: "40" }, baseModel.surfaces[1]],
    });
    store.getState().setOptimizerKind("glass_expert");
    store.getState().setGlassMode(1, {
      mode: "variable",
      candidates: [{ catalog: "Hoya", name: "BSC7" }],
    });

    expect(() => store.getState().buildOptimizationConfig(catalogs)).not.toThrow();
  });

  it("applies standard, Special, and Custom final glass identities and marks them unapplied", () => {
    const store = createInitializedStore({
      ...baseModel,
      object: { ...baseModel.object, medium: "CaF2" },
      surfaces: [
        { ...baseModel.surfaces[0], medium: "BK7", manufacturer: "Schott" },
        { ...baseModel.surfaces[1], medium: "CUSTOM_A", manufacturer: "Custom" },
      ],
    });

    store.getState().applyOptimizationResult(glassReport([
      { surface_index: 0, name: "Fused Silica", catalog: "Special" },
      { surface_index: 1, name: "BSC7", catalog: "Hoya" },
      { surface_index: 2, name: "CUSTOM_A", catalog: "Custom" },
    ]));

    expect(store.getState().optimizationModel?.object).toMatchObject({
      medium: "Fused Silica",
      manufacturer: "",
    });
    expect(store.getState().optimizationModel?.surfaces[0]).toMatchObject({
      medium: "BSC7",
      manufacturer: "Hoya",
    });
    expect(store.getState().optimizationModel?.surfaces[1]).toMatchObject({
      medium: "CUSTOM_A",
      manufacturer: "Custom",
    });
    expect(store.getState().lastOptimizationReport?.optimizer.kind).toBe("glass_expert");
    expect(store.getState().hasUnappliedOptimizationResult).toBe(true);
  });
});
