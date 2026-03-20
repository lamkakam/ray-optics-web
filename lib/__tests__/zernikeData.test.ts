import {
  nollToNm,
  NOLL_CLASSICAL_NAMES,
  zernikeNotation,
  NUM_NOLL_TERMS,
} from "../zernikeData";
import type { ZernikeData } from "../zernikeData";

describe("nollToNm", () => {
  it("returns (0, 0) for j=1 (Piston)", () => {
    expect(nollToNm(1)).toEqual([0, 0]);
  });

  it("returns (1, 1) for j=2 (Tilt Y)", () => {
    expect(nollToNm(2)).toEqual([1, 1]);
  });

  it("returns (1, -1) for j=3 (Tilt X)", () => {
    expect(nollToNm(3)).toEqual([1, -1]);
  });

  it("returns (2, 0) for j=4 (Defocus)", () => {
    expect(nollToNm(4)).toEqual([2, 0]);
  });

  it("returns (2, -2) for j=5 (Oblique Astigmatism)", () => {
    expect(nollToNm(5)).toEqual([2, -2]);
  });

  it("returns (2, 2) for j=6 (Astigmatism)", () => {
    expect(nollToNm(6)).toEqual([2, 2]);
  });

  it("returns (3, -1) for j=7 (Vertical Coma)", () => {
    expect(nollToNm(7)).toEqual([3, -1]);
  });

  it("returns (3, 1) for j=8 (Horizontal Coma)", () => {
    expect(nollToNm(8)).toEqual([3, 1]);
  });

  it("returns (3, -3) for j=9 (Vertical Trefoil)", () => {
    expect(nollToNm(9)).toEqual([3, -3]);
  });

  it("returns (3, 3) for j=10 (Oblique Trefoil)", () => {
    expect(nollToNm(10)).toEqual([3, 3]);
  });

  it("returns (10, 0) for j=56 (highest term)", () => {
    expect(nollToNm(56)).toEqual([10, 0]);
  });
});

describe("NOLL_CLASSICAL_NAMES", () => {
  it("has entries for j=1 through j=56", () => {
    for (let j = 1; j <= NUM_NOLL_TERMS; j++) {
      expect(NOLL_CLASSICAL_NAMES[j]).toBeDefined();
      expect(typeof NOLL_CLASSICAL_NAMES[j]).toBe("string");
      expect(NOLL_CLASSICAL_NAMES[j].length).toBeGreaterThan(0);
    }
  });

  it("maps j=1 to Piston", () => {
    expect(NOLL_CLASSICAL_NAMES[1]).toBe("Piston");
  });

  it("maps j=4 to Defocus", () => {
    expect(NOLL_CLASSICAL_NAMES[4]).toBe("Defocus");
  });

  it("maps j=7 to Vertical Coma", () => {
    expect(NOLL_CLASSICAL_NAMES[7]).toBe("Vertical Coma");
  });

  it("maps j=8 to Horizontal Coma", () => {
    expect(NOLL_CLASSICAL_NAMES[8]).toBe("Horizontal Coma");
  });
});

describe("zernikeNotation", () => {
  it("produces correct LaTeX for n=0, m=0", () => {
    expect(zernikeNotation(0, 0)).toBe("\\(Z_{0}^{0}\\)");
  });

  it("produces correct LaTeX for n=3, m=-1", () => {
    expect(zernikeNotation(3, -1)).toBe("\\(Z_{3}^{-1}\\)");
  });

  it("produces correct LaTeX for n=10, m=0", () => {
    expect(zernikeNotation(10, 0)).toBe("\\(Z_{10}^{0}\\)");
  });
});

describe("NUM_NOLL_TERMS", () => {
  it("equals 56", () => {
    expect(NUM_NOLL_TERMS).toBe(56);
  });
});

describe("ZernikeData type", () => {
  it("can be constructed with all required fields", () => {
    const data: ZernikeData = {
      coefficients: [0.1, 0.2],
      rms_normalized_coefficients: [0.05, 0.1],
      rms_wfe: 0.15,
      pv_wfe: 0.5,
      strehl_ratio: 0.95,
      num_terms: 2,
      field_index: 0,
      wavelength_nm: 587.0,
    };
    expect(data.coefficients).toHaveLength(2);
    expect(data.strehl_ratio).toBe(0.95);
  });
});
