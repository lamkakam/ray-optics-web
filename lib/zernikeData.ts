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

export const NUM_NOLL_TERMS = 56;

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
 * Returns MathJax-compatible LaTeX notation for a Zernike polynomial.
 */
export function zernikeNotation(n: number, m: number): string {
  return `\\(Z_{${n}}^{${m}}\\)`;
}

/**
 * Classical names for Noll-ordered Zernike terms j=1..56.
 */
export const NOLL_CLASSICAL_NAMES: Record<number, string> = {
  1: "Piston",
  2: "Tilt Y",
  3: "Tilt X",
  4: "Defocus",
  5: "Oblique Astigmatism",
  6: "Astigmatism",
  7: "Vertical Coma",
  8: "Horizontal Coma",
  9: "Vertical Trefoil",
  10: "Oblique Trefoil",
  11: "Primary Spherical",
  12: "Vertical Secondary Astigmatism",
  13: "Oblique Secondary Astigmatism",
  14: "Vertical Quadrafoil",
  15: "Oblique Quadrafoil",
  16: "Secondary Coma Y",
  17: "Secondary Coma X",
  18: "Secondary Trefoil Y",
  19: "Secondary Trefoil X",
  20: "Pentafoil Y",
  21: "Pentafoil X",
  22: "Secondary Spherical",
  23: "Tertiary Astigmatism Y",
  24: "Tertiary Astigmatism X",
  25: "Secondary Quadrafoil Y",
  26: "Secondary Quadrafoil X",
  27: "Secondary Pentafoil Y",
  28: "Secondary Pentafoil X",
  29: "Hexafoil Y",
  30: "Hexafoil X",
  31: "Tertiary Coma Y",
  32: "Tertiary Coma X",
  33: "Tertiary Trefoil Y",
  34: "Tertiary Trefoil X",
  35: "Tertiary Quadrafoil Y",
  36: "Tertiary Quadrafoil X",
  37: "Tertiary Pentafoil Y",
  38: "Tertiary Pentafoil X",
  39: "Secondary Hexafoil Y",
  40: "Secondary Hexafoil X",
  41: "Heptafoil Y",
  42: "Heptafoil X",
  43: "Tertiary Spherical",
  44: "Quaternary Astigmatism Y",
  45: "Quaternary Astigmatism X",
  46: "Quaternary Trefoil Y",
  47: "Quaternary Trefoil X",
  48: "Quaternary Quadrafoil Y",
  49: "Quaternary Quadrafoil X",
  50: "Quaternary Pentafoil Y",
  51: "Quaternary Pentafoil X",
  52: "Tertiary Hexafoil Y",
  53: "Tertiary Hexafoil X",
  54: "Secondary Heptafoil Y",
  55: "Secondary Heptafoil X",
  56: "Octafoil Y",
};
