/**
 * Optimizable curvature radius and thickness. Radius indices `1..N` address
 * physical surfaces and `N + 1` the image plane; thickness indices address the
 * gap after physical surface `1..N`.
 */
import Type from "typebox";
import {
  defineParameterShape,
  parameterSurfaceIndexSchema,
  updateSurfaceAt,
  updateSurfaceOrImageAt,
} from "@/shared/lib/optical-model/surface-properties/parameterShape";

/** `radius` and `thickness` parameters, addressed by surface index alone. */
export const coreParameterShape = defineParameterShape({
  properties: ["curvatureRadius", "thickness"],
  ref: {
    kind: Type.Enum(["radius", "thickness"], { type: "string" }),
    surface_index: parameterSurfaceIndexSchema,
  },
  pickupSource: {},
  applyValue: (model, ref, value) =>
    ref.kind === "radius"
      ? updateSurfaceOrImageAt(model, ref.surface_index, (owner) => ({
          ...owner,
          curvatureRadius: value,
        }))
      : updateSurfaceAt(model, ref.surface_index, (surface) => ({
          ...surface,
          thickness: value,
        })),
});
