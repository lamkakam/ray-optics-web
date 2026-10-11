/**
 * Optimizable tilt and decenter components of physical surfaces (indices
 * `1..N`) and the image plane (`N + 1`). Every reference carries the
 * coordinate-system strategy; writing to an owner without a decenter creates one
 * with that strategy and zero components.
 */
import Type from "typebox";
import type { DecenterConfig } from "@/shared/lib/optical-model/model/opticalModel";
import { coordinateSystemStrategySchema } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.schema";
import {
  defineParameterShape,
  parameterSurfaceIndexSchema,
  updateSurfaceOrImageAt,
} from "@/shared/lib/optical-model/surface-properties/parameterShape";

/** Decenter field written by each tilt/decenter parameter kind. */
const DECENTER_FIELD_BY_KIND = {
  decenter_alpha: "alpha",
  decenter_beta: "beta",
  decenter_gamma: "gamma",
  decenter_x: "offsetX",
  decenter_y: "offsetY",
} as const satisfies Record<
  string,
  keyof Omit<DecenterConfig, "coordinateSystemStrategy">
>;

/** Tilt (`alpha`, `beta`, `gamma`) and decenter (`x`, `y`) parameters. */
export const decenterParameterShape = defineParameterShape({
  properties: ["decenter"],
  ref: {
    kind: Type.Enum(
      Object.keys(DECENTER_FIELD_BY_KIND) as Array<
        keyof typeof DECENTER_FIELD_BY_KIND
      >,
      { type: "string" },
    ),
    decenter_type: coordinateSystemStrategySchema,
    surface_index: parameterSurfaceIndexSchema,
  },
  pickupSource: {},
  applyValue: (model, ref, value) =>
    updateSurfaceOrImageAt(model, ref.surface_index, (owner) => {
      const base: DecenterConfig = owner.decenter ?? {
        coordinateSystemStrategy: ref.decenter_type,
        alpha: 0,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      };
      return {
        ...owner,
        decenter: {
          ...base,
          coordinateSystemStrategy: ref.decenter_type,
          [DECENTER_FIELD_BY_KIND[ref.kind]]: value,
        },
      };
    }),
});
