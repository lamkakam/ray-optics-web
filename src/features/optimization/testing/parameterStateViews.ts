/**
 * Test projections between generic parameter-group states and the compact
 * per-parameter shapes the store assertions are written in, so expectations
 * stay readable: single-component groups project to `{ surfaceIndex, ...mode }`,
 * aspheres to `{ type, lockedType, conic, toricSweep, coefficients[10] }`, and
 * tilt/decenter to `{ type, lockedType, alpha, beta, gamma, x, y }`.
 */
import {
  getParameterMode,
  type ParameterGroupState,
  type ParameterMode,
} from "@/features/optimization/lib/parameters/parameterStates";

/** Projects radius or thickness states to `{ surfaceIndex, ...mode }` rows. */
export function singleModes(
  states: ReadonlyArray<ParameterGroupState<"radius" | "thickness">>,
): Array<{ readonly surfaceIndex: number } & ParameterMode> {
  return states.map((state) => ({
    surfaceIndex: state.surfaceIndex,
    ...getParameterMode(state, "value"),
  }));
}

/** Compact asphere view of one aspherical group state. */
export function asphereView(state: ParameterGroupState<"aspherical">) {
  return {
    surfaceIndex: state.surfaceIndex,
    type: state.qualifier,
    lockedType: state.lockedQualifier,
    conic: getParameterMode(state, "conic"),
    toricSweep: getParameterMode(state, "toricSweep"),
    coefficients: Array.from({ length: 10 }, (_, index) =>
      getParameterMode(state, `coefficient:${index}`),
    ),
  };
}

/** Compact asphere views of every aspherical group state. */
export function asphereViews(
  states: ReadonlyArray<ParameterGroupState<"aspherical">>,
) {
  return states.map(asphereView);
}

const DECENTER_KEYS = ["alpha", "beta", "gamma", "x", "y"] as const;

/** Compact tilt/decenter view of one decenter group state. */
export function decenterView(state: ParameterGroupState<"decenter">) {
  return {
    surfaceIndex: state.surfaceIndex,
    type: state.qualifier,
    lockedType: state.lockedQualifier,
    ...Object.fromEntries(
      DECENTER_KEYS.map((key) => [key, getParameterMode(state, key)]),
    ),
  } as {
    readonly surfaceIndex: number;
    readonly type: ParameterGroupState<"decenter">["qualifier"];
    readonly lockedType: boolean;
  } & Record<(typeof DECENTER_KEYS)[number], ParameterMode>;
}

/** Builds a decenter group state from a compact view (absent components are constant). */
export function decenterStateFrom(
  view: Partial<ReturnType<typeof decenterView>> & {
    readonly surfaceIndex: number;
  },
): ParameterGroupState<"decenter"> {
  return {
    surfaceIndex: view.surfaceIndex,
    qualifier: view.type,
    lockedQualifier: view.lockedType ?? false,
    modes: Object.fromEntries(
      DECENTER_KEYS.flatMap((key) =>
        view[key] === undefined ? [] : [[key, view[key]]],
      ),
    ),
  };
}

/** Builds an aspherical group state from a compact view (absent terms are constant). */
export function asphereStateFrom(view: {
  readonly surfaceIndex: number;
  readonly type: ParameterGroupState<"aspherical">["qualifier"];
  readonly lockedType?: boolean;
  readonly conic?: ParameterMode;
  readonly toricSweep?: ParameterMode;
  readonly coefficients?: ReadonlyArray<ParameterMode>;
}): ParameterGroupState<"aspherical"> {
  return {
    surfaceIndex: view.surfaceIndex,
    qualifier: view.type,
    lockedQualifier: view.lockedType ?? false,
    modes: {
      ...(view.conic === undefined ? {} : { conic: view.conic }),
      ...(view.toricSweep === undefined ? {} : { toricSweep: view.toricSweep }),
      ...Object.fromEntries(
        (view.coefficients ?? []).map((mode, index) => [
          `coefficient:${index}`,
          mode,
        ]),
      ),
    },
  };
}

/** Builds radius or thickness states from compact `{ surfaceIndex, ...mode }` rows (inverse of `singleModes`). */
export function singleStatesFrom(
  rows: ReadonlyArray<{ readonly surfaceIndex: number } & ParameterMode>,
): Array<ParameterGroupState<"radius"> & ParameterGroupState<"thickness">> {
  return rows.map(({ surfaceIndex, ...mode }) => ({
    surfaceIndex,
    qualifier: undefined,
    lockedQualifier: false,
    modes: mode.mode === "constant" ? {} : { value: mode as ParameterMode },
  }));
}
