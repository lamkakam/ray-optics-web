# `lib/apertureFlag.ts`

## Purpose

Defines the type controlling whether RayOptics computes apertures automatically or uses the values set by the user.

## Exports

`type SetAutoApertureFlag`

| Value | Meaning |
|---|---|
| `"autoAperture"` | Signify that RayOptics should recomputes semi-diameters |
| `"manualAperture"` | Signify that semi-diameters are set by the user |

## Usages

```ts
import type { SetAutoApertureFlag } from "@/lib/apertureFlag";
import type { OpticalModel } from "@/lib/opticalModel";

// Create model with auto-computed apertures
const model: OpticalModel = {
  specs: { /* ... */ },
  surfaces: [ /* ... */ ],
  setAutoAperture: "autoAperture", // RayOptics will recompute semi-diameters
};

// Toggle aperture mode in UI
const handleToggleAutoAperture = (enabled: boolean) => {
  const newFlag: SetAutoApertureFlag = enabled ? "autoAperture" : "manualAperture";
  lensEditorStore.getState().setAutoAperture(newFlag);
};
```