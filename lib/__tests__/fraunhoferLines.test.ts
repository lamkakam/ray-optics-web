import {
  FRAUNHOFER_LINES,
  lookupWavelength,
} from "@/lib/fraunhoferLines";

describe("FRAUNHOFER_LINES", () => {
  it("contains known Fraunhofer lines", () => {
    const symbols = FRAUNHOFER_LINES.map((l) => l.symbol);
    expect(symbols).toContain("r");
    expect(symbols).toContain("C");
    expect(symbols).toContain("d");
    expect(symbols).toContain("e");
    expect(symbols).toContain("F");
    expect(symbols).toContain("g");
  });

  it("is sorted from longest to shortest wavelength", () => {
    for (let i = 1; i < FRAUNHOFER_LINES.length; i++) {
      expect(FRAUNHOFER_LINES[i - 1].wavelength).toBeGreaterThan(
        FRAUNHOFER_LINES[i].wavelength
      );
    }
  });

  it("has all positive wavelengths", () => {
    for (const line of FRAUNHOFER_LINES) {
      expect(line.wavelength).toBeGreaterThan(0);
    }
  });
});

describe("lookupWavelength", () => {
  it("returns correct wavelength for known symbols", () => {
    expect(lookupWavelength("d")).toBe(587.562);
    expect(lookupWavelength("e")).toBe(546.073);
    expect(lookupWavelength("F")).toBe(486.133);
    expect(lookupWavelength("C")).toBe(656.273);
  });

  it("is case-sensitive", () => {
    expect(lookupWavelength("c")).toBeUndefined();
    expect(lookupWavelength("C")).toBe(656.273);
    expect(lookupWavelength("f")).toBeUndefined();
    expect(lookupWavelength("F")).toBe(486.133);
  });

  it("returns undefined for unknown symbols", () => {
    expect(lookupWavelength("Z")).toBeUndefined();
    expect(lookupWavelength("")).toBeUndefined();
  });
});
