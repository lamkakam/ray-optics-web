# `shared/lib/utils/specialMaterials.ts`

## Purpose

Defines the special optical media shared by TypeScript consumers.

## Exports

- `builtInSpecialMaterial`: read-only set containing `air` and `REFL`, which RayOptics handles directly.
- `nonBuiltInSpecialMaterial`: read-only map from provider-backed special glass names to the Python variables created by `rayoptics-web-utils` (`CaF2`, `Fused Silica`, and `Water`).

The collections are used by the Python script generator and the medium selector so their definitions remain consistent.
