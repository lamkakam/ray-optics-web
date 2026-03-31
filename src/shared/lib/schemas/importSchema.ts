import Ajv from "ajv";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const ajv = new Ajv();

const decenterConfigSchema = {
  type: "object",
  required: ["coordinateSystemStrategy", "alpha", "beta", "gamma", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    coordinateSystemStrategy: {
      type: "string",
      enum: ["bend", "dec and return", "decenter", "reverse"],
    },
    alpha: { type: "number" },
    beta: { type: "number" },
    gamma: { type: "number" },
    offsetX: { type: "number" },
    offsetY: { type: "number" },
  },
};

const surfaceSchema = {
  type: "object",
  required: ["label", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter"],
  additionalProperties: false,
  properties: {
    label: { type: "string", enum: ["Default", "Stop"] },
    curvatureRadius: { type: "number" },
    thickness: { type: "number" },
    medium: { type: "string" },
    manufacturer: { type: "string" },
    semiDiameter: { type: "number" },
    aspherical: {
      type: "object",
      required: ["conicConstant"],
      additionalProperties: false,
      properties: {
        conicConstant: { type: "number" },
        polynomialCoefficients: {
          type: "array",
          items: { type: "number" },
          maxItems: 10,
        },
      },
    },
    decenter: decenterConfigSchema,
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
            value: { type: "number" },
          },
        },
        field: {
          type: "object",
          required: ["space", "type", "maxField", "fields", "isRelative"],
          additionalProperties: false,
          properties: {
            space: { type: "string", enum: ["object", "image"] },
            type: { type: "string", enum: ["angle", "height"] },
            maxField: { type: "number" },
            fields: { type: "array", items: { type: "number" } },
            isRelative: { type: "boolean" },
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
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
              },
            },
            referenceIndex: { type: "number" },
          },
        },
      },
    },
    object: {
      type: "object",
      required: ["distance"],
      additionalProperties: false,
      properties: {
        distance: { type: "number" },
      },
    },
    image: {
      type: "object",
      required: ["curvatureRadius"],
      additionalProperties: false,
      properties: {
        curvatureRadius: { type: "number" },
        decenter: decenterConfigSchema,
      },
    },
    surfaces: {
      type: "array",
      items: surfaceSchema,
    },
  },
};

const validateImportedLensData = ajv.compile<OpticalModel>(importedLensDataSchema);

export { validateImportedLensData };
