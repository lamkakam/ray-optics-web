/**
 * Optimization parameter groups: one per optimizable surface property
 * (radius, thickness, asphere, tilt/decenter). A group lists the components a
 * surface exposes for its current qualifier (asphere kind or decenter
 * strategy), builds their wire references, and carries the group-specific
 * validation rules and labels. Generic state, config builders, and the config
 * inverse iterate `PARAMETER_GROUPS`, so a new optimizable property adds one
 * group here next to its parameter shape.
 */
import type {
  AsphericalType,
  DecenterConfig,
  Surface,
  Surfaces,
} from "@/shared/lib/optical-model/model/opticalModel";
import type {
  ConstructionalParameterKind,
  ConstructionalParameterRef,
} from "@/features/optimization/types/parameterTypes";

/** Identifies one optimization parameter group. */
export type ParameterGroupKey =
  | "radius"
  | "thickness"
  | "aspherical"
  | "decenter";

/** Qualifier fixed per surface while optimizing a group, such as the asphere kind. */
export interface ParameterQualifierByGroup {
  readonly radius: undefined;
  readonly thickness: undefined;
  readonly aspherical: AsphericalType;
  readonly decenter: DecenterConfig["coordinateSystemStrategy"];
}

/** One independently configurable parameter of a surface within a group. */
export interface ParameterComponent {
  /** Stable key within the group, e.g. `value`, `conic`, `coefficient:3`, `alpha`. */
  readonly key: string;
  readonly kind: ConstructionalParameterKind;
  readonly coefficientIndex?: number;
  /** Radius-like bounds that must stay on one side of zero (the optimizer works in curvature). */
  readonly rejectsZeroStraddle?: boolean;
  /** Label used in config-inverse bound errors; defaults to the wire kind. */
  readonly boundsLabel?: string;
  /** Pickups from this component name a source coefficient through `sourceTermKey`. */
  readonly picksUpCoefficient?: boolean;
}

/** Rules and labels of one parameter group. */
export interface ParameterGroupSpec<TGroup extends ParameterGroupKey> {
  readonly key: TGroup;
  /** Whether index `surfaces + 1` (the image plane) belongs to the group. */
  readonly includesImage: boolean;
  /** Label used by config-inverse surface-range errors. */
  readonly indexLabel: string;
  /** Wire kinds owned by the group. */
  readonly kinds: readonly ConstructionalParameterKind[];
  /** Component key addressed by a wire reference of one of `kinds`. */
  readonly componentKeyOf: (ref: ConstructionalParameterRef) => string;
  readonly qualifier?: {
    /** Reads the editor-defined qualifier, which locks the surface's qualifier when present. */
    readonly read: (
      owner: Surface | Surfaces["image"],
    ) => ParameterQualifierByGroup[TGroup] | undefined;
    /** Qualifier assumed for owners without one. */
    readonly fallback?: ParameterQualifierByGroup[TGroup];
    /** Error-message nouns, e.g. `asphere` / `Asphere`. */
    readonly noun: string;
    readonly title: string;
    /** Reads the qualifier carried by a wire reference. */
    readonly fromRef: (
      ref: ConstructionalParameterRef,
    ) => ParameterQualifierByGroup[TGroup];
  };
  /** Components a surface exposes for `qualifier`, in wire emission order. */
  readonly components: (
    qualifier: ParameterQualifierByGroup[TGroup] | undefined,
  ) => readonly ParameterComponent[];
  /** Builds the wire reference of one component (key order matches the established JSON). */
  readonly toRef: (
    component: ParameterComponent,
    surfaceIndex: number,
    qualifier: ParameterQualifierByGroup[TGroup] | undefined,
  ) => ConstructionalParameterRef;
  /**
   * `distinctInRange` rejects same-surface and out-of-range pickup sources with
   * prefixed errors; `positiveInteger` only requires a positive source index.
   */
  readonly pickupSourceRule: "distinctInRange" | "positiveInteger";
  /** Rejects component/qualifier combinations the optimizer cannot materialize. */
  readonly assertCompatible?: (ref: ConstructionalParameterRef) => void;
}

const COEFFICIENT_SLOTS = 10;

const radiusGroup: ParameterGroupSpec<"radius"> = {
  key: "radius",
  includesImage: true,
  indexLabel: "Surface index",
  kinds: ["radius"],
  componentKeyOf: () => "value",
  components: () => [
    {
      key: "value",
      kind: "radius",
      rejectsZeroStraddle: true,
      boundsLabel: "Radius",
    },
  ],
  toRef: (_component, surfaceIndex) => ({
    kind: "radius",
    surface_index: surfaceIndex,
  }),
  pickupSourceRule: "distinctInRange",
};

const thicknessGroup: ParameterGroupSpec<"thickness"> = {
  key: "thickness",
  includesImage: false,
  indexLabel: "Surface index",
  kinds: ["thickness"],
  componentKeyOf: () => "value",
  components: () => [{ key: "value", kind: "thickness" }],
  toRef: (_component, surfaceIndex) => ({
    kind: "thickness",
    surface_index: surfaceIndex,
  }),
  pickupSourceRule: "distinctInRange",
};

