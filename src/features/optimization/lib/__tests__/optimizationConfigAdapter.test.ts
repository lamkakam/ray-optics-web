/** Exercises config round-tripping, Python-compatible sample defaults, and sparse/zero weights. */
import { createStore } from "zustand";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  GlassOptimizationConfig,
  OptimizationConfig,
  OptimizationRunConfig,
} from "@/features/optimization/types/optimizationWorkerTypes";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";

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
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.5],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 1],
      ],
      referenceIndex: 1,
    },
  },
};

const glassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.5183,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_fe: 0.5, P_Fd: 0.5, P_gF: 0.5 },
  dispersionCoeffKind: "Schott2x6" as const,
  dispersionCoeffs: [],
};

const catalogs: AllGlassCatalogsData = {
  Schott: { BK7: glassData },
};

function setup() {
  const store = createStore<OptimizationState>(createOptimizationSlice);
  store.getState().initializeFromOpticalModel(model);
  return store;
}

const trfConfig: OptimizationConfig = {
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
    {
      kind: "decenter_x",
      surface_index: 3,
      decenter_type: "reverse",
      min: -1,
      max: 1,
    },
  ],
  pickups: [
    {
      kind: "thickness",
      surface_index: 2,
      source_surface_index: 1,
      scale: 2,
      offset: 3,
    },
  ],
  merit_function: {
    operands: [
      {
        kind: "ray_fan",
        weight: 2,
        options: { num_rays: 13 },
        fields: [{ index: 0, weight: 1 }],
        wavelengths: [{ index: 1, weight: 0.5 }],
      },
    ],
  },
};

