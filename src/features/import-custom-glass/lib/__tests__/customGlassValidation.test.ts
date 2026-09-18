import {
  MIN_CUSTOM_GLASS_PAIRS,
  duplicateCustomGlassWavelengths,
  validateCustomGlassInput,
  validateCustomGlassPairs,
} from "@/features/import-custom-glass/lib/customGlassValidation";

const fourPairs = [
  [486.13, 1.5224],
  [546.07, 1.5187],
  [587.56, 1.5168],
  [656.27, 1.5143],
] as const;

describe("custom-glass validation", () => {
  it("defines four pairs as the single frontend minimum", () => {
    expect(MIN_CUSTOM_GLASS_PAIRS).toBe(4);
    expect(validateCustomGlassPairs(fourPairs.slice(0, 3))).toBe(false);
    expect(validateCustomGlassPairs(fourPairs)).toBe(true);
  });

  it.each([
    [[...fourPairs.slice(0, 3), [0, 1.5]]],
    [[...fourPairs.slice(0, 3), [700, Number.POSITIVE_INFINITY]]],
    [[...fourPairs.slice(0, 3), [Number.NaN, 1.5]]],
    [[...fourPairs.slice(0, 3), [486.13, 1.6]]],
  ])("rejects invalid or duplicate wavelength/index pairs", (pairs) => {
    expect(validateCustomGlassPairs(pairs)).toBe(false);
  });

  it("reports every duplicated wavelength centrally", () => {
    expect(
      duplicateCustomGlassWavelengths([
        ...fourPairs,
        [486.13, 1.6],
        [546.07, 1.7],
      ]),
    ).toEqual(new Set([486.13, 546.07]));
  });

  it("validates named inputs strictly and rejects blank labels or unknown keys", () => {
    expect(validateCustomGlassInput({ name: "CUSTOM", pairs: fourPairs })).toBe(
      true,
    );
    expect(validateCustomGlassInput({ name: "   ", pairs: fourPairs })).toBe(
      false,
    );
    expect(
      validateCustomGlassInput({
        name: "CUSTOM",
        pairs: fourPairs,
        extra: true,
      }),
    ).toBe(false);
  });
});