const asphericalGroup: ParameterGroupSpec<"aspherical"> = {
  key: "aspherical",
  includesImage: false,
  indexLabel: "Asphere surface index",
  kinds: [
    "asphere_conic_constant",
    "asphere_toric_sweep_radius",
    "asphere_polynomial_coefficient",
  ],
  componentKeyOf: (ref) =>
    ref.kind === "asphere_polynomial_coefficient"
      ? `coefficient:${ref.coefficient_index}`
      : ref.kind === "asphere_toric_sweep_radius"
        ? "toricSweep"
        : "conic",
  qualifier: {
    read: (owner) =>
      "aspherical" in owner ? owner.aspherical?.kind : undefined,
    noun: "asphere",
    title: "Asphere",
    fromRef: (ref) =>
      (ref as { readonly asphere_kind: AsphericalType }).asphere_kind,
  },
  components: (kind) => {
    if (kind === undefined) return [];
    const conic: ParameterComponent = {
      key: "conic",
      kind: "asphere_conic_constant",
    };
    const coefficients: ParameterComponent[] =
      kind === "Conic"
        ? []
        : Array.from({ length: COEFFICIENT_SLOTS }, (_, coefficientIndex) => ({
            key: `coefficient:${coefficientIndex}`,
            kind: "asphere_polynomial_coefficient" as const,
            coefficientIndex,
            picksUpCoefficient: true,
          }));
    const toricSweep: ParameterComponent[] =
      kind === "XToroid" || kind === "YToroid"
        ? [
            {
              key: "toricSweep",
              kind: "asphere_toric_sweep_radius",
              rejectsZeroStraddle: true,
            },
          ]
        : [];
    return [conic, ...coefficients, ...toricSweep];
  },
  toRef: (component, surfaceIndex, kind) => {
    const asphereKind = kind as AsphericalType;
    if (component.kind === "asphere_polynomial_coefficient") {
      return {
        kind: component.kind,
        surface_index: surfaceIndex,
        asphere_kind: asphereKind as Exclude<AsphericalType, "Conic">,
        coefficient_index: component.coefficientIndex ?? 0,
      };
    }
    return {
      kind: component.kind as
        | "asphere_conic_constant"
        | "asphere_toric_sweep_radius",
      surface_index: surfaceIndex,
      asphere_kind: asphereKind,
    };
  },
  pickupSourceRule: "positiveInteger",
  assertCompatible: (ref) => {
    const asphereKind = (ref as { readonly asphere_kind: AsphericalType })
      .asphere_kind;
    if (
      ref.kind === "asphere_toric_sweep_radius" &&
      asphereKind !== "XToroid" &&
      asphereKind !== "YToroid"
    ) {
      throw new Error(`${ref.kind} requires an XToroid or YToroid asphere.`);
    }
    if (
      ref.kind === "asphere_polynomial_coefficient" &&
      asphereKind === "Conic"
    ) {
      throw new Error(
        "Polynomial coefficients are not supported by Conic aspheres.",
      );
    }
    if (ref.kind === "asphere_polynomial_coefficient") {
      const indices = ref as {
        readonly coefficient_index: number;
        readonly source_coefficient_index?: number;
      };
      if (indices.coefficient_index >= COEFFICIENT_SLOTS) {
        throw new Error("Asphere coefficient index is out of range.");
      }
      if (
        indices.source_coefficient_index !== undefined &&
        indices.source_coefficient_index >= COEFFICIENT_SLOTS
      ) {
        throw new Error("Source coefficient index is out of range.");
      }
    }
  },
};

const DECENTER_COMPONENTS = [
  ["alpha", "decenter_alpha"],
  ["beta", "decenter_beta"],
  ["gamma", "decenter_gamma"],
  ["x", "decenter_x"],
  ["y", "decenter_y"],
] as const;

const decenterGroup: ParameterGroupSpec<"decenter"> = {
  key: "decenter",
  includesImage: true,
  indexLabel: "Tilt/decenter surface index",
  kinds: DECENTER_COMPONENTS.map(([, kind]) => kind),
  componentKeyOf: (ref) =>
    DECENTER_COMPONENTS.find(([, kind]) => kind === ref.kind)?.[0] ?? ref.kind,
  qualifier: {
    read: (owner) => owner.decenter?.coordinateSystemStrategy,
    fallback: "bend",
    noun: "tilt/decenter",
    title: "Tilt/decenter",
    fromRef: (ref) =>
      (
        ref as {
          readonly decenter_type: DecenterConfig["coordinateSystemStrategy"];
        }
      ).decenter_type,
  },
  components: () => DECENTER_COMPONENTS.map(([key, kind]) => ({ key, kind })),
  toRef: (component, surfaceIndex, strategy) => ({
    kind: component.kind as (typeof DECENTER_COMPONENTS)[number][1],
    surface_index: surfaceIndex,
    decenter_type: strategy ?? "bend",
  }),
  pickupSourceRule: "distinctInRange",
};

/** Every optimization parameter group, in variable/pickup emission order. */
export const PARAMETER_GROUPS = {
  radius: radiusGroup,
  thickness: thicknessGroup,
  aspherical: asphericalGroup,
  decenter: decenterGroup,
} as const satisfies {
  readonly [TGroup in ParameterGroupKey]: ParameterGroupSpec<TGroup>;
};

/** Parameter group keys in emission order. */
export const PARAMETER_GROUP_KEYS = Object.keys(
  PARAMETER_GROUPS,
) as ParameterGroupKey[];

/** Returns the group owning the wire `kind`. */
export function parameterGroupOfKind(
  kind: ConstructionalParameterKind,
): ParameterGroupKey {
  const group = PARAMETER_GROUP_KEYS.find((key) =>
    PARAMETER_GROUPS[key].kinds.includes(kind),
  );
  if (group === undefined) {
    throw new Error(`Unknown constructional parameter kind: ${kind}`);
  }
  return group;
}
