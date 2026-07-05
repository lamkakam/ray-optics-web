# `shared/lib/lens-prescription-grid/lib/glassValidation.ts`

## Purpose

Shared client-side validation for prescription media before worker-backed lens update or optimization operations use an `OpticalModel`.

## Exports

- `getMissingPrescriptionGlasses(surfaces, lookupMaps)` returns a deduplicated list of display labels for glasses that are present in an `OpticalModel`/`Surfaces` prescription but absent from the loaded `GlassLookupMaps`.
- `formatMissingGlassMessage(missingGlasses)` returns the standard user-facing validation message, or `undefined` when there are no missing glasses.

## Behavior

- Validates the object medium and each sequential surface medium. The image row is not validated because it has no medium.
- Allows validation to pass when `lookupMaps` is `undefined`, avoiding false blocking during catalog preload and isolated test states.
- Allows `air` and `REFL` without lookup entries.
- For rows with a manufacturer, checks `mediumMap` using the normalized `manufacturer:medium` key.
- For rows without a manufacturer, first checks the plain normalized medium key for special media, then checks `custom:medium` for user-defined glasses.
- Missing labels are deduplicated in prescription order.
- Missing rows with a manufacturer display as `<Manufacturer>: <Glass>`.
- Missing rows without a manufacturer display as `Custom: <Glass>`.

## Message

The default formatted message is:

`Unknown glass in prescription: <missing glasses>. Select a glass that exists in the loaded glass catalog or add it as a custom glass.`
