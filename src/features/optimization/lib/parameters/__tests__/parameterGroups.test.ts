import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  CONSTRUCTIONAL_PARAMETER_SHAPES,
  parameterKindsOf,
} from "@/shared/lib/optical-model/surface-properties/parameters";
import {
  buildParameterPickups,
  buildParameterVariables,
} from "@/features/optimization/lib/parameters/buildParameterConfigs";
import {
  PARAMETER_GROUP_KEYS,
  PARAMETER_GROUPS,
  parameterGroupOfKind,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  createParameterStates,
  reconcileParameterStates,
  summarizeParameterState,
  withParameterMode,
  type ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";
import { parameterStatesFromConfig } from "@/features/optimization/lib/parameters/parameterStatesFromConfig";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: {
      space: "object",
      type: "angle",
      isRelative: true,
      maxField: 5,
      fields: [0, 1],
    },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
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
      aspherical: {
        kind: "XToroid",
        conicConstant: 0,
        toricSweepRadiusOfCurvature: 80,
        polynomialCoefficients: [],
      },
    },
    {
      label: "Stop",
      curvatureRadius: -50,
      thickness: 40,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10,
      decenter: {
        coordinateSystemStrategy: "dec and return",
        alpha: 1,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      },
    },
  ],
};

describe("optimization parameter groups", () => {
  it("assigns every registered constructional parameter kind to exactly one group", () => {
    const shapeKinds =
      CONSTRUCTIONAL_PARAMETER_SHAPES.flatMap(parameterKindsOf);
    const groupKinds = PARAMETER_GROUP_KEYS.flatMap(
      (key) => PARAMETER_GROUPS[key].kinds,
    );

    expect([...groupKinds].sort()).toEqual([...shapeKinds].sort());
    for (const kind of shapeKinds) {
      expect(PARAMETER_GROUPS[parameterGroupOfKind(kind)].kinds).toContain(
        kind,
      );
    }
  });

  it("maps every component's wire reference back to the same component key", () => {
    const samples = {
      radius: [undefined],
      thickness: [undefined],
      aspherical: [
        "Conic",
        "EvenAspherical",
        "RadialPolynomial",
        "XToroid",
        "YToroid",
      ],
      decenter: ["bend"],
    } as const;
    for (const key of PARAMETER_GROUP_KEYS) {
      const group = PARAMETER_GROUPS[key];
      for (const qualifier of samples[key]) {
        for (const component of group.components(qualifier as never)) {
          const ref = group.toRef(component as never, 1, qualifier as never);
          expect([key, group.componentKeyOf(ref)]).toEqual([
            key,
            component.key,
          ]);
        }
      }
    }
  });

  it("locks editor qualifiers, falls back to bend, and keeps compatible modes on reconcile", () => {
    const states = createParameterStates(model);
    expect(states.radius).toHaveLength(3);
    expect(states.thickness).toHaveLength(2);
    expect(
      states.aspherical.map((state) => [
        state.qualifier,
        state.lockedQualifier,
      ]),
    ).toEqual([
      ["XToroid", true],
      [undefined, false],
    ]);
    expect(
      states.decenter.map((state) => [state.qualifier, state.lockedQualifier]),
    ).toEqual([
      ["bend", false],
      ["dec and return", true],
      ["bend", false],
    ]);

    const edited: ParameterStates = {
      ...states,
      aspherical: [
        states.aspherical[0],
        withParameterMode(
          { ...states.aspherical[1], qualifier: "Conic" },
          "conic",
          { mode: "variable", min: "-1", max: "0" },
        ),
      ],
    };
    const reconciled = reconcileParameterStates(edited, model);
    expect(reconciled.aspherical[1].qualifier).toBe("Conic");
    expect(summarizeParameterState(reconciled.aspherical[1])).toBe("V");
  });

  it("summarizes stored modes as C, V, P, or V,P", () => {
    const [state] = createParameterStates(model).decenter;
    expect(summarizeParameterState(state)).toBe("C");
    const variable = withParameterMode(state, "alpha", {
      mode: "variable",
      min: "0",
      max: "1",
    });
    expect(summarizeParameterState(variable)).toBe("V");
    expect(
      summarizeParameterState(
        withParameterMode(variable, "x", {
          mode: "pickup",
          sourceSurfaceIndex: "2",
          scale: "1",
          offset: "0",
        }),
      ),
    ).toBe("V,P");
  });

  it("round-trips variables and pickups through config and back", () => {
    const base = createParameterStates(model);
    const states: ParameterStates = {
      ...base,
      radius: [
        withParameterMode(base.radius[0], "value", {
          mode: "variable",
          min: "40",
          max: "60",
        }),
        ...base.radius.slice(1),
      ],
      aspherical: [
        withParameterMode(
          withParameterMode(base.aspherical[0], "toricSweep", {
            mode: "variable",
            min: "60",
            max: "100",
          }),
          "coefficient:2",
          {
            mode: "pickup",
            sourceSurfaceIndex: "1",
            sourceTermKey: "coefficient:1",
            scale: "2",
            offset: "0",
          },
        ),
        base.aspherical[1],
      ],
      decenter: [
        base.decenter[0],
        withParameterMode(base.decenter[1], "gamma", {
          mode: "pickup",
          sourceSurfaceIndex: "3",
          scale: "-1",
          offset: "0.5",
        }),
        base.decenter[2],
      ],
    };

    const variables = buildParameterVariables(states, true);
    const pickups = buildParameterPickups(states);
    expect(variables).toEqual([
      { kind: "radius", surface_index: 1, min: 40, max: 60 },
      {
        kind: "asphere_toric_sweep_radius",
        surface_index: 1,
        asphere_kind: "XToroid",
        min: 60,
        max: 100,
      },
    ]);
    expect(pickups).toEqual([
      {
        kind: "asphere_polynomial_coefficient",
        surface_index: 1,
        asphere_kind: "XToroid",
        coefficient_index: 2,
        source_surface_index: 1,
        source_coefficient_index: 1,
        scale: 2,
        offset: 0,
      },
      {
        kind: "decenter_gamma",
        surface_index: 2,
        decenter_type: "dec and return",
        source_surface_index: 3,
        scale: -1,
        offset: 0.5,
      },
    ]);
  });

  it("rejects a pickup that sources its own surface when the group requires distinct sources", () => {
    expect(() =>
      parameterStatesFromConfig(
        [],
        [
          {
            kind: "thickness",
            surface_index: 1,
            source_surface_index: 1,
            scale: 1,
            offset: 0,
          },
        ],
        model,
        true,
      ),
    ).toThrow(
      "Pickup source surface index must not equal the target surface index.",
    );
  });
});
