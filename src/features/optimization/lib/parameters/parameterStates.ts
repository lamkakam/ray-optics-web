/**
 * String-backed GUI state for constant/variable/pickup optimization modes of
 * every parameter group. One `ParameterGroupState` per surface holds the
 * group's qualifier (asphere kind or decenter strategy), whether the editor
 * locks it, and a mode per component key; an absent mode means `constant`.
 */
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  PARAMETER_GROUP_KEYS,
  PARAMETER_GROUPS,
  type ParameterGroupKey,
  type ParameterGroupSpec,
  type ParameterQualifierByGroup,
} from "@/features/optimization/lib/parameters/parameterGroups";

/** Constant, bounded-or-free variable, or linear pickup mode of one component. */
export type ParameterMode =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      /** Source component key for coefficient pickups, e.g. `coefficient:2`. */
      readonly sourceTermKey?: string;
      readonly scale: string;
      readonly offset: string;
    };

/** Optimization modes of one surface (or the image plane) within a group. */
export interface ParameterGroupState<
  TGroup extends ParameterGroupKey = ParameterGroupKey,
> {
  /** 1-based surface index; `surfaces + 1` is the image plane for image-capable groups. */
  readonly surfaceIndex: number;
  readonly qualifier: ParameterQualifierByGroup[TGroup] | undefined;
  /** Whether the editor-defined qualifier prevents changing it in Optimization. */
  readonly lockedQualifier: boolean;
  /** Mode per component key; absent components are constant. */
  readonly modes: Readonly<Partial<Record<string, ParameterMode>>>;
}

/** Group states for every surface, keyed by group. */
export type ParameterStates = {
  readonly [TGroup in ParameterGroupKey]: ParameterGroupState<TGroup>[];
};

const CONSTANT: ParameterMode = { mode: "constant" };

/** Returns a component's mode, defaulting to constant. */
export function getParameterMode(
  state: ParameterGroupState | undefined,
  componentKey: string,
): ParameterMode {
  return state?.modes[componentKey] ?? CONSTANT;
}

/** Returns the state with one component's mode replaced. */
export function withParameterMode<TState extends ParameterGroupState>(
  state: TState,
  componentKey: string,
  mode: ParameterMode,
): TState {
  return { ...state, modes: { ...state.modes, [componentKey]: mode } };
}

function createGroupStates<TGroup extends ParameterGroupKey>(
  group: ParameterGroupSpec<TGroup>,
  model: OpticalModel,
): ParameterGroupState<TGroup>[] {
  const owners = group.includesImage
    ? [...model.surfaces, model.image]
    : model.surfaces;
  return owners.map((owner, index) => {
    const editorQualifier = group.qualifier?.read(owner);
    return {
      surfaceIndex: index + 1,
      qualifier: editorQualifier ?? group.qualifier?.fallback,
      lockedQualifier: editorQualifier !== undefined,
      modes: {},
    };
  });
}

/** Creates all-constant states for every group, with editor qualifiers locked. */
export function createParameterStates(model: OpticalModel): ParameterStates {
  return {
    radius: createGroupStates(PARAMETER_GROUPS.radius, model),
    thickness: createGroupStates(PARAMETER_GROUPS.thickness, model),
    aspherical: createGroupStates(PARAMETER_GROUPS.aspherical, model),
    decenter: createGroupStates(PARAMETER_GROUPS.decenter, model),
  };
}

function reconcileGroupStates<TGroup extends ParameterGroupKey>(
  previous: ParameterGroupState<TGroup>[],
  fresh: ParameterGroupState<TGroup>[],
): ParameterGroupState<TGroup>[] {
  const previousByIndex = new Map(
    previous.map((entry) => [entry.surfaceIndex, entry] as const),
  );
  return fresh.map((entry) => {
    const prior = previousByIndex.get(entry.surfaceIndex);
    if (prior === undefined) return entry;
    return {
      ...prior,
      qualifier: entry.lockedQualifier ? entry.qualifier : prior.qualifier,
      lockedQualifier: entry.lockedQualifier,
    };
  });
}

/**
 * Keeps index-compatible modes and unlocked qualifiers from `previous`, while
 * new surfaces start constant and editor-defined qualifiers win and lock.
 */
export function reconcileParameterStates(
  previous: ParameterStates,
  model: OpticalModel,
): ParameterStates {
  const fresh = createParameterStates(model);
  return {
    radius: reconcileGroupStates(previous.radius, fresh.radius),
    thickness: reconcileGroupStates(previous.thickness, fresh.thickness),
    aspherical: reconcileGroupStates(previous.aspherical, fresh.aspherical),
    decenter: reconcileGroupStates(previous.decenter, fresh.decenter),
  };
}

/** Empty states used before a model is loaded. */
export const EMPTY_PARAMETER_STATES: ParameterStates = {
  radius: [],
  thickness: [],
  aspherical: [],
  decenter: [],
};

/** Summarizes all stored modes of a state as `C`, `V`, `P`, or `V,P`. */
export function summarizeParameterState(
  state: ParameterGroupState | undefined,
): string {
  const modes = Object.values(state?.modes ?? {});
  const labels = [
    modes.some((mode) => mode?.mode === "variable") ? "V" : undefined,
    modes.some((mode) => mode?.mode === "pickup") ? "P" : undefined,
  ].filter((label): label is string => label !== undefined);
  return labels.length === 0 ? "C" : labels.join(",");
}

/** Every group key, for iteration in emission order. */
export { PARAMETER_GROUP_KEYS };
