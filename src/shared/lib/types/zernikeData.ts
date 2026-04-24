// test
export interface ZernikeData {
  readonly coefficients: readonly number[];
  readonly rms_normalized_coefficients: readonly number[];
  readonly rms_wfe: number;
  readonly pv_wfe: number;
  readonly strehl_ratio: number;
  readonly num_terms: number;
  readonly field_index: number;
  readonly wavelength_nm: number;
}

export type ZernikeOrdering = "noll" | "fringe";

export const NUM_NOLL_TERMS = 56;

export const NUM_FRINGE_TERMS = 37;

/**
 * Convert Noll index j (1-based) to radial order n and azimuthal frequency m.
 * Port of the Python noll_to_nm function.
 */
export function nollToNm(j: number): [number, number] {
  let n = Math.ceil((-3 + Math.sqrt(9 + 8 * (j - 1))) / 2);
  if ((n * (n + 1)) / 2 >= j) {
    n -= 1;
  }
  const mResidual = j - (n * (n + 1)) / 2 - 1;
  const mStart = n % 2 === 0 ? 0 : 1;
  const mAbsList: number[] = [];
  for (let mv = mStart; mv <= n; mv += 2) {
    if (mv === 0) {
      mAbsList.push(0);
    } else {
      mAbsList.push(mv);
      mAbsList.push(mv);
    }
  }
  const mAbs = mAbsList[mResidual];
  if (mAbs === 0) {
    return [n, 0];
  }
  return j % 2 === 0 ? [n, mAbs] : [n, -mAbs];
}

/**
 * Convert Fringe (University of Arizona) index j (1-based) to (n, m).
 * Port of the Python fringe_to_nm function.
 *
 * Groups by c = (n + |m|) / 2. Group c has 2c+1 terms; cumulative
 * count through group c is (c+1)². Within each group, |m| descending,
 * cos (+m) before sin (−m), m=0 last.
 */
export function fringeToNm(j: number): [number, number] {
  let c = 0;
  while ((c + 1) ** 2 < j) c++;
  const pos = j - c * c; // 1-based position within group c
  if (pos === 2 * c + 1) return [2 * c, 0];
  const pairIdx = Math.floor((pos - 1) / 2);
  const mAbs = c - pairIdx;
  const n = 2 * c - mAbs;
  const sign = (pos - 1) % 2 === 0 ? 1 : -1;
  return [n, sign * mAbs];
}

/**
 * Returns MathJax-compatible LaTeX notation for a Zernike polynomial.
 */
export function zernikeNotation(n: number, m: number): string {
  return `\\(Z_{${n}}^{${m}}\\)`;
}

/**
 * Classical names for Zernike terms keyed by "(n,m)" string.
 * Covers all 56 Noll-ordered terms (n=0..10).
 * Naming convention: m>0 (cos term) → "X" suffix; m<0 (sin term) → "Y" suffix; m=0 → no suffix.
 */
export const CLASSICAL_NAMES: Record<string, string> = {
  "0,0": "Piston",
  "1,1": "Tilt X",
  "1,-1": "Tilt Y",
  "2,0": "Defocus",
  "2,-2": "Oblique Astigmatism",
  "2,2": "Vertical Astigmatism",
  "3,-1": "Vertical Coma",
  "3,1": "Horizontal Coma",
  "3,-3": "Vertical Trefoil",
  "3,3": "Oblique Trefoil",
  "4,0": "Primary Spherical",
  "4,2": "Vertical Secondary Astigmatism",
  "4,-2": "Oblique Secondary Astigmatism",
  "4,4": "Vertical Quadrafoil",
  "4,-4": "Oblique Quadrafoil",
  "5,1": "Secondary Coma X",
  "5,-1": "Secondary Coma Y",
  "5,3": "Secondary Trefoil X",
  "5,-3": "Secondary Trefoil Y",
  "5,5": "Pentafoil X",
  "5,-5": "Pentafoil Y",
  "6,0": "Secondary Spherical",
  "6,-2": "Tertiary Astigmatism Y",
  "6,2": "Tertiary Astigmatism X",
  "6,-4": "Secondary Quadrafoil Y",
  "6,4": "Secondary Quadrafoil X",
  "6,-6": "Hexafoil Y",
  "6,6": "Hexafoil X",
  "7,-1": "Tertiary Coma Y",
  "7,1": "Tertiary Coma X",
  "7,-3": "Tertiary Trefoil Y",
  "7,3": "Tertiary Trefoil X",
  "7,-5": "Secondary Pentafoil Y",
  "7,5": "Secondary Pentafoil X",
  "7,-7": "Heptafoil Y",
  "7,7": "Heptafoil X",
  "8,0": "Tertiary Spherical",
  "8,2": "Quaternary Astigmatism X",
  "8,-2": "Quaternary Astigmatism Y",
  "8,4": "Tertiary Quadrafoil X",
  "8,-4": "Tertiary Quadrafoil Y",
  "8,6": "Secondary Hexafoil X",
  "8,-6": "Secondary Hexafoil Y",
  "8,8": "Octafoil X",
  "8,-8": "Octafoil Y",
  "9,1": "Quaternary Coma X",
  "9,-1": "Quaternary Coma Y",
  "9,3": "Quaternary Trefoil X",
  "9,-3": "Quaternary Trefoil Y",
  "9,5": "Tertiary Pentafoil X",
  "9,-5": "Tertiary Pentafoil Y",
  "9,7": "Secondary Heptafoil X",
  "9,-7": "Secondary Heptafoil Y",
  "9,9": "Nonafoil X",
  "9,-9": "Nonafoil Y",
  "10,0": "Quaternary Spherical",
};

/**
 * Returns the classical name for a Zernike polynomial by (n, m).
 * Returns empty string if no classical name is defined.
 */
export function classicalName(n: number, m: number): string {
  return CLASSICAL_NAMES[`${n},${m}`] ?? "";
}
