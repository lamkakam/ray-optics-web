/**
# `shared/lib/schemas/importSchema.ts`

## Purpose

Compiles an AJV JSON Schema validator for `OpticalModel` and exports it for use at import-time boundaries (e.g. when a user uploads a lens JSON file).

## Exports

```ts
export { validateImportedCustomGlassData, validateImportedLensData };
// type: ValidateFunction<OpticalModel> (AJV compiled validator)
```

`validateImportedLensData` is an AJV compiled validator function with the signature:

```ts
(data: unknown) => data is OpticalModel
```

When validation fails, `validateImportedLensData.errors` is set to an array of AJV `ErrorObject`s.

`validateImportedCustomGlassData` validates custom glass JSON imports shaped as:

```json
{
  "version": "1.0",
  "Custom": {
    "CUSTOM_LABEL": {
      "type": "tabulated",
      "data": [[587.56, 1.5168]]
    }
  }
}
```

## Behavior

- The validator enforces the full nested structure of `OpticalModel`.
- `object` now requires `distance`, `medium`, and `manufacturer`.
- Object medium rejects reflective values (`"REFL"` / `"refl"`).
- `specs.field.isWideAngle` is accepted as an optional boolean to support wide-angle ray-aiming mode while preserving compatibility with older imported files.
- Surface `aspherical` data must use the discriminated union shape with `kind`.
- Supported `aspherical.kind` values are `"Conic"`, `"EvenAspherical"`, `"RadialPolynomial"`, `"XToroid"`, and `"YToroid"`.
- Toroid shapes require `toricSweepRadiusOfCurvature`; all coefficient-bearing shapes limit `polynomialCoefficients` to at most 10 items.
- Surface `diffractionGrating` is optional and, when present, must contain numeric `lpmm` and integer `order`.
- Surface `clear_aperture` is optional and, when present, must be either `{ shape: "circular"; offsetX: number; offsetY: number }`, `{ shape: "annular"; obstructionRadius: number; offsetX: number; offsetY: number }`, or `{ shape: "rectangular"; xHalfWidth: number; yHalfWidth: number; rotation: number; offsetX: number; offsetY: number }`.
- Annular `obstructionRadius` must be greater than `0` and smaller than that surface's `semiDiameter`.
- Rectangular `xHalfWidth` and `yHalfWidth` must be positive finite numbers; rectangular offsets and rotation must be finite numbers.
- Surface `edge_aperture` is optional and, when present, must be `{ shape: "circular"; radius: number; offsetX: number; offsetY: number }` with `radius > 0` or `{ shape: "rectangular"; xHalfWidth: number; yHalfWidth: number; rotation: number; offsetX: number; offsetY: number }`.

- **`additionalProperties: false`** is set on every schema object — any unknown key causes validation failure.
- Custom glass imports require string version `"1.0"`, a `Custom` object, `type: "tabulated"`, at least four wavelength/index pairs, exactly two positive finite numbers per pair, and no extra keys.

## Dependencies

- `ajv` — JSON Schema validator
- `shared/lib/types/opticalModel.ts` — `OpticalModel` (type-only, used as AJV generic parameter)

## Edge Cases / Error Handling

- Returns `false` and populates `.errors` for any structural mismatch, unknown property, or type error.
- Custom glass validation rejects numeric versions, malformed version strings, non-tabulated material types, fewer than four pairs, invalid pair lengths, non-positive or non-finite pair values, and unknown keys.
- Returns `false` if `object.medium` or `object.manufacturer` is missing, or if `object.medium` is reflective.
- `specs.field.isWideAngle` may be omitted, but if present it must be a boolean.
- Legacy aspherical payloads without `kind` are rejected.
- `XToroid` and `YToroid` payloads are rejected unless `toricSweepRadiusOfCurvature` is present and numeric.
- Aperture payloads reject missing offsets, non-finite or non-numeric offsets, unsupported shapes, non-positive edge radius values, non-positive rectangular half widths, non-finite rectangular rotation, and extra keys.
- Legacy circular aperture payloads without `offsetX` and `offsetY` are rejected.
- `additionalProperties: false` means evolved schemas (extra fields added by newer app versions) will fail validation against old validators; schema versioning should be considered if the format changes.
- The AJV instance and compiled validator are module singletons — compilation happens once at import time, not per call.

## Usages

```tsx
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";

function handleFileUpload(jsonData: unknown) {
  // Validate before using
  if (!validateImportedLensData(jsonData)) {
    // Show validation errors to user
    const errors = validateImportedLensData.errors;
    console.error("Invalid model:", errors);
    alert(`Import failed: ${errors?.map(e => e.message).join(", ")}`);
    return;
  }

  // jsonData is now type-checked as OpticalModel
  lensEditorStore.getState().setRows(surfacesToGridRows(jsonData));
  specsStore.getState().loadFromSpecs(jsonData.specs);
}

// Example: File input handler
async function handleImport(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  handleFileUpload(data);
}
```

Called when a user imports a lens JSON file before passing to Zustand store or Pyodide worker. Check return value and display `.errors` on failure.
*/
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
