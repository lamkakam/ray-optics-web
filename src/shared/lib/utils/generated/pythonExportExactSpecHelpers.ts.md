# `shared/lib/utils/generated/pythonExportExactSpecHelpers.ts`

## Purpose

Generated TypeScript string containing the exact real-ray optical-specification
implementation for standalone Python notebook exports.

## Contract

```ts
export const pythonExportExactSpecHelpers: string;
```

The value must exactly match
`src/python/src/rayoptics_web_utils/optical_specs.py`, including its trailing
newline. `scripts/generate-python-export-helpers.mjs` owns the generated source;
do not edit it directly.

## Consumers

`shared/lib/utils/pythonScript.ts` places this source in the standalone export
preamble only when a compatible `field.isWideAngle === true` selects
`ExactOpticalModel`; native RayOptics exports omit the block. Worker scripts
import the same classes from the wheel instead of inlining them. Consequently,
standalone and worker exact models share the same OPD-compatible chief-ray
cache normalization for infinite-conjugate fields.
