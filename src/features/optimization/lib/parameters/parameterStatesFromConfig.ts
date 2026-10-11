/**
 * Inverse of `buildParameterConfigs`: converts schema-valid worker variables
 * and pickups into string-backed parameter states, rejecting configs the GUI
 * cannot represent (duplicate parameters, out-of-range surfaces, incompatible
 * or locked qualifiers, bounds the optimizer cannot carry).
 */
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  PARAMETER_GROUPS,
  parameterGroupOfKind,
  type ParameterGroupKey,
  type ParameterGroupSpec,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  createParameterStates,
  withParameterMode,
  type ParameterGroupState,
  type ParameterMode,
  type ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";
import type {
  OptimizationPickupConfig,
  OptimizationVariableConfig,
} from "@/features/optimization/types/parameterTypes";

type ConfigParameter = OptimizationVariableConfig | OptimizationPickupConfig;

function assertFiniteNumber(
  value: unknown,
  label: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

/** Throws `<label> is out of range.` unless `value` is an integer in `[minimum, maximum]`. */
export function assertIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${label} is out of range.`);
  }
}

function getVariableMode(
  parameter: OptimizationVariableConfig,
  canUseBounds: boolean,
  label: string,
  rejectsZeroStraddle: boolean,
): ParameterMode {
  const hasMin = "min" in parameter;
  const hasMax = "max" in parameter;
  if (!canUseBounds) {
    if (hasMin || hasMax) {
      throw new Error(
        `${label} bounds are not representable by this optimizer.`,
      );
    }
    return { mode: "variable", min: "0", max: "0" };
  }
  if (!hasMin || !hasMax) {
    throw new Error(`${label} variable bounds are required.`);
  }
  assertFiniteNumber(parameter.min, `${label} minimum`);
  assertFiniteNumber(parameter.max, `${label} maximum`);
  if (parameter.min >= parameter.max) {
    throw new Error(`${label} variable bounds must have Min. less than Max.`);
  }
  if (rejectsZeroStraddle && parameter.min < 0 && parameter.max > 0) {
    throw new Error(`${label} variable bounds must stay on one side of 0.`);
  }
  return {
    mode: "variable",
    min: String(parameter.min),
    max: String(parameter.max),
  };
}

function getPickupMode(
  parameter: OptimizationPickupConfig,
  maximumSourceIndex: number,
): ParameterMode {
  assertFiniteNumber(parameter.scale, "Pickup scale");
  assertFiniteNumber(parameter.offset, "Pickup offset");
  assertIntegerInRange(
    parameter.source_surface_index,
    1,
    maximumSourceIndex,
    "Pickup source surface index",
  );
  if (parameter.surface_index === parameter.source_surface_index) {
    throw new Error(
      "Pickup source surface index must not equal the target surface index.",
    );
  }
  return {
    mode: "pickup",
    sourceSurfaceIndex: String(parameter.source_surface_index),
    scale: String(parameter.scale),
    offset: String(parameter.offset),
    ...("source_coefficient_index" in parameter
      ? { sourceTermKey: `coefficient:${parameter.source_coefficient_index}` }
      : {}),
  };
}

/** Converts config variables and pickups into parameter states for `model`. */
export function parameterStatesFromConfig(
  variables: readonly OptimizationVariableConfig[],
  pickups: readonly OptimizationPickupConfig[],
  model: OpticalModel,
  canUseBounds: boolean,
): ParameterStates {
  const states = createParameterStates(model) as {
    [TGroup in ParameterGroupKey]: ParameterGroupState[];
  };
  const seenParameters = new Set<string>();
  const seenQualifiers = new Map<string, unknown>();

  for (const parameter of [...variables, ...pickups] as ConfigParameter[]) {
    const coefficient =
      "coefficient_index" in parameter ? `:${parameter.coefficient_index}` : "";
    const parameterKey = `${parameter.kind}:${parameter.surface_index}${coefficient}`;
    if (seenParameters.has(parameterKey)) {
      throw new Error(`Duplicate optimization target: ${parameterKey}.`);
    }
    seenParameters.add(parameterKey);

    const groupKey = parameterGroupOfKind(parameter.kind);
    const group = PARAMETER_GROUPS[
      groupKey
    ] as ParameterGroupSpec<ParameterGroupKey>;
    const groupStates = states[groupKey];
    const surfaceIndex = parameter.surface_index;
    assertIntegerInRange(surfaceIndex, 1, groupStates.length, group.indexLabel);
    group.assertCompatible?.(parameter);

    let state = groupStates[surfaceIndex - 1];
    if (group.qualifier !== undefined) {
      const qualifier = group.qualifier.fromRef(parameter);
      const qualifierKey = `${groupKey}:${surfaceIndex}`;
      const previous = seenQualifiers.get(qualifierKey);
      if (previous !== undefined && previous !== qualifier) {
        throw new Error(
          `Incompatible ${group.qualifier.noun} types on surface ${surfaceIndex}.`,
        );
      }
      if (state.lockedQualifier && state.qualifier !== qualifier) {
        throw new Error(
          `${group.qualifier.title} type on surface ${surfaceIndex} is locked.`,
        );
      }
      seenQualifiers.set(qualifierKey, qualifier);
      state = { ...state, qualifier };
    }

    const component = group
      .components(state.qualifier as never)
      .find(({ key }) => key === group.componentKeyOf(parameter));
    const mode =
      "source_surface_index" in parameter
        ? getPickupMode(parameter, groupStates.length)
        : getVariableMode(
            parameter,
            canUseBounds,
            component?.boundsLabel ?? parameter.kind,
            component?.rejectsZeroStraddle ?? false,
          );
    groupStates[surfaceIndex - 1] = withParameterMode(
      state,
      group.componentKeyOf(parameter),
      mode,
    );
  }

  return states as ParameterStates;
}
