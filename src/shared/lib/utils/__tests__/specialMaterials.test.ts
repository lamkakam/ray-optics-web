/** Exact mapping contract for media names shared with generated worker code. */
import {
  builtInSpecialMaterial,
  nonBuiltInSpecialMaterial,
} from "@/shared/lib/utils/specialMaterials";

describe("special materials", () => {
  it("contains exactly the built-in media", () => {
    expect([...builtInSpecialMaterial]).toEqual(["air", "REFL"]);
    expect(builtInSpecialMaterial.has("Air")).toBe(false);
    expect(builtInSpecialMaterial.has("N-BK7")).toBe(false);
  });

  it("maps every non-built-in special medium to its worker variable", () => {
    expect([...nonBuiltInSpecialMaterial.entries()]).toEqual([
      ["CaF2", "caf2"],
      ["Fused Silica", "fused_silica"],
      ["Water", "water"],
      ["D263TECO", "d263teco"],
    ]);
    expect(nonBuiltInSpecialMaterial.get("water")).toBeUndefined();
  });
});
