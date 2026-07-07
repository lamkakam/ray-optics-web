import Ajv from "ajv";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const ajv = new Ajv({ $data: true });
ajv.addKeyword({
  keyword: "finiteNumber",
  type: "number",
  validate: (_schema: boolean, data: number) => Number.isFinite(data),
});

const finiteNumberSchema = {
  type: "number",
  finiteNumber: true,
} as const;

const positiveFiniteNumberSchema = {
  ...finiteNumberSchema,
  exclusiveMinimum: 0,
} as const;

const decenterConfigSchema = {
  type: "object",
  required: ["coordinateSystemStrategy", "alpha", "beta", "gamma", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    coordinateSystemStrategy: {
      type: "string",
      enum: ["bend", "dec and return", "decenter", "reverse"],
    },
    alpha: finiteNumberSchema,
    beta: finiteNumberSchema,
    gamma: finiteNumberSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

const diffractionGratingSchema = {
  type: "object",
  required: ["lpmm", "order"],
  additionalProperties: false,
  properties: {
    lpmm: finiteNumberSchema,
    order: { type: "integer" },
  },
};

const circularClearApertureSchema = {
  type: "object",
  required: ["shape", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "circular" },
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

const annularClearApertureSchema = {
  type: "object",
  required: ["shape", "obstructionRadius", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "annular" },
    obstructionRadius: { ...positiveFiniteNumberSchema, exclusiveMaximum: { $data: "2/semiDiameter" } },
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

const rectangularApertureProperties = {
  shape: { type: "string", const: "rectangular" },
  xHalfWidth: positiveFiniteNumberSchema,
  yHalfWidth: positiveFiniteNumberSchema,
  rotation: finiteNumberSchema,
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
};

const rectangularClearApertureSchema = {
  type: "object",
  required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: rectangularApertureProperties,
};

const rectangularEdgeApertureSchema = {
  type: "object",
  required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: rectangularApertureProperties,
};

const circularEdgeApertureSchema = {
  type: "object",
  required: ["shape", "radius", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "circular" },
    radius: positiveFiniteNumberSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

const clearApertureSchema = {
  oneOf: [circularClearApertureSchema, annularClearApertureSchema, rectangularClearApertureSchema],
};

const edgeApertureSchema = {
  oneOf: [circularEdgeApertureSchema, rectangularEdgeApertureSchema],
};

const conicAsphericalSchema = {
  type: "object",
  required: ["kind", "conicConstant"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "Conic" },
    conicConstant: finiteNumberSchema,
  },
};

const evenAsphericalSchema = {
  type: "object",
  required: ["kind", "conicConstant", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "EvenAspherical" },
    conicConstant: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

const radialPolynomialSchema = {
  type: "object",
  required: ["kind", "conicConstant", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "RadialPolynomial" },
    conicConstant: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

const xToroidSchema = {
  type: "object",
  required: ["kind", "conicConstant", "toricSweepRadiusOfCurvature", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "XToroid" },
    conicConstant: finiteNumberSchema,
    toricSweepRadiusOfCurvature: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

const yToroidSchema = {
  type: "object",
  required: ["kind", "conicConstant", "toricSweepRadiusOfCurvature", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "YToroid" },
    conicConstant: finiteNumberSchema,
    toricSweepRadiusOfCurvature: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

const surfaceSchema = {
  type: "object",
  required: ["label", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter"],
  additionalProperties: false,
  properties: {
    label: { type: "string", enum: ["Default", "Stop"] },
    curvatureRadius: finiteNumberSchema,
    thickness: finiteNumberSchema,
    medium: { type: "string" },
    manufacturer: { type: "string" },
    semiDiameter: finiteNumberSchema,
    aspherical: {
      oneOf: [conicAsphericalSchema, evenAsphericalSchema, radialPolynomialSchema, xToroidSchema, yToroidSchema],
    },
    decenter: decenterConfigSchema,
    diffractionGrating: diffractionGratingSchema,
    clear_aperture: clearApertureSchema,
    edge_aperture: edgeApertureSchema,
  },
};

const importedLensDataSchema = {
  type: "object",
  required: ["setAutoAperture", "specs", "object", "image", "surfaces"],
  additionalProperties: false,
  properties: {
    setAutoAperture: { type: "string", enum: ["autoAperture", "manualAperture"] },
    specs: {
      type: "object",
      required: ["pupil", "field", "wavelengths"],
      additionalProperties: false,
      properties: {
        pupil: {
          type: "object",
          required: ["space", "type", "value"],
          additionalProperties: false,
          properties: {
            space: { type: "string", enum: ["object", "image"] },
            type: { type: "string", enum: ["epd", "f/#", "NA"] },
            value: finiteNumberSchema,
          },
        },
        field: {
          type: "object",
          required: ["space", "type", "maxField", "fields", "isRelative"],
          additionalProperties: false,
          properties: {
            space: { type: "string", enum: ["object", "image"] },
            type: { type: "string", enum: ["angle", "height"] },
            maxField: finiteNumberSchema,
            fields: { type: "array", items: finiteNumberSchema },
            isRelative: { type: "boolean" },
            isWideAngle: { type: "boolean" },
          },
        },
        wavelengths: {
          type: "object",
          required: ["weights", "referenceIndex"],
          additionalProperties: false,
          properties: {
            weights: {
              type: "array",
              items: {
                type: "array",
                items: finiteNumberSchema,
                minItems: 2,
                maxItems: 2,
              },
            },
            referenceIndex: finiteNumberSchema,
          },
        },
      },
    },
    object: {
      type: "object",
      required: ["distance", "medium", "manufacturer"],
      additionalProperties: false,
      properties: {
        distance: finiteNumberSchema,
        medium: { type: "string", not: { enum: ["REFL", "refl"] } },
        manufacturer: { type: "string" },
      },
    },
    image: {
      type: "object",
      required: ["curvatureRadius"],
      additionalProperties: false,
      properties: {
        curvatureRadius: finiteNumberSchema,
        decenter: decenterConfigSchema,
      },
    },
    surfaces: {
      type: "array",
      items: surfaceSchema,
    },
  },
};

const customGlassMaterialSchema = {
  type: "object",
  required: ["type", "data"],
  additionalProperties: false,
  properties: {
    type: { type: "string", const: "tabulated" },
    data: {
      type: "array",
      minItems: 4,
      items: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: positiveFiniteNumberSchema,
      },
    },
  },
};

const importedCustomGlassDataSchema = {
  type: "object",
  required: ["version", "Custom"],
  additionalProperties: false,
  properties: {
    version: { type: "string", pattern: "^\\d+\\.\\d+$", const: "1.0" },
    Custom: {
      type: "object",
      additionalProperties: customGlassMaterialSchema,
    },
  },
};

const validateImportedLensData = ajv.compile<OpticalModel>(importedLensDataSchema);
const validateImportedCustomGlassData = ajv.compile(importedCustomGlassDataSchema);

export { validateImportedCustomGlassData, validateImportedLensData };
