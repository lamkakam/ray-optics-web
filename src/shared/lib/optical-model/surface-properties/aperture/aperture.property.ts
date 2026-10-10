/**
 * Descriptors for clear and edge apertures. Dimensions and offsets scale
 * linearly; rotations and Ronchi densities are preserved. Reversal preserves
 * apertures unchanged.
 */
import type {
  ClearAperture,
  EdgeAperture,
} from "@/shared/lib/optical-model/model/opticalModel";
import {
  identity,
  scaleLinear,
  type PythonLine,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";

function formatCircularApertureAssignment(
  targetExpr: string,
  apertureKind: "clear_apertures" | "edge_apertures",
  radius: number,
  offsetX: number,
  offsetY: number,
): PythonLine {
  const apertureClass =
    offsetX === 0 && offsetY === 0 ? "Circular" : "OffsetCircular";
  return `${targetExpr}.${apertureKind} = [${apertureClass}(radius=${radius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
}

/**
 * Formats the clear-aperture assignment, defaulting omitted offsets to `0`.
 * Rectangles ignore `semiDiameter`; other shapes emit nothing for a
 * non-positive semi-diameter. Centered circles use `Circular`, offset circles
 * `OffsetCircular`, annuli `Annular`, and Ronchi rulings `RonchiRuling`.
 */
function formatClearApertureAssignment(
  targetExpr: string,
  semiDiameter: number,
  clearAperture: ClearAperture | undefined,
): PythonLine | undefined {
  const offsetX = clearAperture === undefined ? 0 : clearAperture.offsetX;
  const offsetY = clearAperture === undefined ? 0 : clearAperture.offsetY;

  if (clearAperture?.shape === "rectangular") {
    return `${targetExpr}.clear_apertures = [OffsetRotatedRectangular(x_half_width=${clearAperture.xHalfWidth}, y_half_width=${clearAperture.yHalfWidth}, x_offset=${offsetX}, y_offset=${offsetY}, rotation=${clearAperture.rotation})]`;
  }

  if (semiDiameter <= 0) {
    return undefined;
  }

  if (clearAperture?.shape === "annular") {
    return `${targetExpr}.clear_apertures = [Annular(radius=${semiDiameter}, obstruction_radius=${clearAperture.obstructionRadius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
  }

  if (clearAperture?.shape === "ronchi") {
    return `${targetExpr}.clear_apertures = [RonchiRuling(radius=${semiDiameter}, lpmm=${clearAperture.lpmm}, rotation=${clearAperture.rotation}, x_offset=${offsetX}, y_offset=${offsetY})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "clear_apertures",
    semiDiameter,
    offsetX,
    offsetY,
  );
}

/** Formats an explicit edge aperture: `OffsetRotatedRectangular`, `Circular`, or `OffsetCircular`. */
function formatEdgeApertureAssignment(
  targetExpr: string,
  edgeAperture: EdgeAperture,
): PythonLine {
  if (edgeAperture.shape === "rectangular") {
    return `${targetExpr}.edge_apertures = [OffsetRotatedRectangular(x_half_width=${edgeAperture.xHalfWidth}, y_half_width=${edgeAperture.yHalfWidth}, x_offset=${edgeAperture.offsetX}, y_offset=${edgeAperture.offsetY}, rotation=${edgeAperture.rotation})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "edge_apertures",
    edgeAperture.radius,
    edgeAperture.offsetX,
    edgeAperture.offsetY,
  );
}

/** Scales clear-aperture dimensions and offsets while preserving rotations and Ronchi density. */
function scaleClearAperture(
  aperture: ClearAperture,
  factor: number,
): ClearAperture {
  const offsets = {
    offsetX: scaleLinear(aperture.offsetX, factor),
    offsetY: scaleLinear(aperture.offsetY, factor),
  };

  if (aperture.shape === "annular") {
    return {
      ...aperture,
      obstructionRadius: scaleLinear(aperture.obstructionRadius, factor),
      ...offsets,
    };
  }

  if (aperture.shape === "rectangular") {
    return {
      ...aperture,
      xHalfWidth: scaleLinear(aperture.xHalfWidth, factor),
      yHalfWidth: scaleLinear(aperture.yHalfWidth, factor),
      ...offsets,
    };
  }

  return { ...aperture, ...offsets };
}

/** Scales edge-aperture dimensions and offsets while preserving rectangular rotation. */
function scaleEdgeAperture(
  aperture: EdgeAperture,
  factor: number,
): EdgeAperture {
  const offsets = {
    offsetX: scaleLinear(aperture.offsetX, factor),
    offsetY: scaleLinear(aperture.offsetY, factor),
  };

  if (aperture.shape === "rectangular") {
    return {
      ...aperture,
      xHalfWidth: scaleLinear(aperture.xHalfWidth, factor),
      yHalfWidth: scaleLinear(aperture.yHalfWidth, factor),
      ...offsets,
    };
  }

  return {
    ...aperture,
    radius: scaleLinear(aperture.radius, factor),
    ...offsets,
  };
}

/**
 * Clear aperture. Its Python statement is emitted even when the property is
 * omitted, because a positive `semiDiameter` alone implies a centered circle.
 */
export const clearApertureProperty = {
  key: "clear_aperture",
  scale: scaleClearAperture,
  reverse: identity,
  python: {
    surface: (surface, targetExpr) => {
      const line = formatClearApertureAssignment(
        targetExpr,
        surface.semiDiameter,
        surface.clear_aperture,
      );
      return line === undefined ? [] : [line];
    },
  },
} as const satisfies SurfacePropertyDescriptor<"clear_aperture">;

/** Explicit edge aperture; omission follows the clear aperture and emits nothing. */
export const edgeApertureProperty = {
  key: "edge_aperture",
  scale: scaleEdgeAperture,
  reverse: identity,
  python: {
    surface: (surface, targetExpr) =>
      surface.edge_aperture === undefined
        ? []
        : [formatEdgeApertureAssignment(targetExpr, surface.edge_aperture)],
  },
} as const satisfies SurfacePropertyDescriptor<"edge_aperture">;
