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
preamble whenever `field.isWideAngle === true` selects `ExactOpticalModel`;
native RayOptics exports omit the block. Opted-in Object Height and Image
Height scripts select `ExactObjectHeightFieldSpec` and
`ExactImageHeightFieldSpec`, respectively. Worker scripts import the same
classes and `set_vig_respecting_exact_pupil` from the wheel instead of inlining
them. Exact scripts inject that helper into the Ronchi-envelope wrapper so a
passing Object-NA unit boundary receives zero vignetting without an outward
probe, while physically clipped boundaries use inward bisection. Consequently,
standalone and worker exact models share the same strict residual checks,
unit-pupil vignetting, OPD-compatible chief-ray cache normalization, and the
internal preparation capability that resolves deliberately uncached analysis
field copies through their exact height specification before generic
wide-angle pupil setup.
