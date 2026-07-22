/**
# `shared/lib/utils/specialMaterials.ts`

## Purpose

Defines the special optical media shared by TypeScript consumers.*/
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
