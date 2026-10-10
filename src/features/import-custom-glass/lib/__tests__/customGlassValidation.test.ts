import {
  MIN_CUSTOM_GLASS_PAIRS,
  duplicateCustomGlassWavelengths,
  validateCustomGlassInput,
  validateCustomGlassPairs,
  validateImportedCustomGlassData,
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

describe("validateImportedCustomGlassData", () => {
  const validPayload = {
    version: "1.0",
    Custom: {
      CUSTOM_A: {
        type: "tabulated",
        data: [
          [486.13, 1.5224],
          [546.07, 1.5187],
          [587.56, 1.5168],
          [656.27, 1.5143],
        ],
      },
    },
  };

  it("accepts version 1.0 tabulated custom glass data", () => {
    expect(validateImportedCustomGlassData(validPayload)).toBe(true);
  });

  it.each(["version", "Custom"])(
    "requires the custom-glass field %s",
    (field) => {
      const payload = { ...validPayload } as Record<string, unknown>;
      delete payload[field];

      expect(validateImportedCustomGlassData(payload)).toBe(false);
    },
  );

  it.each(["type", "data"])(
    "requires each custom material field %s",
    (field) => {
      const material = { ...validPayload.Custom.CUSTOM_A } as Record<
        string,
        unknown
      >;
      delete material[field];

      expect(
        validateImportedCustomGlassData({
          ...validPayload,
          Custom: { CUSTOM_A: material },
        }),
      ).toBe(false);
    },
  );

  it("rejects unknown properties at the envelope and material levels", () => {
    expect(
      validateImportedCustomGlassData({ ...validPayload, extra: true }),
    ).toBe(false);
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, extra: true } },
      }),
    ).toBe(false);
  });

  it("rejects blank labels and duplicate wavelengths", () => {
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: { "   ": validPayload.Custom.CUSTOM_A },
      }),
    ).toBe(false);
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: {
          CUSTOM_A: {
            ...validPayload.Custom.CUSTOM_A,
            data: [
              [486.13, 1.5224],
              [546.07, 1.5187],
              [587.56, 1.5168],
              [486.13, 1.5143],
            ],
          },
        },
      }),
    ).toBe(false);
  });

  it.each([
    [
      [
        [486.13, 1.5224],
        [546.07, 1.5187],
        [587.56, 1.5168],
      ],
    ],
    [
      [
        [486.13, 1.5224],
        [546.07, 1.5187],
        [587.56, 1.5168],
        [656.27, 0],
      ],
    ],
    [
      [
        [486.13, 1.5224],
        [546.07, Number.NaN],
        [587.56, 1.5168],
        [656.27, 1.5143],
      ],
    ],
  ])("rejects custom glass data outside positive finite boundaries", (data) => {
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, data } },
      }),
    ).toBe(false);
  });

  it.each([
    { ...validPayload, version: 1 },
    { ...validPayload, version: "1" },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, type: "sellmeier" },
      },
    },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, data: [[587.56, 1.5168]] },
      },
    },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: {
          ...validPayload.Custom.CUSTOM_A,
          data: [
            [587.56, 1.5168],
            [546.07, 1.5187],
            [486.13, -1],
            [656.27, 1.5143],
          ],
        },
      },
    },
    {
      ...validPayload,
      Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, extra: true } },
    },
  ])("rejects invalid custom glass payload %#", (payload) => {
    expect(validateImportedCustomGlassData(payload)).toBe(false);
  });
});
