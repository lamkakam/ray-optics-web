/**
 * Descriptor for the optional tilt and decenter, shared by surfaces and the
 * image plane. Offsets scale linearly and angles are preserved; reversal
 * preserves the configuration unchanged.
 */
import type { DecenterConfig } from "@/shared/lib/optical-model/model/opticalModel";
import {
  identity,
  scaleLinear,
  type PythonLine,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";

/** Returns whether every tilt and offset component is zero. */
export function isNeutralDecenter(decenter: DecenterConfig): boolean {
  return [
    decenter.alpha,
    decenter.beta,
    decenter.gamma,
    decenter.offsetX,
    decenter.offsetY,
  ].every((value) => value === 0);
}

/** Formats `<target>.decenter = DecenterData(<strategy>, alpha=..., beta=..., gamma=..., x=..., y=...)`. */
function formatDecenterAssignment(
  targetExpr: string,
  decenter: DecenterConfig,
): PythonLine {
  const {
    coordinateSystemStrategy: posAndOrientation,
    alpha,
    beta,
    gamma,
    offsetX,
    offsetY,
  } = decenter;
  return `${targetExpr}.decenter = DecenterData(${JSON.stringify(posAndOrientation)}, alpha=${alpha}, beta=${beta}, gamma=${gamma}, x=${offsetX}, y=${offsetY})`;
}

/** Optional tilt and decenter of a surface or the image plane. */
export const decenterProperty = {
  key: "decenter",
  scale: (decenter, factor) => ({
    ...decenter,
    offsetX: scaleLinear(decenter.offsetX, factor),
    offsetY: scaleLinear(decenter.offsetY, factor),
  }),
  reverse: identity,
  python: {
    surface: (surface, targetExpr) =>
      surface.decenter === undefined
        ? []
        : [formatDecenterAssignment(targetExpr, surface.decenter)],
    image: (decenter, targetExpr) => [
      formatDecenterAssignment(targetExpr, decenter),
    ],
  },
} as const satisfies SurfacePropertyDescriptor<"decenter">;
