import {
  nollToNm,
  fringeToNm,
  CLASSICAL_NAMES,
  classicalName,
  zernikeNotation,
  NUM_NOLL_TERMS,
  NUM_FRINGE_TERMS,
} from "../zernikeData";

describe("nollToNm", () => {
  it("returns (0, 0) for j=1 (Piston)", () => {
    expect(nollToNm(1)).toEqual([0, 0]);
  });

  it("returns (1, 1) for j=2 (Tilt X)", () => {
    expect(nollToNm(2)).toEqual([1, 1]);
  });

  it("returns (1, -1) for j=3 (Tilt Y)", () => {
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

describe("CLASSICAL_NAMES and classicalName", () => {
  it("has entries for all 56 Noll (n,m) pairs", () => {
    for (let j = 1; j <= NUM_NOLL_TERMS; j++) {
      const [n, m] = nollToNm(j);
      expect(CLASSICAL_NAMES[`${n},${m}`]).toBeDefined();
      expect(typeof CLASSICAL_NAMES[`${n},${m}`]).toBe("string");
      expect(CLASSICAL_NAMES[`${n},${m}`].length).toBeGreaterThan(0);
    }
  });

  it("classicalName(0, 0) returns Piston", () => {
    expect(classicalName(0, 0)).toBe("Piston");
  });

  it("classicalName(2, 0) returns Defocus", () => {
    expect(classicalName(2, 0)).toBe("Defocus");
  });

  it("classicalName(3, -1) returns Vertical Coma", () => {
    expect(classicalName(3, -1)).toBe("Vertical Coma");
  });

  it("classicalName(3, 1) returns Horizontal Coma", () => {
    expect(classicalName(3, 1)).toBe("Horizontal Coma");
  });

  it("classicalName(1, 1) returns Tilt X (m>0, cos term)", () => {
    expect(classicalName(1, 1)).toBe("Tilt X");
  });

  it("classicalName(1, -1) returns Tilt Y (m<0, sin term)", () => {
    expect(classicalName(1, -1)).toBe("Tilt Y");
  });

  it("classicalName(2, 2) returns Vertical Astigmatism", () => {
    expect(classicalName(2, 2)).toBe("Vertical Astigmatism");
  });

  it("classicalName(5, 1) returns Secondary Coma X (m>0, cos term)", () => {
    expect(classicalName(5, 1)).toBe("Secondary Coma X");
  });

  it("classicalName(5, -1) returns Secondary Coma Y (m<0, sin term)", () => {
    expect(classicalName(5, -1)).toBe("Secondary Coma Y");
  });

  it("classicalName(8, 0) returns Tertiary Spherical", () => {
    expect(classicalName(8, 0)).toBe("Tertiary Spherical");
  });

  it("classicalName(10, 0) returns Quaternary Spherical", () => {
    expect(classicalName(10, 0)).toBe("Quaternary Spherical");
  });

  it("classicalName returns empty string for unknown (n,m)", () => {
    expect(classicalName(99, 1)).toBe("");
  });
});

describe("fringeToNm", () => {
  it("returns [0, 0] for j=1 (Piston)", () => {
    expect(fringeToNm(1)).toEqual([0, 0]);
  });

  it("returns [1, 1] for j=2", () => {
    expect(fringeToNm(2)).toEqual([1, 1]);
  });

  it("returns [1, -1] for j=3", () => {
    expect(fringeToNm(3)).toEqual([1, -1]);
  });

  it("returns [2, 0] for j=4", () => {
    expect(fringeToNm(4)).toEqual([2, 0]);
  });

  it("returns [2, 2] for j=5 (differs from Noll j=5 which is [2,-2])", () => {
    expect(fringeToNm(5)).toEqual([2, 2]);
  });

  it("returns [4, 0] for j=9 (differs from Noll j=9 which is [3,-3])", () => {
    expect(fringeToNm(9)).toEqual([4, 0]);
  });
});

describe("NUM_FRINGE_TERMS", () => {
  it("equals 37", () => {
    expect(NUM_FRINGE_TERMS).toBe(37);
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
