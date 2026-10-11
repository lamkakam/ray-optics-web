/**
 * Builds worker variable and pickup configs from string-backed parameter
 * states. Groups emit in `PARAMETER_GROUPS` order and components in each
 * group's order, so the JSON matches what the optimizer has always received.
 * Errors are labeled with the parameter kind and surface.
 */
import {
  parseFloatValue,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from "@/features/optimization/lib/formParsing";
import {
  PARAMETER_GROUP_KEYS,
  PARAMETER_GROUPS,
  type ParameterComponent,
  type ParameterGroupKey,
  type ParameterGroupSpec,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  getParameterMode,
  type ParameterGroupState,
  type ParameterMode,
  type ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";
import type {
  OptimizationPickupConfig,
  OptimizationVariableConfig,
} from "@/features/optimization/types/parameterTypes";

/** Parses finite bounds, prefixing errors with the variable they belong to. */
function parseVariableBounds(
  label: string,
  minValue: string,
  maxValue: string,
): { readonly min: number; readonly max: number } {
  const min = parseFloatValue(minValue, `${label}: Min.`);
  const max = parseFloatValue(maxValue, `${label}: Max.`);
  if (min >= max) {
    throw new Error(`${label}: Min. (${min}) must be less than Max. (${max}).`);
  }
  return { min, max };
}

/** Names a variable by worker kind, surface, and coefficient for error messages. */
function describeVariable(variable: OptimizationVariableConfig): string {
  const coefficient =
    "coefficient_index" in variable
      ? ` (coefficient ${variable.coefficient_index})`
      : "";
  return `${variable.kind} variable${coefficient} on surface ${variable.surface_index}`;
}

/** Validates a pickup source against its target surface and the group's valid range. */
function validatePickupSource(
  kind: string,
  surfaceIndex: number,
  sourceValue: string,
  maxIndex: number,
): number {
  const label = `${kind} pickup on surface ${surfaceIndex}`;
  const source = parsePositiveInteger(
    sourceValue,
    `${label}: Source surface index`,
  );
  if (source === surfaceIndex) {
    throw new Error(
      `${label}: source surface index must not equal the target surface index.`,
    );
  }
  if (source > maxIndex) {
    throw new Error(
      `${label}: source surface index ${source} is out of range (valid 1 to ${maxIndex}).`,
    );
  }
  return source;
}

/** Visits every component mode of every group state, in emission order. */
function forEachComponentMode(
  states: ParameterStates,
  visit: (
    group: ParameterGroupSpec<ParameterGroupKey>,
    groupStates: readonly ParameterGroupState[],
    state: ParameterGroupState,
    component: ParameterComponent,
    mode: ParameterMode,
  ) => void,
): void {
  for (const groupKey of PARAMETER_GROUP_KEYS) {
    const group = PARAMETER_GROUPS[
      groupKey
    ] as ParameterGroupSpec<ParameterGroupKey>;
    const groupStates = states[groupKey] as readonly ParameterGroupState[];
    for (const state of groupStates) {
      for (const component of group.components(state.qualifier as never)) {
        visit(
          group,
          groupStates,
          state,
          component,
          getParameterMode(state, component.key),
        );
      }
    }
  }
}

/** Builds variables for every `variable` component; bounds are parsed only when the optimizer uses them. */
export function buildParameterVariables(
  states: ParameterStates,
  canUseBounds: boolean,
): OptimizationVariableConfig[] {
  const variables: OptimizationVariableConfig[] = [];
  forEachComponentMode(
    states,
    (group, _groupStates, state, component, mode) => {
      if (mode.mode !== "variable") return;
      const variable: OptimizationVariableConfig = group.toRef(
        component,
        state.surfaceIndex,
        state.qualifier as never,
      );
      variables.push(
        canUseBounds
          ? {
              ...variable,
              ...parseVariableBounds(
                describeVariable(variable),
                mode.min,
                mode.max,
              ),
            }
          : variable,
      );
    },
  );
  return variables;
}

/** Builds pickups for every `pickup` component, validating sources by the group's rule. */
export function buildParameterPickups(
  states: ParameterStates,
): OptimizationPickupConfig[] {
  const pickups: OptimizationPickupConfig[] = [];
  forEachComponentMode(states, (group, groupStates, state, component, mode) => {
    if (mode.mode !== "pickup") return;
    const ref = group.toRef(
      component,
      state.surfaceIndex,
      state.qualifier as never,
    );

    let sourceCoefficient:
      | { readonly source_coefficient_index: number }
      | undefined;
    if (component.picksUpCoefficient) {
      const sourceTermKey = mode.sourceTermKey;
      if (
        sourceTermKey === undefined ||
        !sourceTermKey.startsWith("coefficient:")
      ) {
        throw new Error(
          "Asphere coefficient pickups require a source coefficient term.",
        );
      }
      const sourceSurfaceIndex = parsePositiveInteger(
        mode.sourceSurfaceIndex,
        "Source surface index",
      );
      sourceCoefficient = {
        source_coefficient_index: parseNonNegativeInteger(
          sourceTermKey.replace("coefficient:", ""),
          "Source coefficient index",
        ),
      };
      pickups.push({
        ...ref,
        source_surface_index: sourceSurfaceIndex,
        ...sourceCoefficient,
        scale: parseFloatValue(mode.scale, "scale"),
        offset: parseFloatValue(mode.offset, "offset"),
      } as OptimizationPickupConfig);
      return;
    }

    const sourceSurfaceIndex =
      group.pickupSourceRule === "distinctInRange"
        ? validatePickupSource(
            ref.kind,
            state.surfaceIndex,
            mode.sourceSurfaceIndex,
            groupStates.length,
          )
        : parsePositiveInteger(mode.sourceSurfaceIndex, "Source surface index");
    pickups.push({
      ...ref,
      source_surface_index: sourceSurfaceIndex,
      scale: parseFloatValue(mode.scale, "scale"),
      offset: parseFloatValue(mode.offset, "offset"),
    } as OptimizationPickupConfig);
  });
  return pickups;
}