describe("optimization config adapter", () => {
  it.each([
    {
      name: "empty fields",
      fields: [],
      wavelengths: [{ index: 1, weight: 0.5 }],
      fieldWeights: [1, 1],
      wavelengthWeights: [0, 0.5],
    },
    {
      name: "empty wavelengths",
      fields: [{ index: 0, weight: 2 }],
      wavelengths: [],
      fieldWeights: [2, 0],
      wavelengthWeights: [1, 1],
    },
    {
      name: "both sample arrays empty",
      fields: [],
      wavelengths: [],
      fieldWeights: [1, 1],
      wavelengthWeights: [1, 1],
    },
    {
      name: "explicit zero weights",
      fields: [{ index: 0, weight: 0 }],
      wavelengths: [{ index: 1, weight: 0 }],
      fieldWeights: [0, 0],
      wavelengthWeights: [0, 0],
    },
  ])(
    "round-trips $name with the expected sample weights",
    ({ fields, wavelengths, fieldWeights, wavelengthWeights }) => {
      const store = setup();
      const operand = {
        kind: "ray_fan" as const,
        weight: 1,
        fields,
        wavelengths,
      };

      store.getState().setOptimizationConfig(
        {
          ...trfConfig,
          merit_function: { operands: [operand] },
        },
        catalogs,
      );

      expect(store.getState().fieldWeights).toEqual(fieldWeights);
      expect(store.getState().wavelengthWeights).toEqual(wavelengthWeights);
      expect(
        store.getState().buildOptimizationConfig(catalogs).merit_function
          .operands,
      ).toMatchObject([
        {
          ...operand,
          fields: fieldWeights.map((weight, index) => ({ index, weight })),
          wavelengths: wavelengthWeights.map((weight, index) => ({
            index,
            weight,
          })),
        },
      ]);
    },
  );

  it("accepts empty and omitted arrays as equivalent shared sample weights", () => {
    const store = setup();
    store.getState().setOptimizationConfig(
      {
        ...trfConfig,
        merit_function: {
          operands: [
            { kind: "ray_fan", weight: 1 },
            {
              kind: "ray_fan_tangential",
              weight: 1,
              fields: [],
              wavelengths: [],
            },
          ],
        },
      },
      catalogs,
    );

    const factors = [
      { index: 0, weight: 1 },
      { index: 1, weight: 1 },
    ];
    expect(
      store.getState().buildOptimizationConfig(catalogs).merit_function
        .operands,
    ).toMatchObject([
      { kind: "ray_fan", weight: 1, fields: factors, wavelengths: factors },
      {
        kind: "ray_fan_tangential",
        weight: 1,
        fields: factors,
        wavelengths: factors,
      },
    ]);
  });

  it("round-trips bounded continuous settings, pickups, options, and shared weights", () => {
    const store = setup();

    store.getState().setOptimizationConfig(trfConfig, catalogs);

    expect(store.getState().buildOptimizationConfig(catalogs)).toEqual({
      ...trfConfig,
      merit_function: {
        operands: [
          {
            ...trfConfig.merit_function.operands[0],
            fields: [
              { index: 0, weight: 1 },
              { index: 1, weight: 0 },
            ],
            wavelengths: [
              { index: 0, weight: 0 },
              { index: 1, weight: 0.5 },
            ],
          },
        ],
      },
    });
    expect(store.getState().optimizer).toMatchObject({
      kind: "least_squares",
      method: "trf",
      max_nfev: "200",
    });
    expect(store.getState().operands[0].options).toEqual({ num_rays: 13 });
  });

  it.each([
    [
      "least-squares lm",
      {
        optimizer: {
          kind: "least_squares",
          method: "lm",
          max_nfev: 100,
          ftol: 1e-5,
          xtol: 1e-5,
          gtol: 1e-5,
        },
        variables: [{ kind: "radius", surface_index: 1 }],
        pickups: [],
        merit_function: {
          operands: [{ kind: "focal_length", target: 100, weight: 1 }],
        },
      } satisfies OptimizationConfig,
    ],
    [
      "differential evolution",
      {
        optimizer: {
          kind: "differential_evolution",
          max_nfev: 100,
          tol: 1e-3,
          atol: 1e-6,
        },
        variables: [{ kind: "radius", surface_index: 1, min: 40, max: 60 }],
        pickups: [],
        merit_function: {
          operands: [{ kind: "focal_length", target: 100, weight: 1 }],
        },
      } satisfies OptimizationConfig,
    ],
    [
      "glass expert",
      {
        glass_optimizer: { num_neighbours: 7, maxiter: 1000, tol: 1e-3 },
        glass_variables: [
          {
            surface_index: 1,
            candidates: [{ catalog: "Schott", name: "BK7" }],
          },
        ],
        variables: [],
        pickups: [],
        merit_function: {
          operands: [{ kind: "focal_length", target: 100, weight: 1 }],
        },
      } satisfies GlassOptimizationConfig,
    ],
  ])("round-trips %s", (_name, config) => {
    const store = setup();

    store.getState().setOptimizationConfig(config, catalogs);

    expect(store.getState().buildOptimizationConfig(catalogs)).toEqual(config);
  });

  it("maps every supported surface, asphere, and tilt/decenter variable and pickup kind", () => {
    const store = setup();
    const config: OptimizationConfig = {
      optimizer: {
        kind: "differential_evolution",
        max_nfev: 100,
        tol: 1e-3,
        atol: 1e-6,
      },
      variables: [
        { kind: "radius", surface_index: 3, min: 1, max: 2 },
        { kind: "thickness", surface_index: 2, min: 1, max: 3 },
        {
          kind: "asphere_conic_constant",
          surface_index: 1,
          asphere_kind: "XToroid",
          min: -1,
          max: 1,
        },
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 1,
          asphere_kind: "XToroid",
          coefficient_index: 0,
          min: -1,
          max: 1,
        },
        ...(
          [
            "decenter_alpha",
            "decenter_beta",
            "decenter_gamma",
            "decenter_x",
            "decenter_y",
          ] as const
        ).map((kind) => ({
          kind,
          surface_index: 1,
          decenter_type: "bend" as const,
          min: -1,
          max: 1,
        })),
      ],
      pickups: [
        {
          kind: "radius",
          surface_index: 2,
          source_surface_index: 1,
          scale: 2,
          offset: 1,
        },
        {
          kind: "thickness",
          surface_index: 1,
          source_surface_index: 2,
          scale: 2,
          offset: 1,
        },
        {
          kind: "asphere_conic_constant",
          surface_index: 2,
          asphere_kind: "XToroid",
          source_surface_index: 1,
          scale: 2,
          offset: 1,
        },
        {
          kind: "asphere_toric_sweep_radius",
          surface_index: 1,
          asphere_kind: "XToroid",
          source_surface_index: 2,
          scale: 2,
          offset: 1,
        },
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 1,
          asphere_kind: "XToroid",
          coefficient_index: 1,
          source_surface_index: 2,
          source_coefficient_index: 0,
          scale: 2,
          offset: 1,
        },
        ...(
          [
            "decenter_alpha",
            "decenter_beta",
            "decenter_gamma",
            "decenter_x",
            "decenter_y",
          ] as const
        ).map((kind) => ({
          kind,
          surface_index: 3,
          decenter_type: "reverse" as const,
          source_surface_index: 1,
          scale: 2,
          offset: 1,
        })),
      ],
      merit_function: {
        operands: [{ kind: "focal_length", target: 100, weight: 1 }],
      },
    };

    store.getState().setOptimizationConfig(config, catalogs);

    const canonical = store.getState().buildOptimizationConfig(catalogs);
    expect(canonical.variables.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining([
        "radius",
        "thickness",
        "asphere_conic_constant",
        "asphere_polynomial_coefficient",
        "decenter_alpha",
        "decenter_beta",
        "decenter_gamma",
        "decenter_x",
        "decenter_y",
      ]),
    );
    expect(canonical.pickups.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining([
        "radius",
        "thickness",
        "asphere_conic_constant",
        "asphere_toric_sweep_radius",
        "asphere_polynomial_coefficient",
        "decenter_alpha",
        "decenter_beta",
        "decenter_gamma",
        "decenter_x",
        "decenter_y",
      ]),
    );
    expect(store.getState().asphereStates[0]).toMatchObject({
      type: "XToroid",
      conic: { mode: "variable" },
      toricSweep: { mode: "pickup" },
    });
    expect(store.getState().decenterStates[2]).toMatchObject({
      type: "reverse",
      alpha: { mode: "pickup" },
      y: { mode: "pickup" },
    });
  });

  it("rejects duplicate or conflicting targets atomically", () => {
    const store = setup();
    const before = store.getState();

    expect(() =>
      store.getState().setOptimizationConfig(
        {
          ...trfConfig,
          variables: [
            { kind: "radius", surface_index: 1, min: 40, max: 60 },
            { kind: "radius", surface_index: 1, min: 41, max: 59 },
          ],
        },
        catalogs,
      ),
    ).toThrow();

    expect(store.getState()).toMatchObject({
      optimizer: before.optimizer,
      fieldWeights: before.fieldWeights,
      wavelengthWeights: before.wavelengthWeights,
      radiusModes: before.radiusModes,
      operands: before.operands,
    });
  });

  it.each([
    [
      "missing bounded limits",
      {
        ...trfConfig,
        variables: [{ kind: "radius", surface_index: 1 }],
      },
    ],
    [
      "inconsistent shared field weights",
      {
        ...trfConfig,
        merit_function: {
          operands: [
            {
              kind: "ray_fan",
              weight: 1,
              fields: [{ index: 0, weight: 1 }],
              wavelengths: [{ index: 0, weight: 1 }],
            },
            {
              kind: "ray_fan_tangential",
              weight: 1,
              fields: [{ index: 1, weight: 1 }],
              wavelengths: [{ index: 0, weight: 1 }],
            },
          ],
        },
      },
    ],
    [
      "unavailable glass candidate",
      {
        glass_optimizer: { num_neighbours: 7, maxiter: 1000, tol: 1e-3 },
        glass_variables: [
          {
            surface_index: 1,
            candidates: [{ catalog: "Hoya", name: "NotLoaded" }],
          },
        ],
        variables: [],
        pickups: [],
        merit_function: {
          operands: [{ kind: "focal_length", target: 100, weight: 1 }],
        },
      },
    ],
  ])("rejects %s without mutating existing state", (_name, config) => {
    const store = setup();
    const before = store.getState();

    expect(() =>
      store
        .getState()
        .setOptimizationConfig(config as OptimizationRunConfig, catalogs),
    ).toThrow();

    expect(store.getState()).toMatchObject({
      optimizer: before.optimizer,
      fieldWeights: before.fieldWeights,
      wavelengthWeights: before.wavelengthWeights,
      radiusModes: before.radiusModes,
      operands: before.operands,
      hasUnappliedOptimizationResult: before.hasUnappliedOptimizationResult,
    });
  });

  it("rejects incompatible locked asphere and decenter types", () => {
    const lockedModel: OpticalModel = {
      ...model,
      surfaces: [
        {
          ...model.surfaces[0],
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: 0,
            polynomialCoefficients: [],
          },
          decenter: {
            coordinateSystemStrategy: "bend",
            alpha: 0,
            beta: 0,
            gamma: 0,
            offsetX: 0,
            offsetY: 0,
          },
        },
        ...model.surfaces.slice(1),
      ],
    };
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(lockedModel);
    const before = store.getState();

    expect(() =>
      store.getState().setOptimizationConfig(
        {
          ...trfConfig,
          variables: [
            {
              kind: "asphere_conic_constant",
              surface_index: 1,
              asphere_kind: "Conic",
              min: -1,
              max: 1,
            },
            {
              kind: "decenter_x",
              surface_index: 1,
              decenter_type: "reverse",
              min: -1,
              max: 1,
            },
          ],
        },
        catalogs,
      ),
    ).toThrow();
    expect(store.getState().operands).toEqual(before.operands);
    expect(store.getState().optimizationModel).toEqual(
      before.optimizationModel,
    );
  });

  it("rejects a configuration while a run is active without mutation", () => {
    const store = setup();
    store.getState().setIsOptimizing(true);

    expect(() =>
      store.getState().setOptimizationConfig(trfConfig, catalogs),
    ).toThrow(/already running/i);
    expect(store.getState().operands).toEqual([]);
  });
});
