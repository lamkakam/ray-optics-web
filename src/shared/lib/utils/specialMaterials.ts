/**
# `shared/lib/utils/specialMaterials.ts`

## Purpose

Defines the special optical media shared by TypeScript consumers.

## Exports

- `builtInSpecialMaterial`: read-only set containing `air` and `REFL`, which RayOptics handles directly.
- `nonBuiltInSpecialMaterial`: read-only map from provider-backed special glass names to the Python variables created by `rayoptics-web-utils` (`CaF2`, `Fused Silica`, `Water`, and `D263TECO`).

The collections are used by the Python script generator and the medium selector so their definitions remain consistent.
*/
export const builtInSpecialMaterial: ReadonlySet<string> = new Set([
  "air",
  "REFL",
]);

// The values refer to Python variables defined by rayoptics-web-utils.
export const nonBuiltInSpecialMaterial: ReadonlyMap<string, string> = new Map([
  ["CaF2", "caf2"],
  ["Fused Silica", "fused_silica"],
  ["Water", "water"],
  ["D263TECO", "d263teco"],
]);
